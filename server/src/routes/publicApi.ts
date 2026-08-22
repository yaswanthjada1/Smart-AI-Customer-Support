import { Router, Request, Response } from 'express';
import { publicChatRateLimiter } from '../middleware/rateLimit';
import { RAGService } from '../modules/rag/ragService';
import { ConversationService } from '../modules/conversations/conversationService';
import { ChatbotService } from '../modules/chatbot/chatbotService';
import { AnalyticsService } from '../modules/analytics/analyticsService';
import { CompanyService } from '../modules/companies/companyService';
import { ApiKeyService } from '../modules/apiKeys/apiKeyService';
import { z } from 'zod';

const router = Router();

const publicChatSchema = z.object({
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  sessionId: z.string().min(1).max(128).optional(),
  session_id: z.string().min(1).max(128).optional(),
  companyId: z.string().uuid('Invalid company ID').optional(),
  company_id: z.string().uuid('Invalid company ID').optional(),
  widgetToken: z.string().optional(),
  customer_identifier: z.string().max(255).optional(),
});

async function handleWidgetConfig(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.params.companyId as string;
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ error: 'Company workspace not found' });
      return;
    }

    const config = await ChatbotService.getConfig(companyId);
    const botName = config.bot_name || `${company.name} Assistant`;
    const welcomeMessage = config.welcome_message || `Hello! Welcome to ${company.name} support. How can I help you today?`;
    const brandColor = config.primary_color || '#4f46e5';
    const logoUrl = config.logo_url || company.logo_url || null;
    const widgetToken = ApiKeyService.generateWidgetToken(company.id);

    res.json({
      companyId: company.id,
      botName,
      welcomeMessage,
      brandColor,
      logoUrl,
      enabled: true,
      widgetToken,
      // Backward compatibility aliases
      company_name: company.name,
      bot_name: botName,
      welcome_message: welcomeMessage,
      primary_color: brandColor,
      logo_url: logoUrl,
    });
  } catch (err: any) {
    console.error('[Public Config Error]', err.message);
    res.status(500).json({ error: "Sorry, I couldn't process your request right now." });
  }
}

// 1. Public Widget Configuration Endpoints
router.get('/widget-config/:companyId', handleWidgetConfig);
router.get('/config/:companyId', handleWidgetConfig);
router.get('/companies/:companyId/config', handleWidgetConfig);

// 2. Unified Public Chat Endpoint (Supports API Key and Embed Widget)
router.post('/chat', publicChatRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = publicChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const { message, sessionId, session_id, widgetToken, customer_identifier } = parseResult.data;
    const authHeader = req.headers.authorization;
    let resolvedCompanyId: string | null = null;

    // Authentication Strategy 1: Developer API Key (Authorization: Bearer ar_live_...)
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split('Bearer ')[1].trim();

      if (token.startsWith('ar_live_') || token.startsWith('sk_live_')) {
        const apiKeyAuth = await ApiKeyService.validateApiKey(token);
        if (!apiKeyAuth) {
          res.status(401).json({ error: 'Unauthorized: Invalid or revoked API key.' });
          return;
        }
        resolvedCompanyId = apiKeyAuth.company.id;
      } else if (token.startsWith('wgt_')) {
        // Authentication Strategy 2: Widget Signed Session Token in Bearer
        const widgetAuth = ApiKeyService.validateWidgetToken(token);
        if (!widgetAuth) {
          res.status(401).json({ error: 'Unauthorized: Expired or invalid widget session.' });
          return;
        }
        resolvedCompanyId = widgetAuth.companyId;
      }
    }

    // Authentication Strategy 3: Widget Token in headers or body
    if (!resolvedCompanyId) {
      const headerWidgetToken = (req.headers['x-widget-token'] as string) || widgetToken;
      if (headerWidgetToken) {
        const widgetAuth = ApiKeyService.validateWidgetToken(headerWidgetToken);
        if (widgetAuth) {
          resolvedCompanyId = widgetAuth.companyId;
        }
      }
    }

    // Authentication Strategy 4: Public companyId provided in body (for direct widget integration)
    if (!resolvedCompanyId) {
      const directCompanyId = parseResult.data.companyId || parseResult.data.company_id;
      if (directCompanyId) {
        const company = await CompanyService.getCompanyById(directCompanyId);
        if (!company) {
          res.status(404).json({ error: 'Company workspace not found.' });
          return;
        }
        resolvedCompanyId = company.id;
      }
    }

    // If no authentication or company identity found
    if (!resolvedCompanyId) {
      res.status(401).json({
        error: 'Authentication required. Provide an API key (Authorization: Bearer ar_live_...) or companyId.',
      });
      return;
    }

    const activeSessionId = sessionId || session_id || 'session_' + Math.random().toString(36).substring(2, 10);

    // 1. Get or create conversation session
    const session = await ConversationService.getOrCreateSession(
      resolvedCompanyId,
      activeSessionId,
      customer_identifier
    );

    // 2. Save customer message
    await ConversationService.addMessage(session.id, 'user', message.trim());

    // 3. Execute RAG pipeline (strictly scoped by company_id in PostgreSQL pgvector)
    const ragResult = await RAGService.answerCustomerQuery(resolvedCompanyId, message.trim(), false);

    // 4. Save AI response
    await ConversationService.addMessage(
      session.id,
      'assistant',
      ragResult.answer,
      ragResult.sources
    );

    // 5. Update escalation status if needed
    if (ragResult.escalation_required) {
      await ConversationService.setEscalationStatus(resolvedCompanyId, session.id, 'requested');
      await AnalyticsService.logEvent(resolvedCompanyId, 'escalation_triggered', { query: message }, session.id);
    } else {
      await AnalyticsService.logEvent(resolvedCompanyId, 'question_answered', { query: message, quality: ragResult.evidence_quality }, session.id);
    }

    // 6. Return sanitized public response (clean document & page numbers without internal IDs)
    const publicSources = (ragResult.sources || []).map((s) => ({
      document: s.document,
      page: s.page || 1,
    }));

    res.json({
      answer: ragResult.answer,
      sources: publicSources,
      sessionId: activeSessionId,
      evidence_quality: ragResult.evidence_quality,
      escalation_required: ragResult.escalation_required,
    });
  } catch (err: any) {
    console.error('[Public Chat Error]', err);
    res.status(500).json({ error: "Sorry, I couldn't process your request right now." });
  }
});

export default router;

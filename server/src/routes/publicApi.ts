import { Router, Request, Response } from 'express';
import { publicChatRateLimiter } from '../middleware/rateLimit';
import { RAGService } from '../modules/rag/ragService';
import { ConversationService } from '../modules/conversations/conversationService';
import { ChatbotService } from '../modules/chatbot/chatbotService';
import { AnalyticsService } from '../modules/analytics/analyticsService';
import { CompanyService } from '../modules/companies/companyService';
import { z } from 'zod';

const router = Router();

const publicChatSchema = z.object({
  companyId: z.string().uuid('Invalid company ID').optional(),
  company_id: z.string().uuid('Invalid company ID').optional(),
  sessionId: z.string().min(1).max(128).optional(),
  session_id: z.string().min(1).max(128).optional(),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  customer_identifier: z.string().max(255).optional(),
}).refine(data => data.companyId || data.company_id, {
  message: 'companyId or company_id is required',
  path: ['companyId'],
});

async function handleGetConfig(req: Request, res: Response): Promise<void> {
  try {
    const companyId = req.params.companyId as string;
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ error: 'Company workspace not found' });
      return;
    }

    const config = await ChatbotService.getConfig(companyId);
    res.json({
      company_name: company.name,
      bot_name: config.bot_name || `${company.name} Assistant`,
      welcome_message: config.welcome_message || `Hello! Welcome to ${company.name} support. How can I help you today?`,
      logo_url: config.logo_url || company.logo_url || null,
      primary_color: config.primary_color || '#4f46e5',
    });
  } catch (err: any) {
    console.error('[Public Config Error]', err.message);
    res.status(500).json({ error: 'Failed to load chatbot configuration.' });
  }
}

// 1. Get Public Chatbot Configuration (Support both route patterns)
router.get('/config/:companyId', handleGetConfig);
router.get('/companies/:companyId/config', handleGetConfig);

// 2. Public Customer Chat Endpoint (RAG retrieval + session logging)
router.post('/chat', publicChatRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = publicChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const companyId = (parseResult.data.companyId || parseResult.data.company_id)!;
    const sessionId = parseResult.data.sessionId || parseResult.data.session_id || 'session_' + Math.random().toString(36).substring(2, 10);
    const message = parseResult.data.message.trim();
    const customerIdentifier = parseResult.data.customer_identifier;

    // Verify company exists
    const company = await CompanyService.getCompanyById(companyId);
    if (!company) {
      res.status(404).json({ error: 'Company workspace not found.' });
      return;
    }

    // 1. Get or create session
    const session = await ConversationService.getOrCreateSession(
      companyId,
      sessionId,
      customerIdentifier
    );

    // 2. Save customer message
    await ConversationService.addMessage(session.id, 'user', message);

    // 3. Execute RAG pipeline
    const ragResult = await RAGService.answerCustomerQuery(companyId, message, false);

    // 4. Save AI response
    await ConversationService.addMessage(
      session.id,
      'assistant',
      ragResult.answer,
      ragResult.sources
    );

    // 5. Update escalation status if needed
    if (ragResult.escalation_required) {
      await ConversationService.setEscalationStatus(companyId, session.id, 'requested');
      await AnalyticsService.logEvent(companyId, 'escalation_triggered', { query: message }, session.id);
    } else {
      await AnalyticsService.logEvent(companyId, 'question_answered', { query: message, quality: ragResult.evidence_quality }, session.id);
    }

    res.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      evidence_quality: ragResult.evidence_quality,
      escalation_required: ragResult.escalation_required,
      sessionId,
      conversationId: session.id,
    });
  } catch (err: any) {
    console.error('[Public Chat Error]', err);
    res.status(500).json({ error: "Sorry, I couldn't process that request right now." });
  }
});

export default router;

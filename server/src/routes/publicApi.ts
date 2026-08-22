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
  company_id: z.string().uuid('Invalid company ID'),
  session_id: z.string().min(1).max(128),
  message: z.string().min(1, 'Message cannot be empty').max(2000, 'Message is too long'),
  customer_identifier: z.string().max(255).optional(),
});

// 1. Get Public Chatbot Configuration (Branding, Logo, Name, Welcome message)
router.get('/config/:companyId', async (req: Request, res: Response): Promise<void> => {
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
      bot_name: config.bot_name,
      welcome_message: config.welcome_message,
      logo_url: config.logo_url,
      primary_color: config.primary_color,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 2. Public Customer Chat Endpoint (RAG retrieval + session logging)
router.post('/chat', publicChatRateLimiter, async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = publicChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const { company_id, session_id, message, customer_identifier } = parseResult.data;

    // Verify company exists
    const company = await CompanyService.getCompanyById(company_id);
    if (!company) {
      res.status(404).json({ error: 'Company workspace not found' });
      return;
    }

    // 1. Get or create session
    const session = await ConversationService.getOrCreateSession(
      company_id,
      session_id,
      customer_identifier
    );

    // 2. Save customer message
    await ConversationService.addMessage(session.id, 'user', message);

    // 3. Execute RAG pipeline
    const ragResult = await RAGService.answerCustomerQuery(company_id, message, false);

    // 4. Save AI response
    await ConversationService.addMessage(
      session.id,
      'assistant',
      ragResult.answer,
      ragResult.sources
    );

    // 5. Update escalation status if needed
    if (ragResult.escalation_required) {
      await ConversationService.setEscalationStatus(company_id, session.id, 'requested');
      await AnalyticsService.logEvent(company_id, 'escalation_triggered', { query: message }, session.id);
    } else {
      await AnalyticsService.logEvent(company_id, 'question_answered', { query: message, quality: ragResult.evidence_quality }, session.id);
    }

    res.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      evidence_quality: ragResult.evidence_quality,
      escalation_required: ragResult.escalation_required,
    });
  } catch (err: any) {
    console.error('[Public Chat Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;

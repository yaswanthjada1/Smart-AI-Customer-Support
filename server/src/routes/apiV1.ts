import { Router, Request, Response } from 'express';
import { ApiKeyService } from '../modules/apiKeys/apiKeyService';
import { RAGService } from '../modules/rag/ragService';
import { ConversationService } from '../modules/conversations/conversationService';
import { AnalyticsService } from '../modules/analytics/analyticsService';
import { z } from 'zod';

const router = Router();

const v1ChatSchema = z.object({
  message: z.string().min(1, 'Message is required').max(2000),
  session_id: z.string().max(128).optional(),
  customer_identifier: z.string().max(255).optional(),
});

// Middleware: Authenticate via API Key
async function authenticateApiKey(req: Request, res: Response, next: Function) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or malformed Authorization header. Expected Bearer <api_key>.' });
    return;
  }

  const rawKey = authHeader.split('Bearer ')[1].trim();
  const valid = await ApiKeyService.validateApiKey(rawKey);

  if (!valid) {
    res.status(401).json({ error: 'Unauthorized: Invalid or revoked API key.' });
    return;
  }

  (req as any).company = valid.company;
  (req as any).keyId = valid.keyId;
  next();
}

router.use(authenticateApiKey);

// Business API Chat endpoint
router.post('/chat', async (req: Request, res: Response): Promise<void> => {
  try {
    const parseResult = v1ChatSchema.safeParse(req.body);
    if (!parseResult.success) {
      res.status(400).json({ error: 'Validation failed', details: parseResult.error.flatten() });
      return;
    }

    const company = (req as any).company;
    const { message, session_id, customer_identifier } = parseResult.data;
    const activeSessionId = session_id || `api-session-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;

    // 1. Session & message persistence
    const session = await ConversationService.getOrCreateSession(company.id, activeSessionId, customer_identifier);
    await ConversationService.addMessage(session.id, 'user', message);

    // 2. Execute RAG
    const ragResult = await RAGService.answerCustomerQuery(company.id, message, false);

    // 3. Save assistant message
    await ConversationService.addMessage(session.id, 'assistant', ragResult.answer, ragResult.sources);

    // 4. Log event
    if (ragResult.escalation_required) {
      await ConversationService.setEscalationStatus(company.id, session.id, 'requested');
      await AnalyticsService.logEvent(company.id, 'escalation_triggered', { query: message, source: 'api_v1' }, session.id);
    } else {
      await AnalyticsService.logEvent(company.id, 'question_answered', { query: message, quality: ragResult.evidence_quality, source: 'api_v1' }, session.id);
    }

    res.json({
      answer: ragResult.answer,
      sources: ragResult.sources,
      evidence_quality: ragResult.evidence_quality,
      escalation_required: ragResult.escalation_required,
      session_id: activeSessionId,
    });
  } catch (err: any) {
    console.error('[API V1 Chat Error]', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;

import { Router, Response } from 'express';
import multer from 'multer';
import { authenticateFirebaseUser, AuthenticatedRequest } from '../middleware/auth';
import { requireCompanyMembership, TenantRequest } from '../middleware/tenant';
import { CompanyController } from '../modules/companies/companyController';
import { CompanyService } from '../modules/companies/companyService';
import { DocumentService } from '../modules/documents/documentService';
import { ChatbotService } from '../modules/chatbot/chatbotService';
import { RAGService } from '../modules/rag/ragService';
import { ConversationService } from '../modules/conversations/conversationService';
import { ApiKeyService } from '../modules/apiKeys/apiKeyService';
import { AnalyticsService } from '../modules/analytics/analyticsService';

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25MB limit
});

const router = Router();

// All app routes require Firebase authentication
router.use(authenticateFirebaseUser);

// ==========================================
// 1. Current User Profile
// ==========================================
router.get('/me', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const companies = await CompanyService.getUserCompanies(req.user!.id);
    res.json({
      user: req.user,
      companies,
      onboardingRequired: companies.length === 0,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 2. Company & Workspace Management
// ==========================================
router.post('/companies', CompanyController.createCompany);
router.get('/companies', CompanyController.getUserCompanies);
router.get('/companies/:companyId', requireCompanyMembership('member'), CompanyController.getCompany);
router.get('/companies/:companyId/members', requireCompanyMembership('member'), CompanyController.getMembers);
router.patch('/companies/:companyId', requireCompanyMembership('admin'), CompanyController.updateCompany);

// ==========================================
// 3. Document Ingestion & Knowledge Base
// ==========================================
router.get('/companies/:companyId/documents', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docs = await DocumentService.getCompanyDocuments(req.company!.id);
    res.json({ documents: docs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post(
  '/companies/:companyId/documents',
  requireCompanyMembership('member'),
  upload.single('file'),
  async (req: TenantRequest, res: Response): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: 'No file uploaded. Please select a PDF, DOCX, TXT, or MD file.' });
        return;
      }

      const doc = await DocumentService.uploadAndProcessDocument(req.company!.id, {
        originalname: req.file.originalname,
        buffer: req.file.buffer,
        mimetype: req.file.mimetype,
        size: req.file.size,
      });

      res.status(201).json({ document: doc });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

router.get('/companies/:companyId/documents/:docId', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.docId as string;
    const result = await DocumentService.getDocumentWithChunks(req.company!.id, docId);
    if (!result) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/companies/:companyId/documents/:docId', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.docId as string;
    const deleted = await DocumentService.deleteDocument(req.company!.id, docId);
    if (!deleted) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json({ success: true, message: 'Document deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/companies/:companyId/documents/:docId/reindex', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const docId = req.params.docId as string;
    const doc = await DocumentService.reindexDocument(req.company!.id, docId);
    if (!doc) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }
    res.json({ document: doc, message: 'Reindexing initiated.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. Chatbot Config & Dashboard Live RAG Chat
// ==========================================
router.get('/companies/:companyId/chatbot/config', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const config = await ChatbotService.getConfig(req.company!.id);
    res.json({ config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/companies/:companyId/chatbot/config', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const updated = await ChatbotService.updateConfig(req.company!.id, req.body);
    res.json({ config: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Dashboard Live RAG Test Chat
router.post('/companies/:companyId/chatbot/test', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { question } = req.body;
    if (!question || typeof question !== 'string') {
      res.status(400).json({ error: 'Question is required' });
      return;
    }

    const result = await RAGService.answerCustomerQuery(req.company!.id, question, false);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 5. Conversations & Messages
// ==========================================
router.get('/companies/:companyId/conversations', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const convs = await ConversationService.getCompanyConversations(req.company!.id);
    res.json({ conversations: convs });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/companies/:companyId/conversations/:convId/messages', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const convId = req.params.convId as string;
    const result = await ConversationService.getConversationMessages(req.company!.id, convId);
    if (!result) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/companies/:companyId/conversations/:convId/escalation', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const convId = req.params.convId as string;
    const { status } = req.body;
    const updated = await ConversationService.setEscalationStatus(req.company!.id, convId, status);
    if (!updated) {
      res.status(404).json({ error: 'Conversation not found' });
      return;
    }
    res.json({ conversation: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 6. API Keys Management
// ==========================================
router.get('/companies/:companyId/api-keys', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const keys = await ApiKeyService.getCompanyApiKeys(req.company!.id);
    res.json({ api_keys: keys });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/companies/:companyId/api-keys', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const { name } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Key name is required' });
      return;
    }
    const result = await ApiKeyService.createApiKey(req.company!.id, name);
    res.status(201).json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/companies/:companyId/api-keys/:keyId', requireCompanyMembership('admin'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const keyId = req.params.keyId as string;
    const revoked = await ApiKeyService.revokeApiKey(req.company!.id, keyId);
    if (!revoked) {
      res.status(404).json({ error: 'API key not found or already revoked' });
      return;
    }
    res.json({ success: true, message: 'API key revoked successfully' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 7. Dashboard Overview Metrics
// ==========================================
router.get('/companies/:companyId/analytics', requireCompanyMembership('member'), async (req: TenantRequest, res: Response): Promise<void> => {
  try {
    const analytics = await AnalyticsService.getSummary(req.company!.id);
    res.json({ analytics });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;

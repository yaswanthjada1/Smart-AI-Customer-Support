import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import { getDb, closeDb, query } from '../db';
import { CompanyService } from '../modules/companies/companyService';
import { ChatbotService } from '../modules/chatbot/chatbotService';
import { DocumentService } from '../modules/documents/documentService';
import { loadAeroFitDemoDocuments } from '../modules/documents/demoDocs';
import { Server } from 'http';

describe('Public Widget & Embeddable Chatbot Integration Tests', () => {
  let server: Server;
  let baseUrl: string;
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    // 1. Initialize DB & migrations
    await getDb();

    // 2. Start HTTP server on dynamic port
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });

    // 3. Create User & Company A ("AeroFit Active")
    const userARes = await query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ('user-aerofit-uid', 'aerofit@demo.com', 'AeroFit Admin')
       ON CONFLICT (firebase_uid) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`
    );
    const userA = userARes.rows[0];

    const { company: companyA } = await CompanyService.createCompany(userA.id, {
      name: 'AeroFit Active',
      website: 'aerofit.com',
    });
    companyAId = companyA.id;

    // Update Company A Chatbot Branding
    await ChatbotService.updateConfig(companyAId, {
      bot_name: 'AeroFit Support Bot',
      welcome_message: 'Hi there! How can I assist with your AeroFit equipment?',
      primary_color: '#4f46e5',
      logo_url: 'https://aerofit.com/logo.png',
    });

    // Ingest AeroFit Documents (30-day return policy, 2-year warranty)
    await loadAeroFitDemoDocuments(companyAId);

    // 4. Create User & Company B ("CloudCorp Tech")
    const userBRes = await query(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ('user-cloudcorp-uid', 'cloudcorp@demo.com', 'CloudCorp Admin')
       ON CONFLICT (firebase_uid) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id`
    );
    const userB = userBRes.rows[0];

    const { company: companyB } = await CompanyService.createCompany(userB.id, {
      name: 'CloudCorp Tech',
      website: 'cloudcorp.io',
    });
    companyBId = companyB.id;

    // Ingest distinct CloudCorp document
    await DocumentService.uploadAndIngestTextDocument(
      companyBId,
      'cloud_sla.txt',
      'CloudCorp Server SLA Agreement: All cloud dedicated servers maintain a 99.99% uptime guarantee with 15-minute response times for critical incidents.'
    );
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDb();
  });

  it('1. GET /widget.js serves the standalone embed script statically', async () => {
    const res = await fetch(`${baseUrl}/widget.js`);
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain('AeroRAG Embeddable Customer Support AI Widget');
    expect(text).toContain('aerorag-chat-iframe');
    expect(text).toContain('data-company-id');
  });

  it('2. GET /api/public/config/:companyId returns company branding without authentication', async () => {
    const res = await fetch(`${baseUrl}/api/public/config/${companyAId}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.company_name).toBe('AeroFit Active');
    expect(data.bot_name).toBe('AeroFit Support Bot');
    expect(data.welcome_message).toBe('Hi there! How can I assist with your AeroFit equipment?');
    expect(data.primary_color).toBe('#4f46e5');
    expect(data.logo_url).toBe('https://aerofit.com/logo.png');
  });

  it('3. GET /api/public/companies/:companyId/config alias works identically', async () => {
    const res = await fetch(`${baseUrl}/api/public/companies/${companyAId}/config`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.bot_name).toBe('AeroFit Support Bot');
  });

  it('4. POST /api/public/chat allows unauthenticated customer to ask questions with anonymous sessionId', async () => {
    const sessionId = `test_sess_${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyAId,
        sessionId,
        message: 'How long do I have to return a product?',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.answer).toBeDefined();
    expect(data.answer.toLowerCase()).toContain('30 days');
    expect(data.sources).toBeDefined();
    expect(data.sources.length).toBeGreaterThan(0);
    expect(data.sources[0].document).toBe('Return_Policy.pdf');
    expect(data.sessionId).toBe(sessionId);
  });

  it('5. Strict Tenant Isolation: Company A RAG cannot access Company B documents', async () => {
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyAId,
        sessionId: 'sess_isolation_1',
        message: 'What is the uptime SLA for cloud servers?',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    // Company A (AeroFit) does not have CloudCorp server SLAs, so it must not find the document
    expect(data.sources.some((s: any) => s.document.includes('cloud_sla'))).toBe(false);
    expect(data.escalation_required).toBe(true);
  });

  it('6. Strict Tenant Isolation: Company B RAG answers CloudCorp SLA and cannot access AeroFit warranties', async () => {
    // 6a. Query Company B for its own SLA document
    const resB = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyBId,
        sessionId: 'sess_isolation_2',
        message: 'What is the uptime SLA for cloud servers?',
      }),
    });

    expect(resB.status).toBe(200);
    const dataB = (await resB.json()) as any;
    expect(dataB.sources.length).toBeGreaterThan(0);
    expect(dataB.sources[0].document).toBe('cloud_sla.txt');

    // 6b. Query Company B for AeroFit treadmills
    const resB2 = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyBId,
        sessionId: 'sess_isolation_3',
        message: 'What is the warranty period for AeroFit treadmills?',
      }),
    });

    expect(resB2.status).toBe(200);
    const dataB2 = (await resB2.json()) as any;
    expect(dataB2.sources.some((s: any) => s.document.includes('Warranty_Policy'))).toBe(false);
    expect(dataB2.escalation_required).toBe(true);
  });

  it('7. Public chat validates company existence and returns 404 for unknown IDs', async () => {
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: '00000000-0000-0000-0000-000000000000',
        sessionId: 'sess_invalid',
        message: 'Hello?',
      }),
    });

    expect(res.status).toBe(404);
    const data = (await res.json()) as any;
    expect(data.error).toContain('not found');
  });

  it('8. Public chat rejects empty messages with 400 Validation Error', async () => {
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyId: companyAId,
        sessionId: 'sess_empty',
        message: '',
      }),
    });

    expect(res.status).toBe(400);
    const data = (await res.json()) as any;
    expect(data.error).toBe('Validation failed');
  });
});

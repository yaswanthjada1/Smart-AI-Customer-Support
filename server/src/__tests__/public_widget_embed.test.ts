import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import { getDb, closeDb, query } from '../db';
import { CompanyService } from '../modules/companies/companyService';
import { ChatbotService } from '../modules/chatbot/chatbotService';
import { DocumentService } from '../modules/documents/documentService';
import { ApiKeyService } from '../modules/apiKeys/apiKeyService';
import { loadAeroFitDemoDocuments } from '../modules/documents/demoDocs';
import { Server } from 'http';

describe('AeroRAG Public API & Embed MVP Test Suite', () => {
  let server: Server;
  let baseUrl: string;
  let companyAId: string;
  let companyBId: string;
  let apiKeyA: { rawKey: string; keyId: string };

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

    // Create API Key for Company A
    const createdKey = await ApiKeyService.createApiKey(companyAId, 'Production Website Key');
    apiKeyA = {
      rawKey: createdKey.rawKey,
      keyId: createdKey.apiKey.id,
    };

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

  it('2. GET /api/public/widget-config/:companyId returns public branding and signed widget token', async () => {
    const res = await fetch(`${baseUrl}/api/public/widget-config/${companyAId}`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.companyId).toBe(companyAId);
    expect(data.botName).toBe('AeroFit Support Bot');
    expect(data.welcomeMessage).toBe('Hi there! How can I assist with your AeroFit equipment?');
    expect(data.brandColor).toBe('#4f46e5');
    expect(data.logoUrl).toBe('https://aerofit.com/logo.png');
    expect(data.widgetToken).toBeDefined();
    expect(data.widgetToken.startsWith('wgt_')).toBe(true);
  });

  it('3. POST /api/public/chat with Bearer API Key resolves company and answers grounded question', async () => {
    const sessionId = `api_sess_${Date.now()}`;
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyA.rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'How long do I have to return a product?',
        sessionId,
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

  it('4. POST /api/public/chat with Bearer API Key handles out-of-scope question without hallucinating', async () => {
    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyA.rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'What is the price of the RunPro T100?',
        sessionId: 'out_of_scope_1',
      }),
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.answer).toBeDefined();
    expect(data.escalation_required).toBe(true);
  });

  it('5. Revoked API Key returns 401 Unauthorized', async () => {
    // Revoke the key
    const revoked = await ApiKeyService.revokeApiKey(companyAId, apiKeyA.keyId);
    expect(revoked).toBe(true);

    const res = await fetch(`${baseUrl}/api/public/chat`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKeyA.rawKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: 'How long do I have to return a product?',
        sessionId: 'revoked_sess',
      }),
    });

    expect(res.status).toBe(401);
    const data = (await res.json()) as any;
    expect(data.error).toContain('Unauthorized');
  });

  it('6. Strict Tenant Isolation: Company A cannot retrieve Company B Cloud SLA documents', async () => {
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
    expect(data.sources.some((s: any) => s.document.includes('cloud_sla'))).toBe(false);
    expect(data.escalation_required).toBe(true);
  });

  it('7. Strict Tenant Isolation: Company B retrieves only its own SLA documents', async () => {
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
  });

  it('8. Public chat validates company existence and returns 404 for unknown IDs', async () => {
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

  it('9. Public chat rejects empty messages with 400 Validation Error', async () => {
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

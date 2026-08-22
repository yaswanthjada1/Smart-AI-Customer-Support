import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { app } from '../app';
import { getDb, closeDb } from '../db';
import { Server } from 'http';

describe('Phase 1: API HTTP Endpoints & Live Tenant Verification', () => {
  let server: Server;
  let baseUrl: string;
  let userAToken = 'dev-token-user-alpha-999';
  let userBToken = 'dev-token-user-beta-888';
  let companyAId: string;

  beforeAll(async () => {
    await getDb();
    await new Promise<void>((resolve) => {
      server = app.listen(0, () => {
        const addr = server.address();
        if (typeof addr === 'object' && addr) {
          baseUrl = `http://localhost:${addr.port}`;
        }
        resolve();
      });
    });
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await closeDb();
  });

  it('1. Health check returns 200 OK', async () => {
    const res = await fetch(`${baseUrl}/api/health`);
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.status).toBe('ok');
  });

  it('2. Unauthenticated request to /api/app/me is rejected with 401', async () => {
    const res = await fetch(`${baseUrl}/api/app/me`);
    expect(res.status).toBe(401);
  });

  it('3. Authenticated request with dev token automatically provisions User A', async () => {
    const res = await fetch(`${baseUrl}/api/app/me`, {
      headers: { Authorization: `Bearer ${userAToken}` },
    });
    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.user.firebase_uid).toBe('user-alpha-999');
    expect(data.user.id).toBeDefined();
  });

  it('4. User A creates company workspace "AeroFit"', async () => {
    const res = await fetch(`${baseUrl}/api/app/companies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${userAToken}`,
      },
      body: JSON.stringify({
        name: 'AeroFit',
        website: 'https://aerofit-demo.com',
      }),
    });

    expect(res.status).toBe(201);
    const data = (await res.json()) as any;
    expect(data.company.name).toBe('AeroFit');
    expect(data.member.role).toBe('owner');
    expect(data.chatbotConfig.bot_name).toBe('AeroFit Assistant');

    companyAId = data.company.id;
  });

  it('5. User A can retrieve AeroFit details and member list', async () => {
    const res = await fetch(`${baseUrl}/api/app/companies/${companyAId}`, {
      headers: {
        Authorization: `Bearer ${userAToken}`,
        'X-Company-Id': companyAId,
      },
    });

    expect(res.status).toBe(200);
    const data = (await res.json()) as any;
    expect(data.company.id).toBe(companyAId);
    expect(data.membership.role).toBe('owner');
  });

  it('6. Strict Tenant Isolation: User B receives 403 Forbidden when attempting to access AeroFit workspace', async () => {
    // First, authenticate User B so User B exists in system
    await fetch(`${baseUrl}/api/app/me`, {
      headers: { Authorization: `Bearer ${userBToken}` },
    });

    // Now User B tries to access User A's company (companyAId)
    const res = await fetch(`${baseUrl}/api/app/companies/${companyAId}`, {
      headers: {
        Authorization: `Bearer ${userBToken}`,
        'X-Company-Id': companyAId,
      },
    });

    expect(res.status).toBe(403);
    const data = (await res.json()) as any;
    expect(data.error).toContain('not a member of this company workspace');
  });
});

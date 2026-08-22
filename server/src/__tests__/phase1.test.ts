import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { getDb, closeDb, query } from '../db';
import { verifyFirebaseIdToken } from '../config/firebaseAdmin';
import { CompanyService } from '../modules/companies/companyService';
import { User } from '../types';

describe('Phase 1: Foundation & Multi-Tenant Authorization', () => {
  let userA: User;
  let userB: User;
  let companyAId: string;
  let companyBId: string;

  beforeAll(async () => {
    // 1. Initialize DB & Migrations
    await getDb();

    const timestamp = Date.now();
    const uidA = `test-uid-user-a-${timestamp}`;
    const uidB = `test-uid-user-b-${timestamp}`;

    // 2. Provision test users
    const userARes = await query<User>(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, 'AeroFit Owner')
       ON CONFLICT (firebase_uid) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, firebase_uid, email, display_name, photo_url, created_at`,
      [uidA, `${uidA}@aerofit.com`]
    );
    userA = userARes.rows[0];

    const userBRes = await query<User>(
      `INSERT INTO users (firebase_uid, email, display_name)
       VALUES ($1, $2, 'OtherCorp User')
       ON CONFLICT (firebase_uid) DO UPDATE SET display_name = EXCLUDED.display_name
       RETURNING id, firebase_uid, email, display_name, photo_url, created_at`,
      [uidB, `${uidB}@othercorp.com`]
    );
    userB = userBRes.rows[0];
  });

  afterAll(async () => {
    await closeDb();
  });

  it('1. Verifies database schema tables and vector extensions are created', async () => {
    const tablesRes = await query<{ table_name: string }>(
      `SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'`
    );
    const tableNames = tablesRes.rows.map((r) => r.table_name);

    expect(tableNames).toContain('users');
    expect(tableNames).toContain('companies');
    expect(tableNames).toContain('company_members');
    expect(tableNames).toContain('documents');
    expect(tableNames).toContain('document_chunks');
    expect(tableNames).toContain('chatbot_configs');
    expect(tableNames).toContain('conversations');
    expect(tableNames).toContain('messages');
    expect(tableNames).toContain('api_keys');
    expect(tableNames).toContain('analytics_events');
  });

  it('2. Verifies Firebase ID Token verification & user decoding', async () => {
    const decoded = await verifyFirebaseIdToken('dev-token-test-uid-user-a');
    expect(decoded.uid).toBe('test-uid-user-a');
    expect(decoded.email).toBe('test-uid-user-a@example.com');

    await expect(verifyFirebaseIdToken('invalid-random-token')).rejects.toThrow();
  });

  it('3. Creates company workspace "AeroFit" for User A with owner membership & default chatbot config', async () => {
    const { company, member, chatbotConfig } = await CompanyService.createCompany(userA.id, {
      name: 'AeroFit',
      website: 'https://aerofit-demo.com',
      logo_url: 'https://aerofit-demo.com/logo.png',
    });

    expect(company.name).toBe('AeroFit');
    expect(company.slug).toContain('aerofit');
    expect(member.role).toBe('owner');
    expect(member.user_id).toBe(userA.id);
    expect(chatbotConfig.bot_name).toBe('AeroFit Assistant');
    expect(chatbotConfig.primary_color).toBe('#4f46e5');

    companyAId = company.id;

    const userACompanies = await CompanyService.getUserCompanies(userA.id);
    expect(userACompanies.some((c) => c.id === companyAId)).toBe(true);
  });

  it('4. Creates separate company workspace "OtherCorp" for User B', async () => {
    const { company, member } = await CompanyService.createCompany(userB.id, {
      name: 'OtherCorp',
      website: 'https://othercorp.io',
    });

    expect(company.name).toBe('OtherCorp');
    expect(member.role).toBe('owner');
    expect(member.user_id).toBe(userB.id);

    companyBId = company.id;

    const userBCompanies = await CompanyService.getUserCompanies(userB.id);
    expect(userBCompanies.some((c) => c.id === companyBId)).toBe(true);
    expect(userBCompanies.some((c) => c.id === companyAId)).toBe(false);
  });

  it('5. Enforces strict Multi-Tenant isolation between Company A and Company B', async () => {
    const membersA = await CompanyService.getCompanyMembers(companyAId);
    expect(membersA.length).toBe(1);
    expect(membersA[0].user_id).toBe(userA.id);

    const isUserBInA = membersA.some((m) => m.user_id === userB.id);
    expect(isUserBInA).toBe(false);

    const membersB = await CompanyService.getCompanyMembers(companyBId);
    expect(membersB.length).toBe(1);
    expect(membersB[0].user_id).toBe(userB.id);

    const isUserAInB = membersB.some((m) => m.user_id === userA.id);
    expect(isUserAInB).toBe(false);
  });
});

import crypto from 'crypto';
import { query } from '../../db';
import { ApiKey, Company } from '../../types';

export class ApiKeyService {
  /**
   * Generates a new API Key for a company using standard 'ar_live_' prefix.
   * Returns the full raw key ONCE. Stores only SHA-256 hash in database.
   */
  static async createApiKey(
    companyId: string,
    name: string
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const randomSecret = crypto.randomBytes(20).toString('hex');
    const rawKey = `ar_live_${randomSecret}`;
    const suffix = rawKey.slice(-4);
    const keyPrefix = `ar_live_********${suffix}`;
    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const res = await query<ApiKey>(
      `INSERT INTO api_keys (company_id, name, key_hash, key_prefix)
       VALUES ($1, $2, $3, $4)
       RETURNING id, company_id, name, key_prefix, last_used_at, created_at, revoked_at`,
      [companyId, name.trim(), keyHash, keyPrefix]
    );

    return {
      apiKey: res.rows[0],
      rawKey,
    };
  }

  /**
   * Lists active API keys metadata for a company.
   */
  static async getCompanyApiKeys(companyId: string): Promise<ApiKey[]> {
    const res = await query<ApiKey>(
      `SELECT id, company_id, name, key_prefix, last_used_at, created_at, revoked_at
       FROM api_keys
       WHERE company_id = $1
       ORDER BY created_at DESC`,
      [companyId]
    );
    return res.rows;
  }

  /**
   * Revokes an API Key.
   */
  static async revokeApiKey(companyId: string, keyId: string): Promise<boolean> {
    const res = await query(
      `UPDATE api_keys
       SET revoked_at = NOW()
       WHERE id = $1 AND company_id = $2 AND revoked_at IS NULL`,
      [keyId, companyId]
    );
    return res.rowCount > 0;
  }

  /**
   * Authenticates an API Key request (supports both ar_live_ and sk_live_ prefixes).
   * Verifies key hash, checks revoked status, and updates last_used_at timestamp.
   */
  static async validateApiKey(rawKey: string): Promise<{ company: Company; keyId: string } | null> {
    if (!rawKey || (!rawKey.startsWith('ar_live_') && !rawKey.startsWith('sk_live_'))) {
      return null;
    }

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const res = await query<{
      id: string;
      company_id: string;
      revoked_at: Date | null;
      name: string;
      slug: string;
      website: string;
      logo_url: string;
      created_at: Date;
    }>(
      `SELECT k.id, k.company_id, k.revoked_at, c.name, c.slug, c.website, c.logo_url, c.created_at
       FROM api_keys k
       INNER JOIN companies c ON k.company_id = c.id
       WHERE k.key_hash = $1
       LIMIT 1`,
      [keyHash]
    );

    if (res.rows.length === 0) return null;
    const row = res.rows[0];

    // Check if revoked
    if (row.revoked_at) return null;

    // Update last_used_at
    await query('UPDATE api_keys SET last_used_at = NOW() WHERE id = $1', [row.id]);

    const company: Company = {
      id: row.company_id,
      name: row.name,
      slug: row.slug,
      website: row.website,
      logo_url: row.logo_url,
      created_at: row.created_at,
    };

    return { company, keyId: row.id };
  }

  /**
   * Generates a short-lived cryptographically signed widget token for anonymous iframe sessions.
   */
  static generateWidgetToken(companyId: string): string {
    const payload = {
      companyId,
      purpose: 'widget',
      exp: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
    };
    const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const secret = process.env.SESSION_SECRET || 'aerorag-widget-auth-secret';
    const sig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
    return `wgt_${data}.${sig}`;
  }

  /**
   * Validates a signed widget token.
   */
  static validateWidgetToken(token: string): { companyId: string } | null {
    if (!token || !token.startsWith('wgt_')) return null;
    try {
      const raw = token.slice(4);
      const [data, sig] = raw.split('.');
      if (!data || !sig) return null;

      const secret = process.env.SESSION_SECRET || 'aerorag-widget-auth-secret';
      const expectedSig = crypto.createHmac('sha256', secret).update(data).digest('base64url');
      if (sig !== expectedSig) return null;

      const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
      if (payload.exp && payload.exp < Date.now()) return null;
      if (payload.purpose !== 'widget' || !payload.companyId) return null;

      return { companyId: payload.companyId };
    } catch (e) {
      return null;
    }
  }
}

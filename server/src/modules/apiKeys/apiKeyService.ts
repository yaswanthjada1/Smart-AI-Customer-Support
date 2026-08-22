import crypto from 'crypto';
import { query } from '../../db';
import { ApiKey, Company } from '../../types';

export class ApiKeyService {
  /**
   * Generates a new API Key for a company.
   * Returns the full raw key ONCE. Stores only SHA-256 hash in database.
   */
  static async createApiKey(
    companyId: string,
    name: string
  ): Promise<{ apiKey: ApiKey; rawKey: string }> {
    const randomSecret = crypto.randomBytes(24).toString('hex');
    const rawKey = `sk_live_${randomSecret}`;
    const keyPrefix = `sk_live_${randomSecret.substring(0, 6)}...`;
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
   * Authenticates an API Key request for the Business API.
   */
  static async validateApiKey(rawKey: string): Promise<{ company: Company; keyId: string } | null> {
    if (!rawKey || !rawKey.startsWith('sk_live_')) return null;

    const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

    const res = await query<{ id: string; company_id: string; revoked_at: Date | null; name: string; slug: string; website: string; logo_url: string; created_at: Date }>(
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
}

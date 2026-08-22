import { query } from '../../db';
import { Company, CompanyMember, ChatbotConfig } from '../../types';

export class CompanyService {
  /**
   * Creates a new company workspace and assigns the creator as the Owner.
   * Also provisions default chatbot configuration.
   */
  static async createCompany(
    userId: string,
    data: { name: string; slug?: string; website?: string; logo_url?: string }
  ): Promise<{ company: Company; member: CompanyMember; chatbotConfig: ChatbotConfig }> {
    const rawSlug = data.slug || data.name.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    let slug = rawSlug || 'company-' + Date.now().toString(36);

    // Check if slug exists
    const existingSlug = await query<Company>('SELECT id FROM companies WHERE slug = $1 LIMIT 1', [slug]);
    if (existingSlug.rows.length > 0) {
      slug = `${slug}-${Math.floor(1000 + Math.random() * 9000)}`;
    }

    // 1. Create company
    const companyRes = await query<Company>(
      `INSERT INTO companies (name, slug, website, logo_url)
       VALUES ($1, $2, $3, $4)
       RETURNING id, name, slug, website, logo_url, created_at`,
      [data.name.trim(), slug, data.website || null, data.logo_url || null]
    );
    const company = companyRes.rows[0];

    // 2. Add owner membership
    const memberRes = await query<CompanyMember>(
      `INSERT INTO company_members (company_id, user_id, role)
       VALUES ($1, $2, 'owner')
       RETURNING id, company_id, user_id, role, created_at`,
      [company.id, userId]
    );
    const member = memberRes.rows[0];

    // 3. Provision default chatbot configuration
    const configRes = await query<ChatbotConfig>(
      `INSERT INTO chatbot_configs (company_id, bot_name, welcome_message, logo_url, primary_color)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, company_id, bot_name, welcome_message, logo_url, primary_color, created_at, updated_at`,
      [
        company.id,
        `${company.name} Assistant`,
        `Hello! Welcome to ${company.name} support. How can I help you today?`,
        company.logo_url,
        '#4f46e5',
      ]
    );
    const chatbotConfig = configRes.rows[0];

    return { company, member, chatbotConfig };
  }

  /**
   * Retrieves all company workspaces that a given user belongs to.
   */
  static async getUserCompanies(userId: string): Promise<(Company & { role: string })[]> {
    const res = await query<Company & { role: string }>(
      `SELECT c.id, c.name, c.slug, c.website, c.logo_url, c.created_at, cm.role
       FROM companies c
       INNER JOIN company_members cm ON c.id = cm.company_id
       WHERE cm.user_id = $1
       ORDER BY c.created_at DESC`,
      [userId]
    );
    return res.rows;
  }

  /**
   * Retrieves details for a specific company workspace.
   */
  static async getCompanyById(companyId: string): Promise<Company | null> {
    const res = await query<Company>(
      'SELECT id, name, slug, website, logo_url, created_at FROM companies WHERE id = $1 LIMIT 1',
      [companyId]
    );
    return res.rows[0] || null;
  }

  /**
   * Retrieves all team members for a company workspace.
   */
  static async getCompanyMembers(companyId: string): Promise<CompanyMember[]> {
    const res = await query<CompanyMember>(
      `SELECT cm.id, cm.company_id, cm.user_id, cm.role, cm.created_at, u.email, u.display_name
       FROM company_members cm
       INNER JOIN users u ON cm.user_id = u.id
       WHERE cm.company_id = $1
       ORDER BY 
         CASE cm.role WHEN 'owner' THEN 1 WHEN 'admin' THEN 2 ELSE 3 END,
         cm.created_at ASC`,
      [companyId]
    );
    return res.rows;
  }

  /**
   * Updates company metadata.
   */
  static async updateCompany(
    companyId: string,
    data: { name?: string; website?: string; logo_url?: string }
  ): Promise<Company> {
    const res = await query<Company>(
      `UPDATE companies
       SET name = COALESCE($1, name),
           website = COALESCE($2, website),
           logo_url = COALESCE($3, logo_url)
       WHERE id = $4
       RETURNING id, name, slug, website, logo_url, created_at`,
      [data.name || null, data.website || null, data.logo_url || null, companyId]
    );
    return res.rows[0];
  }
}

import { query } from '../../db';
import { ChatbotConfig } from '../../types';

export class ChatbotService {
  static async getConfig(companyId: string): Promise<ChatbotConfig> {
    const res = await query<ChatbotConfig>(
      'SELECT * FROM chatbot_configs WHERE company_id = $1 LIMIT 1',
      [companyId]
    );

    if (res.rows.length > 0) {
      return res.rows[0];
    }

    // Default provision if missing
    const created = await query<ChatbotConfig>(
      `INSERT INTO chatbot_configs (company_id, bot_name, welcome_message, primary_color)
       VALUES ($1, 'Support Assistant', 'Hello! How can I help you today?', '#4f46e5')
       RETURNING *`,
      [companyId]
    );
    return created.rows[0];
  }

  static async updateConfig(
    companyId: string,
    data: { bot_name?: string; welcome_message?: string; logo_url?: string; primary_color?: string }
  ): Promise<ChatbotConfig> {
    const res = await query<ChatbotConfig>(
      `UPDATE chatbot_configs
       SET bot_name = COALESCE($1, bot_name),
           welcome_message = COALESCE($2, welcome_message),
           logo_url = COALESCE($3, logo_url),
           primary_color = COALESCE($4, primary_color),
           updated_at = NOW()
       WHERE company_id = $5
       RETURNING *`,
      [data.bot_name || null, data.welcome_message || null, data.logo_url || null, data.primary_color || null, companyId]
    );
    return res.rows[0];
  }
}

import { query } from '../../db';
import { Conversation, Message, EscalationStatus, MessageRole, SourceCitation } from '../../types';

export class ConversationService {
  /**
   * Finds or creates a conversation session for a customer.
   */
  static async getOrCreateSession(
    companyId: string,
    sessionId: string,
    customerIdentifier?: string
  ): Promise<Conversation> {
    const existing = await query<Conversation>(
      'SELECT * FROM conversations WHERE company_id = $1 AND session_id = $2 LIMIT 1',
      [companyId, sessionId]
    );

    if (existing.rows.length > 0) {
      return existing.rows[0];
    }

    const created = await query<Conversation>(
      `INSERT INTO conversations (company_id, session_id, customer_identifier, escalation_status)
       VALUES ($1, $2, $3, 'none')
       RETURNING *`,
      [companyId, sessionId, customerIdentifier || null]
    );

    return created.rows[0];
  }

  /**
   * Adds a message to a conversation.
   */
  static async addMessage(
    conversationId: string,
    role: MessageRole,
    content: string,
    sources: SourceCitation[] = []
  ): Promise<Message> {
    const res = await query<Message>(
      `INSERT INTO messages (conversation_id, role, content, sources)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [conversationId, role, content, JSON.stringify(sources)]
    );

    // Update conversation timestamp
    await query('UPDATE conversations SET updated_at = NOW() WHERE id = $1', [conversationId]);

    return res.rows[0];
  }

  /**
   * Lists conversations for a company.
   */
  static async getCompanyConversations(companyId: string): Promise<(Conversation & { message_count: number; last_message: string })[]> {
    const res = await query<Conversation & { message_count: number; last_message: string }>(
      `SELECT 
        c.id, c.company_id, c.session_id, c.customer_identifier, c.escalation_status, c.created_at, c.updated_at,
        COUNT(m.id)::int as message_count,
        COALESCE((
          SELECT content FROM messages m2 
          WHERE m2.conversation_id = c.id 
          ORDER BY m2.created_at DESC LIMIT 1
        ), '') as last_message
       FROM conversations c
       LEFT JOIN messages m ON c.id = m.conversation_id
       WHERE c.company_id = $1
       GROUP BY c.id
       ORDER BY c.updated_at DESC`,
      [companyId]
    );
    return res.rows;
  }

  /**
   * Retrieves messages for a conversation.
   */
  static async getConversationMessages(
    companyId: string,
    conversationId: string
  ): Promise<{ conversation: Conversation; messages: Message[] } | null> {
    const convRes = await query<Conversation>(
      'SELECT * FROM conversations WHERE id = $1 AND company_id = $2 LIMIT 1',
      [conversationId, companyId]
    );

    if (convRes.rows.length === 0) return null;

    const messagesRes = await query<Message>(
      'SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC',
      [conversationId]
    );

    return {
      conversation: convRes.rows[0],
      messages: messagesRes.rows,
    };
  }

  /**
   * Updates escalation status.
   */
  static async setEscalationStatus(
    companyId: string,
    conversationId: string,
    status: EscalationStatus
  ): Promise<Conversation | null> {
    const res = await query<Conversation>(
      `UPDATE conversations
       SET escalation_status = $1, updated_at = NOW()
       WHERE id = $2 AND company_id = $3
       RETURNING *`,
      [status, conversationId, companyId]
    );
    return res.rows[0] || null;
  }
}

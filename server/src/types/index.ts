export type UserRole = 'owner' | 'admin' | 'member';

export type DocumentStatus = 'uploading' | 'processing' | 'indexing' | 'ready' | 'failed';

export type MessageRole = 'user' | 'assistant' | 'system';

export type EscalationStatus = 'none' | 'requested' | 'resolved';

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: Date;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_url: string | null;
  created_at: Date;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  created_at: Date;
  email?: string;
  display_name?: string;
}

export interface Document {
  id: string;
  company_id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: Date;
  updated_at: Date;
  chunk_count?: number;
}

export interface DocumentChunk {
  id: string;
  company_id: string;
  document_id: string;
  content: string;
  embedding?: number[] | string;
  page_number: number | null;
  section: string | null;
  metadata: Record<string, any>;
  created_at: Date;
  similarity?: number;
}

export interface ChatbotConfig {
  id: string;
  company_id: string;
  bot_name: string;
  welcome_message: string;
  logo_url: string | null;
  primary_color: string;
  created_at: Date;
  updated_at: Date;
}

export interface Conversation {
  id: string;
  company_id: string;
  session_id: string;
  customer_identifier: string | null;
  escalation_status: EscalationStatus;
  created_at: Date;
  updated_at: Date;
  message_count?: number;
  last_message?: string;
}

export interface SourceCitation {
  document: string;
  document_id?: string;
  page: number | null;
  section?: string | null;
  snippet?: string;
  similarity_score?: number;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: MessageRole;
  content: string;
  sources: SourceCitation[];
  created_at: Date;
}

export interface ApiKey {
  id: string;
  company_id: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: Date | null;
  created_at: Date;
  revoked_at: Date | null;
}

export interface AnalyticsSummary {
  total_documents: number;
  ready_documents: number;
  total_conversations: number;
  answered_questions: number;
  escalations_count: number;
  unanswered_count: number;
  avg_similarity: number;
}

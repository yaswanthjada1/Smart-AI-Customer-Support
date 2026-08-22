export type UserRole = 'owner' | 'admin' | 'member';

export type DocumentStatus = 'uploading' | 'processing' | 'indexing' | 'ready' | 'failed';

export type EscalationStatus = 'none' | 'requested' | 'resolved';

export interface User {
  id: string;
  firebase_uid: string;
  email: string;
  display_name: string | null;
  photo_url: string | null;
  created_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  website: string | null;
  logo_url: string | null;
  created_at: string;
  role?: UserRole;
}

export interface CompanyMember {
  id: string;
  company_id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  email?: string;
  display_name?: string;
}

export interface DocumentItem {
  id: string;
  company_id: string;
  file_name: string;
  storage_path: string;
  file_type: string;
  file_size: number;
  status: DocumentStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
  chunk_count?: number;
}

export interface DocumentChunk {
  id: string;
  company_id: string;
  document_id: string;
  content: string;
  embedding?: number[];
  page_number: number | null;
  section: string | null;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface ChatbotConfig {
  id: string;
  company_id: string;
  bot_name: string;
  welcome_message: string;
  logo_url: string | null;
  primary_color: string;
  created_at: string;
  updated_at: string;
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
  role: 'user' | 'assistant' | 'system';
  content: string;
  sources: SourceCitation[];
  created_at: string;
}

export interface Conversation {
  id: string;
  company_id: string;
  session_id: string;
  customer_identifier: string | null;
  escalation_status: EscalationStatus;
  created_at: string;
  updated_at: string;
  message_count?: number;
  last_message?: string;
  messages?: Message[];
}

export interface ApiKeyItem {
  id: string;
  company_id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
  revoked_at: string | null;
  raw_key?: string;
}

export interface AnalyticsSummary {
  total_documents: number;
  ready_documents: number;
  total_conversations: number;
  answered_questions: number;
  escalations_count: number;
  unanswered_count: number;
  avg_similarity?: number;
}

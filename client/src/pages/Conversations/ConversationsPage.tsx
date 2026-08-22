import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  Bot,
  Filter,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { Conversation, Message, EscalationStatus } from '../../types';

export const ConversationsPage: React.FC = () => {
  const { activeCompany } = useTenant();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConv, setSelectedConv] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | 'none' | 'requested' | 'resolved'>('all');

  const fetchConversations = async () => {
    if (!activeCompany) return;
    try {
      const res = await apiClient<{ conversations: Conversation[] }>(
        `/api/app/companies/${activeCompany.id}/conversations`
      );
      setConversations(res.conversations || []);
      if (!selectedConv && res.conversations && res.conversations.length > 0) {
        selectConversation(res.conversations[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConversations();
  }, [activeCompany]);

  const selectConversation = async (conv: Conversation) => {
    if (!activeCompany) return;
    setSelectedConv(conv);
    setLoadingMessages(true);
    try {
      const res = await apiClient<{ conversation: Conversation; messages: Message[] }>(
        `/api/app/companies/${activeCompany.id}/conversations/${conv.id}/messages`
      );
      setMessages(res.messages || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMessages(false);
    }
  };

  const handleUpdateEscalation = async (status: EscalationStatus) => {
    if (!activeCompany || !selectedConv) return;
    try {
      const res = await apiClient<{ conversation: Conversation }>(
        `/api/app/companies/${activeCompany.id}/conversations/${selectedConv.id}/escalation`,
        {
          method: 'PATCH',
          body: { status },
        }
      );
      setSelectedConv(res.conversation);
      setConversations((prev) =>
        prev.map((c) => (c.id === selectedConv.id ? { ...c, escalation_status: status } : c))
      );
    } catch (err) {
      console.error(err);
    }
  };

  const filtered = conversations.filter((c) => {
    if (statusFilter === 'all') return true;
    return c.escalation_status === statusFilter;
  });

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-indigo-400" />
            <span>Customer Conversations & Escalations</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Review live support sessions, inspect source citations, and manage human escalation requests.
          </p>
        </div>

        {/* Filter Badges */}
        <div className="flex items-center gap-2">
          {(['all', 'requested', 'resolved', 'none'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setStatusFilter(filter)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all ${
                statusFilter === filter
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
              }`}
            >
              {filter === 'requested' ? '🚨 Escalated' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="lg:col-span-4 glass-panel rounded-3xl border border-slate-800 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <span className="text-xs font-bold text-white uppercase tracking-wider">
              Inbox ({filtered.length})
            </span>
            <button onClick={fetchConversations} className="p-1 text-slate-400 hover:text-white">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Loading sessions...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400">No conversations found.</div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConv?.id === c.id ? 'bg-indigo-950/40 border-l-4 border-indigo-500' : 'hover:bg-slate-800/30'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-semibold text-slate-200">
                      {c.customer_identifier || `Guest (${c.session_id.substring(0, 10)})`}
                    </span>
                    <span className="text-slate-500 font-mono text-[10px]">
                      {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 line-clamp-1 mb-2">
                    {c.last_message || 'New conversation'}
                  </p>
                  <div className="flex items-center gap-2">
                    {c.escalation_status === 'requested' && (
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        Escalation Requested
                      </span>
                    )}
                    {c.escalation_status === 'resolved' && (
                      <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                        Resolved
                      </span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right: Transcript Inspector (8 cols) */}
        <div className="lg:col-span-8 glass-panel rounded-3xl border border-slate-800 flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-white">
                    Session: {selectedConv.session_id}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Created on {new Date(selectedConv.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConv.escalation_status === 'requested' ? (
                    <button
                      onClick={() => handleUpdateEscalation('resolved')}
                      className="px-3 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-md"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateEscalation('requested')}
                      className="px-3 py-1 rounded-xl bg-amber-600/30 hover:bg-amber-600/50 border border-amber-500/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Escalate to Human</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Transcript */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-950/60">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                    <span>Loading transcript...</span>
                  </div>
                ) : messages.length === 0 ? (
                  <p className="text-center text-xs text-slate-400 py-8">No messages in this session.</p>
                ) : (
                  messages.map((m) => (
                    <div
                      key={m.id}
                      className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                    >
                      <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mb-1 px-1">
                        {m.role === 'user' ? (
                          <>
                            <User className="w-3 h-3 text-slate-400" />
                            <span>Customer</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3 h-3 text-indigo-400" />
                            <span>AI Support Agent</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-md'
                            : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        {/* Citations */}
                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-800 flex flex-wrap gap-1.5">
                            {m.sources.map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold"
                              >
                                <FileText className="w-3 h-3" />
                                <span>{s.document}{s.page ? ` (p.${s.page})` : ''}</span>
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center text-slate-400">
              <MessageSquare className="w-10 h-10 text-slate-600 mb-2" />
              <p className="text-xs">Select a conversation from the left to view transcript and citations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

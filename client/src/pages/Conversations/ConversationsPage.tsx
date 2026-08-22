import React, { useState, useEffect } from 'react';
import {
  MessageSquare,
  AlertTriangle,
  CheckCircle2,
  FileText,
  User,
  Bot,
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
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
            <MessageSquare className="w-6 h-6 text-indigo-600" />
            <span>Customer Conversations</span>
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Review customer support sessions, verify citations, and resolve human escalation requests.
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
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-white text-slate-600 hover:text-slate-900 border border-slate-200'
              }`}
            >
              {filter === 'requested' ? '🚨 Escalated' : filter === 'none' ? 'Standard' : filter}
            </button>
          ))}
        </div>
      </div>

      {/* Main Split Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-[680px]">
        {/* Left: Conversation List (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Inbox ({filtered.length})
            </span>
            <button onClick={fetchConversations} className="p-1 text-slate-400 hover:text-slate-700">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto divide-y divide-slate-100">
            {loading ? (
              <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
                <span>Loading sessions...</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="font-semibold text-slate-700">No conversations found</p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Customer chats will appear here as they interact with your widget.
                </p>
              </div>
            ) : (
              filtered.map((c) => (
                <div
                  key={c.id}
                  onClick={() => selectConversation(c)}
                  className={`p-4 cursor-pointer transition-colors ${
                    selectedConv?.id === c.id ? 'bg-indigo-50/60 border-l-4 border-indigo-600' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-900">
                      {c.customer_identifier || `Customer #${c.session_id.substring(0, 8)}`}
                    </span>
                    <span className="text-slate-400 font-mono text-[10px]">
                      {new Date(c.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 line-clamp-1 mb-2">
                    {c.last_message || 'New conversation'}
                  </p>
                  <div className="flex items-center gap-2">
                    {c.escalation_status === 'requested' && (
                      <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold">
                        Escalation Requested
                      </span>
                    )}
                    {c.escalation_status === 'resolved' && (
                      <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
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
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col overflow-hidden">
          {selectedConv ? (
            <>
              {/* Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
                <div>
                  <div className="font-bold text-xs text-slate-900">
                    Session: {selectedConv.session_id}
                  </div>
                  <div className="text-[10px] text-slate-500">
                    Started on {new Date(selectedConv.created_at).toLocaleString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {selectedConv.escalation_status === 'requested' ? (
                    <button
                      onClick={() => handleUpdateEscalation('resolved')}
                      className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Mark Resolved</span>
                    </button>
                  ) : (
                    <button
                      onClick={() => handleUpdateEscalation('requested')}
                      className="px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                      <span>Escalate to Human</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Messages Transcript */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4 bg-slate-50">
                {loadingMessages ? (
                  <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
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
                            <Bot className="w-3 h-3 text-indigo-600" />
                            <span>AI Support Agent</span>
                          </>
                        )}
                      </div>

                      <div
                        className={`p-4 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                          m.role === 'user'
                            ? 'bg-indigo-600 text-white rounded-tr-none shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none shadow-2xs'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{m.content}</p>

                        {/* Citations */}
                        {m.sources && m.sources.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-slate-100 flex flex-wrap gap-1.5">
                            {m.sources.map((s, idx) => (
                              <span
                                key={idx}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold"
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
              <MessageSquare className="w-10 h-10 text-slate-300 mb-2" />
              <p className="text-xs">Select a conversation from the left to view transcript and citations.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

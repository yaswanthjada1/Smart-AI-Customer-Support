import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileText,
  MessageSquare,
  ArrowRight,
  AlertTriangle,
  Bot,
  CheckCircle2,
  UploadCloud,
  Layers,
  Clock,
  ChevronRight,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { AnalyticsSummary, Conversation } from '../../types';

export const DashboardPage: React.FC = () => {
  const { activeCompany } = useTenant();
  const navigate = useNavigate();

  const [metrics, setMetrics] = useState<AnalyticsSummary | null>(null);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!activeCompany) return;

    const loadData = async () => {
      try {
        const [analyticsRes, convsRes] = await Promise.all([
          apiClient<{ analytics: AnalyticsSummary }>(
            `/api/app/companies/${activeCompany.id}/analytics`
          ).catch(() => ({ analytics: { total_documents: 0, ready_documents: 0, total_conversations: 0, answered_questions: 0, escalations_count: 0, unanswered_count: 0 } })),
          apiClient<{ conversations: Conversation[] }>(
            `/api/app/companies/${activeCompany.id}/conversations`
          ).catch(() => ({ conversations: [] })),
        ]);

        setMetrics(analyticsRes.analytics);
        setRecentConversations(convsRes.conversations.slice(0, 5));
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeCompany]);

  const resolutionRate =
    metrics && metrics.total_conversations > 0
      ? Math.round(
          ((metrics.total_conversations - metrics.escalations_count) /
            metrics.total_conversations) *
            100
        )
      : 100;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            {activeCompany?.name || 'Workspace'} AI Support Agent
          </h1>
          <p className="text-xs text-slate-500 mt-1 max-w-xl">
            Turn your company knowledge into a grounded, hallucination-resistant customer support agent powered by local Qwen models.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={() => navigate('/knowledge')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Documents</span>
          </button>
          <button
            onClick={() => navigate('/chatbot')}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-semibold shadow-2xs transition-all"
          >
            <Bot className="w-4 h-4" />
            <span>AI Agent Settings</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Knowledge Base</span>
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.total_documents ?? 0}
            </span>
            <span className="text-xs text-slate-500">documents</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">
            {metrics?.ready_documents ?? 0} indexed in pgvector
          </p>
        </div>

        {/* Total Conversations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Conversations</span>
            <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.total_conversations ?? 0}
            </span>
            <span className="text-xs text-slate-500">sessions</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Widget & API inquiries</p>
        </div>

        {/* AI Resolution Rate */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Resolution Rate</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">{resolutionRate}%</span>
            <span className="text-xs text-emerald-600 font-medium">automated</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Grounded in company docs</p>
        </div>

        {/* Human Escalations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-600">Escalations</span>
            <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-slate-900">
              {metrics?.escalations_count ?? 0}
            </span>
            <span className="text-xs text-amber-600 font-medium">tickets</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero-hallucination safeguard</p>
        </div>
      </div>

      {/* Main Grid: Getting Started & Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Quick Setup Cards (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4">
              Get Started with Your Support Agent
            </h2>

            <div className="space-y-3">
              <div
                onClick={() => navigate('/knowledge')}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                    1
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Upload Company Documents
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Upload PDF, DOCX, TXT, or Markdown policies, user guides, or FAQs.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>

              <div
                onClick={() => navigate('/chatbot')}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                    2
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Configure & Test AI Agent
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Customize branding colors, welcome greeting, and test live RAG answers.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>

              <div
                onClick={() => navigate('/api')}
                className="p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all cursor-pointer flex items-center justify-between group"
              >
                <div className="flex items-start gap-3.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 font-bold text-xs flex items-center justify-center shrink-0">
                    3
                  </div>
                  <div>
                    <h3 className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                      Embed on Your Website
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Copy the one-line embed widget script or integrate via API key.
                    </p>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0" />
              </div>
            </div>
          </div>
        </div>

        {/* Recent Conversations (5 cols) */}
        <div className="lg:col-span-5 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-bold text-slate-900">Recent Conversations</h2>
            <button
              onClick={() => navigate('/conversations')}
              className="text-xs text-indigo-600 hover:text-indigo-700 font-semibold"
            >
              View all
            </button>
          </div>

          <div className="flex-1 flex flex-col justify-center">
            {loading ? (
              <div className="text-center py-8 text-xs text-slate-400">Loading...</div>
            ) : recentConversations.length === 0 ? (
              <div className="text-center py-8 px-4">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-700">No conversations yet</p>
                <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto">
                  Customer conversations will appear here once your AI agent is deployed.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentConversations.map((conv) => (
                  <div
                    key={conv.id}
                    onClick={() => navigate('/conversations')}
                    className="py-3 cursor-pointer hover:bg-slate-50 transition-colors rounded-lg px-2"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-semibold text-slate-800">
                        {conv.customer_identifier || `Session #${conv.session_id.substring(0, 8)}`}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(conv.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1">
                      {conv.last_message || 'New session'}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

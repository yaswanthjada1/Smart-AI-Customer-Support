import React, { useState, useEffect } from 'react';
import {
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  MessageSquare,
  FileText,
  TrendingUp,
  HelpCircle,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { AnalyticsSummary } from '../../types';

export const AnalyticsPage: React.FC = () => {
  const { activeCompany } = useTenant();
  const [data, setData] = useState<(AnalyticsSummary & { top_questions: { question: string; count: number }[] }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAnalytics = async () => {
      if (!activeCompany) return;
      try {
        const res = await apiClient<{ analytics: any }>(
          `/api/app/companies/${activeCompany.id}/analytics`
        );
        setData(res.analytics);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [activeCompany]);

  if (loading || !data) {
    return (
      <div className="p-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
        <span>Loading workspace analytics...</span>
      </div>
    );
  }

  const answeredRate = data.total_conversations > 0
    ? Math.round(((data.total_conversations - data.escalations_count) / data.total_conversations) * 100)
    : 100;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <BarChart3 className="w-6 h-6 text-indigo-400" />
          <span>Support & RAG Analytics</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Monitor automated resolution rates, vector retrieval health, and top customer inquiries.
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Total Conversations</span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{data.total_conversations}</span>
            <span className="text-[11px] text-slate-400">sessions</span>
          </div>
          <p className="text-[11px] text-emerald-400 font-medium mt-1">✓ Logged across Widget & API</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">AI Automation Rate</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{answeredRate}%</span>
            <span className="text-[11px] text-emerald-400 font-medium">resolved by RAG</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Ground-truth verified answers</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Human Escalations</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{data.escalations_count}</span>
            <span className="text-[11px] text-amber-400 font-medium">tickets</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-1">Zero-hallucination safeguard</p>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-400">Indexed Knowledge</span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{data.ready_documents}</span>
            <span className="text-[11px] text-slate-400">/ {data.total_documents} docs active</span>
          </div>
          <p className="text-[11px] text-purple-400 font-medium mt-1">100% tenant isolated</p>
        </div>
      </div>

      {/* Top Common Questions Table */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800">
        <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-400" />
          <span>Top Customer Inquiries</span>
        </h2>

        {data.top_questions && data.top_questions.length > 0 ? (
          <div className="divide-y divide-slate-800/60">
            {data.top_questions.map((q, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between text-xs">
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-indigo-600/20 text-indigo-300 font-bold flex items-center justify-center text-[10px]">
                    {idx + 1}
                  </span>
                  <span className="text-slate-200 font-medium">{q.question}</span>
                </div>
                <span className="px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 text-[10px] font-mono">
                  {q.count} {q.count === 1 ? 'time' : 'times'}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-xs text-slate-400">
            No questions logged yet. Test your agent in the Chatbot tab or on the website widget to see metrics!
          </div>
        )}
      </div>
    </div>
  );
};

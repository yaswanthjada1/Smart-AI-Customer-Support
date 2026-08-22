import React, { useState, useEffect } from 'react';
import {
  Bot,
  Palette,
  Sparkles,
  Send,
  Code,
  Copy,
  Check,
  ExternalLink,
  Terminal,
  ShieldCheck,
  AlertTriangle,
  FileText,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { ChatbotConfig, SourceCitation } from '../../types';

interface TestMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: SourceCitation[];
  evidence_quality?: 'HIGH' | 'MEDIUM' | 'LOW';
  escalation_required?: boolean;
  debug_info?: any;
}

export const ChatbotPage: React.FC = () => {
  const { activeCompany } = useTenant();
  const [config, setConfig] = useState<ChatbotConfig | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);

  // Live Test Chat state
  const [messages, setMessages] = useState<TestMessage[]>([]);
  const [inputQuestion, setInputQuestion] = useState('');
  const [testing, setTesting] = useState(false);
  const [debugPanelOpen, setDebugPanelOpen] = useState(false);
  const [activeDebugInfo, setActiveDebugInfo] = useState<any>(null);

  const fetchConfig = async () => {
    if (!activeCompany) return;
    try {
      const res = await apiClient<{ config: ChatbotConfig }>(
        `/api/app/companies/${activeCompany.id}/chatbot/config`
      );
      setConfig(res.config);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingConfig(false);
    }
  };

  useEffect(() => {
    fetchConfig();
  }, [activeCompany]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany || !config) return;
    setSaving(true);
    try {
      const res = await apiClient<{ config: ChatbotConfig }>(
        `/api/app/companies/${activeCompany.id}/chatbot/config`,
        {
          method: 'PATCH',
          body: {
            bot_name: config.bot_name,
            welcome_message: config.welcome_message,
            primary_color: config.primary_color,
            logo_url: config.logo_url,
          },
        }
      );
      setConfig(res.config);
    } catch (err) {
      console.error(err);
    } finally {
      setSaving(false);
    }
  };

  const handleSendTestMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuestion.trim() || !activeCompany) return;

    const question = inputQuestion.trim();
    setInputQuestion('');
    setMessages((prev) => [...prev, { role: 'user', content: question }]);
    setTesting(true);

    try {
      const res = await apiClient<{
        answer: string;
        sources: SourceCitation[];
        evidence_quality: 'HIGH' | 'MEDIUM' | 'LOW';
        escalation_required: boolean;
        debug_info?: any;
      }>(`/api/app/companies/${activeCompany.id}/chatbot/test`, {
        method: 'POST',
        body: { question },
      });

      const assistantMsg: TestMessage = {
        role: 'assistant',
        content: res.answer,
        sources: res.sources,
        evidence_quality: res.evidence_quality,
        escalation_required: res.escalation_required,
        debug_info: res.debug_info,
      };

      setMessages((prev) => [...prev, assistantMsg]);
      if (res.debug_info) {
        setActiveDebugInfo(res.debug_info);
      }
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error communicating with RAG engine: ' + (err.message || 'Unknown error'),
        },
      ]);
    } finally {
      setTesting(false);
    }
  };

  const embedScriptCode = activeCompany
    ? `<script\n  src="${window.location.origin}/widget.js"\n  data-company-id="${activeCompany.id}">\n</script>`
    : '';

  const copyEmbedCode = () => {
    navigator.clipboard.writeText(embedScriptCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const colorPresets = ['#4f46e5', '#2563eb', '#0891b2', '#059669', '#d97706', '#dc2626', '#7c3aed'];

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Bot className="w-6 h-6 text-indigo-400" />
            <span>Chatbot Customizer & Live Test</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Customize branding, test real RAG answers with citations, inspect vector retrieval, and copy website embed code.
          </p>
        </div>

        <a
          href={`/demo.html?companyId=${activeCompany?.id || ''}`}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-indigo-300 text-xs font-semibold shadow-md transition-all self-start md:self-auto"
        >
          <ExternalLink className="w-4 h-4" />
          <span>Launch External Demo Website</span>
        </a>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Branding Settings & Embed Code (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customizer Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <h2 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-400" />
              <span>Branding & Appearance</span>
            </h2>

            {loadingConfig || !config ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading configuration...</div>
            ) : (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Bot Name</label>
                  <input
                    type="text"
                    value={config.bot_name}
                    onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Welcome Message</label>
                  <textarea
                    rows={2}
                    value={config.welcome_message}
                    onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">Primary Brand Color</label>
                  <div className="flex items-center gap-2 mb-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfig({ ...config, primary_color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          config.primary_color === c ? 'scale-125 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="w-full px-3 py-1.5 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={config.logo_url || ''}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    placeholder="https://company.com/logo.png"
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Appearance'}
                </button>
              </form>
            )}
          </div>

          {/* Website Embed Code Card */}
          <div className="glass-panel p-6 rounded-3xl border border-slate-800">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-white flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-400" />
                <span>Website Embed Script</span>
              </h2>
              <button
                onClick={copyEmbedCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-750 text-indigo-300 text-xs font-medium border border-slate-700 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied!' : 'Copy Code'}</span>
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mb-3">
              Paste this snippet right before the closing <code className="text-indigo-300">&lt;/body&gt;</code> tag on any website:
            </p>
            <pre className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
              {embedScriptCode}
            </pre>
          </div>
        </div>

        {/* Right Column: Live Production RAG Test Chat & Developer Panel (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] glass-panel rounded-3xl border border-slate-800 overflow-hidden shadow-2xl">
          {/* Chat Header */}
          <div
            style={{ backgroundColor: config?.primary_color || '#4f46e5' }}
            className="p-4 text-white flex items-center justify-between shadow-md transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{config?.bot_name || 'Support Assistant'}</div>
                <div className="text-[10px] opacity-85 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                  <span>Live Production RAG Agent</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setDebugPanelOpen(!debugPanelOpen)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  debugPanelOpen ? 'bg-white text-indigo-900 shadow-sm' : 'bg-white/20 hover:bg-white/30 text-white'
                }`}
              >
                <Terminal className="w-3.5 h-3.5" />
                <span>Dev Inspector</span>
              </button>
              <button
                onClick={() => setMessages([])}
                title="Clear test chat"
                className="p-1 rounded-lg hover:bg-white/20 text-white transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Chat Content & Split Developer Drawer */}
          <div className="flex-1 flex overflow-hidden">
            {/* Messages Area */}
            <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-950/60">
              {messages.length === 0 ? (
                <div className="space-y-4">
                  <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 max-w-[85%] text-xs text-slate-200 leading-relaxed">
                    {config?.welcome_message || 'Hello! How can I help you today?'}
                  </div>

                  <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-500/20 text-xs">
                    <p className="font-semibold text-indigo-300 mb-2 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Try asking these sample customer queries:</span>
                    </p>
                    <div className="flex flex-col gap-1.5">
                      <button
                        onClick={() => {
                          setInputQuestion('Can I return my headphones after 20 days?');
                        }}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors"
                      >
                        👉 "Can I return my headphones after 20 days?"
                      </button>
                      <button
                        onClick={() => {
                          setInputQuestion('What is covered under the 1-year warranty?');
                        }}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors"
                      >
                        👉 "What is covered under the 1-year warranty?"
                      </button>
                      <button
                        onClick={() => {
                          setInputQuestion('Do you sell electric skateboards and golf carts?');
                        }}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-slate-900/80 hover:bg-slate-800 text-[11px] text-slate-300 transition-colors"
                      >
                        👉 "Do you sell electric skateboards and golf carts?" (Tests Hallucination Refusal)
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                messages.map((m, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      style={{
                        backgroundColor: m.role === 'user' ? (config?.primary_color || '#4f46e5') : '#1e293b',
                      }}
                      className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                        m.role === 'user'
                          ? 'text-white rounded-tr-none'
                          : 'text-slate-200 border border-slate-750 rounded-tl-none'
                      }`}
                    >
                      <p className="whitespace-pre-wrap">{m.content}</p>

                      {/* Source Citations */}
                      {m.sources && m.sources.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-slate-700/60 flex flex-wrap gap-1.5">
                          {m.sources.map((s, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 text-[10px] font-semibold"
                            >
                              <FileText className="w-3 h-3" />
                              <span>{s.document}{s.page ? ` (p.${s.page})` : ''}</span>
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Escalation Pill */}
                      {m.escalation_required && (
                        <div className="mt-3 p-2 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>Human Escalation Suggested</span>
                          </span>
                          <span className="font-bold underline cursor-pointer">Support Ticket</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {testing && (
                <div className="flex items-center gap-2 text-xs text-indigo-300 p-3 rounded-2xl bg-slate-900/80 border border-slate-800 w-fit animate-pulse">
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Searching pgvector knowledge base & generating answer...</span>
                </div>
              )}
            </div>

            {/* Developer Inspection Drawer */}
            {debugPanelOpen && (
              <div className="w-72 bg-slate-900 border-l border-slate-800 p-4 overflow-y-auto space-y-4 text-xs animate-in slide-in-from-right">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="font-bold text-white flex items-center gap-1.5">
                    <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                    <span>RAG Inspector</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">Tenant #{activeCompany?.name}</span>
                </div>

                {!activeDebugInfo ? (
                  <p className="text-[11px] text-slate-400 py-4 text-center">
                    Send a test query to inspect retrieved vector chunks and cosine similarity scores.
                  </p>
                ) : (
                  <div className="space-y-3">
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                      <div className="text-[10px] font-semibold text-slate-400 uppercase">Top Similarity</div>
                      <div className="text-sm font-mono font-bold text-emerald-400">
                        {activeDebugInfo.top_similarity} / 1.0000
                      </div>
                      <div className="text-[10px] text-slate-500">
                        Chunks retrieved: {activeDebugInfo.retrieved_chunks_count}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="text-[10px] font-semibold uppercase text-slate-400">Retrieved Chunks:</div>
                      {activeDebugInfo.chunks?.map((c: any, cIdx: number) => (
                        <div key={cIdx} className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 text-[10px]">
                          <div className="flex items-center justify-between font-bold text-indigo-300 mb-1">
                            <span>{c.document_name}</span>
                            <span className="font-mono text-emerald-400">{c.similarity}</span>
                          </div>
                          <p className="text-slate-300 leading-tight line-clamp-3 font-sans">{c.content}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendTestMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a customer support question..."
              className="flex-1 px-4 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            <button
              type="submit"
              disabled={testing || !inputQuestion.trim()}
              style={{ backgroundColor: config?.primary_color || '#4f46e5' }}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-md transition-all disabled:opacity-40 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

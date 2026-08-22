import React, { useState, useEffect } from 'react';
import {
  Bot,
  Palette,
  Send,
  Code,
  Copy,
  Check,
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
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'Error communicating with AI engine: ' + (err.message || 'Unknown error'),
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
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Bot className="w-6 h-6 text-indigo-600" />
          <span>AI Agent Configuration & Preview</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Customize your assistant's branding, test responses with citations, and embed on your website.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Branding Settings & Embed Code (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Customizer Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-sm font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Palette className="w-4 h-4 text-indigo-600" />
              <span>Appearance & Branding</span>
            </h2>

            {loadingConfig || !config ? (
              <div className="py-8 text-center text-xs text-slate-400">Loading configuration...</div>
            ) : (
              <form onSubmit={handleSaveConfig} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Bot Name</label>
                  <input
                    type="text"
                    value={config.bot_name}
                    onChange={(e) => setConfig({ ...config, bot_name: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Welcome Message</label>
                  <textarea
                    rows={2}
                    value={config.welcome_message}
                    onChange={(e) => setConfig({ ...config, welcome_message: e.target.value })}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Primary Brand Color</label>
                  <div className="flex items-center gap-2 mb-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setConfig({ ...config, primary_color: c })}
                        style={{ backgroundColor: c }}
                        className={`w-6 h-6 rounded-full transition-transform ${
                          config.primary_color === c ? 'scale-125 ring-2 ring-indigo-600 ring-offset-2' : 'hover:scale-110'
                        }`}
                      />
                    ))}
                  </div>
                  <input
                    type="text"
                    value={config.primary_color}
                    onChange={(e) => setConfig({ ...config, primary_color: e.target.value })}
                    className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Logo URL (Optional)</label>
                  <input
                    type="url"
                    value={config.logo_url || ''}
                    onChange={(e) => setConfig({ ...config, logo_url: e.target.value })}
                    placeholder="https://company.com/logo.png"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                >
                  {saving ? 'Saving...' : 'Save Appearance'}
                </button>
              </form>
            )}
          </div>

          {/* Website Embed Code Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Code className="w-4 h-4 text-indigo-600" />
                <span>Website Embed Script</span>
              </h2>
              <button
                onClick={copyEmbedCode}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium border border-slate-300 transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Copied' : 'Copy Code'}</span>
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Paste this snippet right before the closing <code className="text-indigo-600 font-mono">&lt;/body&gt;</code> tag on any webpage:
            </p>
            <pre className="p-3.5 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto">
              {embedScriptCode}
            </pre>
          </div>
        </div>

        {/* Right Column: Live RAG Preview (7 cols) */}
        <div className="lg:col-span-7 flex flex-col h-[650px] bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {/* Chat Header */}
          <div
            style={{ backgroundColor: config?.primary_color || '#4f46e5' }}
            className="p-4 text-white flex items-center justify-between shadow-sm transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center font-bold text-sm">
                <Bot className="w-5 h-5" />
              </div>
              <div>
                <div className="font-bold text-sm">{config?.bot_name || 'Support Assistant'}</div>
                <div className="text-[10px] opacity-90 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-300"></span>
                  <span>AI Agent Preview</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setMessages([])}
              title="Clear preview messages"
              className="p-1.5 rounded-lg hover:bg-white/20 text-white transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 p-5 overflow-y-auto space-y-4 bg-slate-50">
            {messages.length === 0 ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-2xl bg-white border border-slate-200 max-w-[85%] text-xs text-slate-800 leading-relaxed shadow-2xs">
                  {config?.welcome_message || 'Hello! How can I help you today?'}
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
                      backgroundColor: m.role === 'user' ? (config?.primary_color || '#4f46e5') : '#ffffff',
                    }}
                    className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'text-white rounded-tr-none shadow-xs'
                        : 'text-slate-800 border border-slate-200 rounded-tl-none shadow-2xs'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>

                    {/* Source Citations */}
                    {m.sources && m.sources.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-200 flex flex-wrap gap-1.5">
                        {m.sources.map((s, sIdx) => (
                          <span
                            key={sIdx}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-200 text-[10px] font-semibold"
                          >
                            <FileText className="w-3 h-3" />
                            <span>{s.document}{s.page ? ` (p.${s.page})` : ''}</span>
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Escalation Pill */}
                    {m.escalation_required && (
                      <div className="mt-3 p-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-[11px] flex items-center justify-between">
                        <span className="flex items-center gap-1 font-medium">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Human Escalation Suggested</span>
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}

            {testing && (
              <div className="flex items-center gap-2 text-xs text-indigo-700 p-3 rounded-2xl bg-white border border-slate-200 w-fit shadow-2xs animate-pulse">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching knowledge base & generating answer...</span>
              </div>
            )}
          </div>

          {/* Chat Input */}
          <form onSubmit={handleSendTestMessage} className="p-3 bg-white border-t border-slate-200 flex gap-2">
            <input
              type="text"
              value={inputQuestion}
              onChange={(e) => setInputQuestion(e.target.value)}
              placeholder="Ask a customer support question..."
              className="flex-1 px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
            />
            <button
              type="submit"
              disabled={testing || !inputQuestion.trim()}
              style={{ backgroundColor: config?.primary_color || '#4f46e5' }}
              className="px-4 py-2 rounded-xl text-white text-xs font-semibold shadow-xs transition-all disabled:opacity-40 flex items-center justify-center"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

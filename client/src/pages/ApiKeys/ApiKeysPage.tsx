import React, { useState, useEffect } from 'react';
import {
  Code,
  Copy,
  Check,
  ExternalLink,
  Bot,
  Key,
  Plus,
  Trash2,
  AlertCircle,
  Terminal,
  Layers,
  Sparkles,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { ApiKeyItem } from '../../types';

export const ApiKeysPage: React.FC = () => {
  const { activeCompany } = useTenant();
  const [apiKeys, setApiKeys] = useState<ApiKeyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState('');
  const [createdRawKey, setCreatedRawKey] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [creating, setCreating] = useState(false);
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedRawKey, setCopiedRawKey] = useState(false);

  // Derive environment base URL
  const widgetBaseUrl =
    (import.meta as any).env?.VITE_WIDGET_BASE_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://your-domain.com');

  const companyId = activeCompany?.id || 'COMPANY_ID';
  const embedSnippet = `<!-- AeroRAG AI Customer Support Widget -->\n<script\n  src="${widgetBaseUrl}/widget.js"\n  data-company-id="${companyId}">\n</script>`;
  const publicWidgetUrl = `${widgetBaseUrl}/widget?companyId=${companyId}`;
  const simulationUrl = `/widget-test?companyId=${companyId}`;

  const fetchApiKeys = async () => {
    if (!activeCompany) return;
    try {
      const res = await apiClient<{ api_keys: ApiKeyItem[] }>(
        `/api/app/companies/${activeCompany.id}/api-keys`
      );
      setApiKeys(res.api_keys || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApiKeys();
  }, [activeCompany]);

  const handleCopySnippet = () => {
    navigator.clipboard.writeText(embedSnippet);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(publicWidgetUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim() || !activeCompany) return;

    setCreating(true);
    try {
      const res = await apiClient<{ apiKey: ApiKeyItem; rawKey: string }>(
        `/api/app/companies/${activeCompany.id}/api-keys`,
        {
          method: 'POST',
          body: { name: newKeyName.trim() },
        }
      );
      setCreatedRawKey(res.rawKey);
      setNewKeyName('');
      await fetchApiKeys();
    } catch (err: any) {
      alert(err.message || 'Failed to create API key');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    if (!activeCompany || !confirm('Are you sure you want to revoke this API key?')) return;

    try {
      await apiClient(`/api/app/companies/${activeCompany.id}/api-keys/${keyId}`, {
        method: 'DELETE',
      });
      await fetchApiKeys();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const copyRawKey = () => {
    if (createdRawKey) {
      navigator.clipboard.writeText(createdRawKey);
      setCopiedRawKey(true);
      setTimeout(() => setCopiedRawKey(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Code className="w-6 h-6 text-indigo-600" />
          <span>API & Website Embed</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Deploy your AI customer support assistant to any external website via a 2-line snippet or direct iframe URL.
        </p>
      </div>

      {/* SECTION 1: WEBSITE EMBED */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Embed Code & Links */}
        <div className="lg:col-span-7 space-y-6">
          {/* Embed Script Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                <span>Website Embed Script</span>
              </h2>
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                Production Ready
              </span>
            </div>

            <p className="text-xs text-slate-500">
              Paste this snippet right before the closing <code className="text-indigo-600 bg-indigo-50 px-1 py-0.5 rounded">&lt;/body&gt;</code> tag on any website, Shopify store, or web app:
            </p>

            <div className="relative">
              <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                {embedSnippet}
              </pre>
              <button
                onClick={handleCopySnippet}
                className="absolute right-3 top-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition"
              >
                {copiedSnippet ? (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy Snippet</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Direct Public Link Card */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-indigo-600" />
              <span>Direct Public Chatbot URL</span>
            </h2>

            <p className="text-xs text-slate-500">
              Direct link to your company's dedicated public chatbot. Perfect for iframes, help center links, or email signatures.
            </p>

            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={publicWidgetUrl}
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono text-slate-700 select-all"
              />
              <button
                onClick={handleCopyUrl}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition"
                title="Copy Public URL"
              >
                {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
              </button>
              <a
                href={publicWidgetUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
              >
                <span>Open Chatbot</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-xs text-slate-500 font-medium">
                Want to test on a simulated external customer website?
              </span>
              <a
                href={simulationUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
              >
                <span>Launch Host Store Simulation (/widget-test)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Column: Live Iframe Preview */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Live Widget Preview</h3>
              </div>
              <span className="text-[10px] text-slate-400 font-medium">Rendered via Isolated Iframe</span>
            </div>

            <div className="flex-1 w-full min-h-[480px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
              <iframe
                src={publicWidgetUrl}
                title="AeroRAG Live Widget Preview"
                className="w-full h-full min-h-[480px] border-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: REST API KEYS FOR DEVELOPERS */}
      <div className="pt-6 border-t border-slate-200 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <span>Developer REST API Keys</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Securely query your company RAG knowledge base via backend HTTP endpoints.
            </p>
          </div>

          <button
            onClick={() => {
              setCreatedRawKey(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition"
          >
            <Plus className="w-4 h-4" />
            <span>Create Developer Key</span>
          </button>
        </div>

        {/* API Keys Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Prefix</th>
                  <th className="px-6 py-3.5">Created</th>
                  <th className="px-6 py-3.5">Last Used</th>
                  <th className="px-6 py-3.5">Status</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                      Loading API keys...
                    </td>
                  </tr>
                ) : apiKeys.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                      No developer API keys created yet. The embed widget works out-of-the-box via public session tokens.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{k.name}</td>
                      <td className="px-6 py-4 font-mono text-indigo-600">{k.key_prefix}</td>
                      <td className="px-6 py-4 text-slate-500">
                        {new Date(k.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-slate-500 font-mono text-[11px]">
                        {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never'}
                      </td>
                      <td className="px-6 py-4">
                        {k.revoked_at ? (
                          <span className="px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200 text-[10px] font-bold">
                            Revoked
                          </span>
                        ) : (
                          <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-bold">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {!k.revoked_at && (
                          <button
                            onClick={() => handleRevokeKey(k.id)}
                            className="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs transition-colors font-semibold"
                          >
                            Revoke
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* cURL REST Example */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-bold text-slate-900 flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-600" />
            <span>Developer REST API Endpoint</span>
          </h3>
          <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-[11px] font-mono overflow-x-auto">
            <div className="text-indigo-400 font-bold mb-1"># POST /api/v1/chat</div>
            <div>curl -X POST {widgetBaseUrl}/api/v1/chat \</div>
            <div>&nbsp;&nbsp;-H "Authorization: Bearer sk_live_your_api_key_here" \</div>
            <div>&nbsp;&nbsp;-H "Content-Type: application/json" \</div>
            <div>&nbsp;&nbsp;-d '&#123; "message": "How long do I have to return a product?" &#125;'</div>
          </div>
        </div>
      </div>

      {/* Modal: Create Key */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Create Developer API Key</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Provide a label to identify where this key is used.
            </p>

            {createdRawKey ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Copy this key now.</strong> We store only a SHA-256 hash and you cannot view it again.
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={createdRawKey}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-50 border border-indigo-300 rounded-xl text-xs font-mono text-indigo-700 font-bold"
                  />
                  <button
                    onClick={copyRawKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs transition-colors"
                  >
                    {copiedRawKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Key Label</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Backend Server, iOS App"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50"
                  >
                    {creating ? 'Creating...' : 'Generate Key'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

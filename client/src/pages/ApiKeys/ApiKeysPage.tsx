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
  ShieldCheck,
  FileCode2,
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
  const [activeDocTab, setActiveDocTab] = useState<'javascript' | 'curl' | 'python'>('javascript');

  // Derive public URL from environment or current window origin
  const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
  const envWidgetUrl = (import.meta as any).env?.VITE_WIDGET_BASE_URL;

  const widgetBaseUrl =
    envWidgetUrl && (envWidgetUrl !== 'http://localhost:5173' || isLocalhost)
      ? envWidgetUrl
      : (typeof window !== 'undefined' ? window.location.origin : 'http://localhost:5173');

  const apiPublicUrl =
    (import.meta as any).env?.VITE_API_URL ||
    (typeof window !== 'undefined' ? window.location.origin : 'https://desktop-v52nf2o.tail4f42d7.ts.net');

  const companyId = activeCompany?.id || 'YOUR_COMPANY_ID';
  const embedSnippet = `<script\n  src="${widgetBaseUrl}/widget.js"\n  data-company-id="${companyId}">\n</script>`;
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
    if (!activeCompany || !confirm('Are you sure you want to revoke this API key? This cannot be undone.')) return;

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
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-10">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
          <Code className="w-6 h-6 text-indigo-600" />
          <span>API & Website Embed</span>
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Deploy your AI support chatbot to any website via a 2-line embed script, or integrate directly with the public chat API.
        </p>
      </div>

      {/* ======================================================== */}
      {/* SECTION A: WEBSITE EMBED */}
      {/* ======================================================== */}
      <section className="space-y-4">
        <div className="border-b border-slate-200 pb-2">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-indigo-600" />
            <span>Embed your AI support agent</span>
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Add one script to your website to deploy your AI support chatbot.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Embed Code & Actions */}
          <div className="lg:col-span-7 space-y-4">
            <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">HTML Embed Code</span>
                <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                  Zero Dependencies
                </span>
              </div>

              <div className="relative">
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
                  {embedSnippet}
                </pre>
                <button
                  onClick={handleCopySnippet}
                  className="absolute right-3 top-3 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                >
                  {copiedSnippet ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>

              <div className="pt-2 flex items-center justify-between">
                <span className="text-xs text-slate-500">
                  Test the widget on a simulated customer storefront:
                </span>
                <a
                  href={simulationUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 underline flex items-center gap-1"
                >
                  <span>Launch Host Simulation</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>

            {/* Direct Link Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between gap-4">
              <div>
                <h4 className="text-xs font-bold text-slate-900">Direct Public URL</h4>
                <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-md font-mono">
                  {publicWidgetUrl}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={handleCopyUrl}
                  className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs transition"
                  title="Copy URL"
                >
                  {copiedUrl ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                </button>
                <a
                  href={publicWidgetUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold transition"
                >
                  <span>Open Widget</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Right Column: Live Preview */}
          <div className="lg:col-span-5 flex flex-col">
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-sm font-bold text-slate-900">Live Preview</h3>
                </div>
                <span className="text-[10px] text-slate-400 font-medium">Isolated Iframe</span>
              </div>

              <div className="flex-1 w-full min-h-[460px] rounded-xl overflow-hidden border border-slate-200 shadow-inner bg-slate-50">
                <iframe
                  src={publicWidgetUrl}
                  title="AeroRAG Live Widget Preview"
                  className="w-full h-full min-h-[460px] border-none"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ======================================================== */}
      {/* SECTION B: API ACCESS */}
      {/* ======================================================== */}
      <section className="space-y-6 pt-6 border-t border-slate-200">
        <div className="border-b border-slate-200 pb-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Key className="w-5 h-5 text-indigo-600" />
              <span>API Access</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Integrate AeroRAG directly into your application via standard JSON HTTP requests.
            </p>
          </div>

          <button
            onClick={() => {
              setCreatedRawKey(null);
              setShowModal(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition self-start sm:self-auto cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create API Key</span>
          </button>
        </div>

        {/* Endpoint Banner */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-mono font-bold text-[11px] border border-indigo-200">
              POST
            </span>
            <span className="font-mono text-slate-800 font-semibold">/api/public/chat</span>
          </div>
          <div className="text-slate-500 text-[11px] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>Authenticated via Bearer API Key Header</span>
          </div>
        </div>

        {/* API Keys Table */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="px-6 py-3.5 border-b border-slate-100 text-xs font-bold text-slate-700 uppercase tracking-wider">
            API Keys ({apiKeys.length})
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                <tr>
                  <th className="px-6 py-3.5">Name</th>
                  <th className="px-6 py-3.5">Key Prefix</th>
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
                      No API keys created yet. Click "+ Create API Key" to generate a key.
                    </td>
                  </tr>
                ) : (
                  apiKeys.map((k) => (
                    <tr key={k.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4 font-semibold text-slate-900">{k.name}</td>
                      <td className="px-6 py-4 font-mono text-indigo-600 font-medium">{k.key_prefix}</td>
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
                            className="px-2.5 py-1 rounded-lg text-red-600 hover:bg-red-50 text-xs transition-colors font-semibold cursor-pointer"
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

        {/* API Documentation */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Terminal className="w-4 h-4 text-indigo-600" />
              <span>API Documentation & Examples</span>
            </h3>

            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl">
              {(['javascript', 'curl', 'python'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveDocTab(tab)}
                  className={`px-3 py-1 text-xs font-semibold rounded-lg capitalize transition cursor-pointer ${
                    activeDocTab === tab
                      ? 'bg-white text-indigo-600 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'curl' ? 'cURL' : tab === 'javascript' ? 'JavaScript' : 'Python'}
                </button>
              ))}
            </div>
          </div>

          {activeDocTab === 'javascript' && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`const response = await fetch("${apiPublicUrl}/api/public/chat", {
  method: "POST",
  headers: {
    "Authorization": "Bearer ar_live_xxxxxxxxxxxxxxxx",
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    message: "What is your return policy?",
    sessionId: "customer-123"
  })
});

const data = await response.json();
console.log(data.answer);
console.log(data.sources);`}</pre>
            </div>
          )}

          {activeDocTab === 'curl' && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`curl -X POST ${apiPublicUrl}/api/public/chat \\
  -H "Authorization: Bearer ar_live_xxxxxxxxxxxxxxxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "message": "What is your return policy?",
    "sessionId": "customer-123"
  }'`}</pre>
            </div>
          )}

          {activeDocTab === 'python' && (
            <div className="p-4 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto leading-relaxed border border-slate-800">
              <pre>{`import requests

url = "${apiPublicUrl}/api/public/chat"
headers = {
    "Authorization": "Bearer ar_live_xxxxxxxxxxxxxxxx",
    "Content-Type": "application/json"
}
payload = {
    "message": "What is your return policy?",
    "sessionId": "customer-123"
}

response = requests.post(url, headers=headers, json=payload)
data = response.json()
print("Answer:", data.get("answer"))
print("Sources:", data.get("sources"))`}</pre>
            </div>
          )}
        </div>
      </section>

      {/* Modal: Create API Key */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl max-w-md w-full p-6 shadow-xl">
            <h3 className="text-base font-bold text-slate-900 mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-600" />
              <span>Create API Key</span>
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Enter a name for your API key to identify where it is used.
            </p>

            {createdRawKey ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-600" />
                  <span>
                    <strong>Copy this key now.</strong> This key will only be shown once. For security, we store only its cryptographic hash.
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
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs transition-colors cursor-pointer"
                  >
                    {copiedRawKey ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all cursor-pointer"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Website"
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-600"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-600 hover:text-slate-900 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition-all disabled:opacity-50 cursor-pointer"
                  >
                    {creating ? 'Creating...' : 'Create'}
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

import React, { useState, useEffect } from 'react';
import {
  Key,
  Plus,
  Trash2,
  Copy,
  Check,
  AlertCircle,
  Terminal,
  ShieldCheck,
  Clock,
  Code2,
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
  const [copied, setCopied] = useState(false);

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
    if (!activeCompany || !confirm('Are you sure you want to revoke this API key? This action is permanent.')) return;

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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Key className="w-6 h-6 text-indigo-400" />
            <span>Business API Keys</span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Authenticate your backend services or custom mobile apps to the AeroRAG REST API.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatedRawKey(null);
            setShowModal(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all self-start md:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New API Key</span>
        </button>
      </div>

      {/* API Keys Table */}
      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-800 text-xs font-bold text-white uppercase tracking-wider">
          Active API Keys ({apiKeys.length})
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/60 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="px-6 py-3.5">Name</th>
                <th className="px-6 py-3.5">Key Prefix</th>
                <th className="px-6 py-3.5">Created</th>
                <th className="px-6 py-3.5">Last Used</th>
                <th className="px-6 py-3.5">Status</th>
                <th className="px-6 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    Loading API keys...
                  </td>
                </tr>
              ) : apiKeys.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-slate-400">
                    No API keys created yet. Click "Create New API Key" above to generate your first key.
                  </td>
                </tr>
              ) : (
                apiKeys.map((k) => (
                  <tr key={k.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 font-semibold text-white">{k.name}</td>
                    <td className="px-6 py-4 font-mono text-indigo-300">{k.key_prefix}</td>
                    <td className="px-6 py-4 text-slate-400">
                      {new Date(k.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono text-[11px]">
                      {k.last_used_at ? new Date(k.last_used_at).toLocaleString() : 'Never used'}
                    </td>
                    <td className="px-6 py-4">
                      {k.revoked_at ? (
                        <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-400 text-[10px] font-bold">
                          Revoked
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                          Active
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      {!k.revoked_at && (
                        <button
                          onClick={() => handleRevokeKey(k.id)}
                          className="px-2.5 py-1 rounded-lg text-red-400 hover:bg-red-500/10 text-xs transition-colors font-medium"
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

      {/* Interactive REST API Documentation */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-indigo-400" />
          <span>Business API Quickstart & cURL Example</span>
        </h2>
        <p className="text-xs text-slate-400">
          Send customer messages from your custom backend or mobile application using standard HTTP:
        </p>

        <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto">
          <div className="text-indigo-400 font-bold mb-2"># Execute RAG query via Business API:</div>
          <div>curl -X POST {window.location.origin}/api/v1/chat \</div>
          <div>&nbsp;&nbsp;-H "Authorization: Bearer sk_live_your_api_key_here" \</div>
          <div>&nbsp;&nbsp;-H "Content-Type: application/json" \</div>
          <div>&nbsp;&nbsp;-d '&#123; "message": "Can I return my headphones after 20 days?" &#125;'</div>
        </div>
      </div>

      {/* Create Key Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl animate-in fade-in zoom-in-95">
            <h3 className="text-base font-bold text-white mb-1 flex items-center gap-2">
              <Key className="w-4 h-4 text-indigo-400" />
              <span>Create New API Key</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              Give your key a descriptive name to identify its integration.
            </p>

            {createdRawKey ? (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                  <span>
                    <strong>Please copy this key now.</strong> For security, we only store a cryptographic hash and you will not be able to view it again.
                  </span>
                </div>

                <div className="relative">
                  <input
                    type="text"
                    readOnly
                    value={createdRawKey}
                    className="w-full pl-3 pr-10 py-2.5 bg-slate-950 border border-indigo-500/40 rounded-xl text-xs font-mono text-indigo-300 font-bold"
                  />
                  <button
                    onClick={copyRawKey}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateKey} className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Key Name</label>
                  <input
                    type="text"
                    required
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    placeholder="e.g. Production Backend, Mobile App"
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-750 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded-xl text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
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

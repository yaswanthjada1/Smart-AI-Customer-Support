import React, { useState, useEffect } from 'react';
import {
  Settings,
  Building2,
  Users,
  ShieldCheck,
  Globe,
  Image as ImageIcon,
  Save,
  CheckCircle2,
} from 'lucide-react';
import { useTenant } from '../../contexts/TenantContext';
import { apiClient } from '../../api/client';
import { CompanyMember } from '../../types';

export const SettingsPage: React.FC = () => {
  const { activeCompany, refreshCompanies } = useTenant();
  const [members, setMembers] = useState<CompanyMember[]>([]);
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (activeCompany) {
      setName(activeCompany.name);
      setWebsite(activeCompany.website || '');
      setLogoUrl(activeCompany.logo_url || '');

      apiClient<{ members: CompanyMember[] }>(
        `/api/app/companies/${activeCompany.id}/members`
      )
        .then((res) => setMembers(res.members || []))
        .catch(console.error);
    }
  }, [activeCompany]);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeCompany) return;
    setSaving(true);
    setSuccess(false);

    try {
      await apiClient(`/api/app/companies/${activeCompany.id}`, {
        method: 'PATCH',
        body: {
          name: name.trim(),
          website: website.trim() || undefined,
          logo_url: logoUrl.trim() || undefined,
        },
      });
      await refreshCompanies();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err: any) {
      alert(err.message || 'Failed to update company settings.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto w-full space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
          <Settings className="w-6 h-6 text-indigo-400" />
          <span>Workspace Settings</span>
        </h1>
        <p className="text-xs text-slate-400 mt-1">
          Manage your company profile, tenant parameters, and team access.
        </p>
      </div>

      {/* Company Profile Form */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-6">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Building2 className="w-4 h-4 text-indigo-400" />
          <span>Company Profile</span>
        </h2>

        {success && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Workspace profile updated successfully.</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 max-w-xl">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Company Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Website URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <Globe className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://company.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Logo URL</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                <ImageIcon className="w-4 h-4" />
              </div>
              <input
                type="url"
                value={logoUrl}
                onChange={(e) => setLogoUrl(e.target.value)}
                placeholder="https://company.com/logo.png"
                className="w-full pl-9 pr-3 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/30 transition-all disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save Changes'}</span>
          </button>
        </form>
      </div>

      {/* Team Members List */}
      <div className="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span>Team Members & Roles</span>
        </h2>

        <div className="divide-y divide-slate-800/60">
          {members.map((m) => (
            <div key={m.id} className="py-3 flex items-center justify-between text-xs">
              <div>
                <div className="font-semibold text-white">{m.display_name || 'Member'}</div>
                <div className="text-[11px] text-slate-400">{m.email}</div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                {m.role}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

import React, { useState } from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Bot,
  MessageSquare,
  Key,
  Settings,
  LogOut,
  Building2,
  ChevronDown,
  Plus,
  Menu,
  X,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';

export const AppLayout: React.FC = () => {
  const { currentUser, signOut } = useAuth();
  const { activeCompany, companies, switchCompany } = useTenant();
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard },
    { label: 'Knowledge Base', path: '/knowledge', icon: FileText },
    { label: 'AI Agent', path: '/chatbot', icon: Bot },
    { label: 'Conversations', path: '/conversations', icon: MessageSquare },
    { label: 'API & Embed', path: '/api', icon: Key },
    { label: 'Settings', path: '/settings', icon: Settings },
  ];

  const handleLogout = async () => {
    await signOut();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row text-slate-900 font-sans">
      {/* Mobile Top Bar */}
      <div className="md:hidden flex items-center justify-between p-4 bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-bold text-white shadow-sm">
            <Bot className="w-5 h-5" />
          </div>
          <span className="font-bold text-base tracking-tight text-slate-900">
            AeroRAG
          </span>
        </div>
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-slate-100 text-slate-600 hover:text-slate-900"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Left Sidebar */}
      <aside
        className={`fixed md:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200 flex flex-col z-30 transition-transform duration-200 ease-in-out ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="p-5 flex items-center justify-between border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight text-slate-900 flex items-center gap-1.5">
                AeroRAG
              </div>
              <p className="text-xs text-slate-500 font-medium">AI Customer Support</p>
            </div>
          </div>
        </div>

        {/* Workspace Switcher */}
        <div className="p-3 border-b border-slate-100 relative">
          <button
            onClick={() => setCompanyDropdownOpen(!companyDropdownOpen)}
            className="w-full flex items-center justify-between p-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 transition-all text-left group"
          >
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-lg bg-indigo-100 border border-indigo-200 flex items-center justify-center text-indigo-700 font-bold text-xs shrink-0">
                {activeCompany?.name ? activeCompany.name.substring(0, 2).toUpperCase() : <Building2 className="w-4 h-4" />}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-900 truncate">
                  {activeCompany?.name || 'Select Workspace'}
                </p>
                <p className="text-[10px] text-slate-500 truncate capitalize font-medium">
                  {activeCompany?.role || 'Company Workspace'}
                </p>
              </div>
            </div>
            <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 group-hover:text-slate-600" />
          </button>

          {/* Company Switcher Dropdown */}
          {companyDropdownOpen && (
            <div className="absolute top-full left-3 right-3 mt-1.5 py-1.5 bg-white border border-slate-200 rounded-xl shadow-lg z-50 animate-in fade-in zoom-in-95">
              <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Switch Workspace
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {companies.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => {
                      switchCompany(c.id);
                      setCompanyDropdownOpen(false);
                    }}
                    className={`w-full px-3 py-2 text-left flex items-center justify-between text-xs transition-colors ${
                      activeCompany?.id === c.id
                        ? 'bg-indigo-50 text-indigo-700 font-semibold'
                        : 'text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="truncate">{c.name}</span>
                    {activeCompany?.id === c.id && (
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600"></span>
                    )}
                  </button>
                ))}
              </div>
              <div className="border-t border-slate-100 pt-1 mt-1">
                <button
                  onClick={() => {
                    setCompanyDropdownOpen(false);
                    navigate('/onboarding');
                  }}
                  className="w-full px-3 py-2 text-left flex items-center gap-2 text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create new workspace</span>
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Links */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <NavLink
                key={item.path}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                  isActive
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span>{item.label}</span>
              </NavLink>
            );
          })}
        </nav>

        {/* User Profile Footer */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/80 shadow-2xs">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-xs font-bold shrink-0">
                {currentUser?.display_name ? (
                  currentUser.display_name.substring(0, 1).toUpperCase()
                ) : (
                  <UserIcon className="w-4 h-4" />
                )}
              </div>
              <div className="overflow-hidden">
                <p className="text-xs font-semibold text-slate-800 truncate">
                  {currentUser?.display_name || 'My Account'}
                </p>
                <p className="text-[10px] text-slate-500 truncate">{currentUser?.email}</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Log Out"
              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
};

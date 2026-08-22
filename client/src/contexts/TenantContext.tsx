import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';
import { Company, ChatbotConfig } from '../types';

interface TenantContextType {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  tenantLoading: boolean;
  onboardingRequired: boolean;
  switchCompany: (companyId: string) => void;
  createCompany: (data: { name: string; website?: string; logo_url?: string }) => Promise<Company>;
  refreshCompanies: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, token, initialCompanies, loading: authLoading } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [tenantLoading, setTenantLoading] = useState<boolean>(true);

  // Sync initial companies from AuthContext (/api/app/me)
  useEffect(() => {
    if (authLoading) {
      setTenantLoading(true);
      return;
    }

    if (!token || !currentUser) {
      setCompanies([]);
      setActiveCompany(null);
      setTenantLoading(false);
      return;
    }

    // Populate from /api/app/me response
    const comps = initialCompanies || [];
    setCompanies(comps);

    const savedId = localStorage.getItem('active_company_id');
    const found = comps.find((c) => c.id === savedId);

    if (found) {
      setActiveCompany(found);
    } else if (comps.length > 0) {
      setActiveCompany(comps[0]);
      localStorage.setItem('active_company_id', comps[0].id);
    } else {
      setActiveCompany(null);
      localStorage.removeItem('active_company_id');
    }

    setTenantLoading(false);
  }, [authLoading, token, currentUser, initialCompanies]);

  const fetchCompanies = useCallback(async () => {
    if (!token || !currentUser) {
      setCompanies([]);
      setActiveCompany(null);
      setTenantLoading(false);
      return;
    }

    try {
      setTenantLoading(true);
      const res = await apiClient<{ companies: Company[] }>('/api/app/companies');
      const comps = res.companies || [];
      setCompanies(comps);

      const savedId = localStorage.getItem('active_company_id');
      const found = comps.find((c) => c.id === savedId);

      if (found) {
        setActiveCompany(found);
      } else if (comps.length > 0) {
        setActiveCompany(comps[0]);
        localStorage.setItem('active_company_id', comps[0].id);
      } else {
        setActiveCompany(null);
        localStorage.removeItem('active_company_id');
      }
    } catch (err) {
      console.error('[TenantContext] Error fetching companies:', err);
    } finally {
      setTenantLoading(false);
    }
  }, [token, currentUser]);

  const switchCompany = (companyId: string) => {
    const target = companies.find((c) => c.id === companyId);
    if (target) {
      setActiveCompany(target);
      localStorage.setItem('active_company_id', target.id);
    }
  };

  const createCompany = async (data: { name: string; website?: string; logo_url?: string }): Promise<Company> => {
    const res = await apiClient<{ company: Company; chatbotConfig: ChatbotConfig }>('/api/app/companies', {
      method: 'POST',
      body: data,
    });

    const newCompany = res.company;
    setCompanies((prev) => [newCompany, ...prev]);
    setActiveCompany(newCompany);
    localStorage.setItem('active_company_id', newCompany.id);
    return newCompany;
  };

  const overallLoading = authLoading || tenantLoading;
  const onboardingRequired = !overallLoading && !!currentUser && companies.length === 0;

  return (
    <TenantContext.Provider
      value={{
        activeCompany,
        companies,
        loading: overallLoading,
        tenantLoading,
        onboardingRequired,
        switchCompany,
        createCompany,
        refreshCompanies: fetchCompanies,
      }}
    >
      {children}
    </TenantContext.Provider>
  );
};

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within a TenantProvider');
  }
  return context;
}

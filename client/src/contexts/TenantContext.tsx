import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { apiClient } from '../api/client';
import { Company, ChatbotConfig } from '../types';

interface TenantContextType {
  activeCompany: Company | null;
  companies: Company[];
  loading: boolean;
  switchCompany: (companyId: string) => void;
  createCompany: (data: { name: string; website?: string; logo_url?: string }) => Promise<Company>;
  refreshCompanies: () => Promise<void>;
}

const TenantContext = createContext<TenantContextType | undefined>(undefined);

export const TenantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, token } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [activeCompany, setActiveCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCompanies = useCallback(async () => {
    if (!token || !currentUser) {
      setCompanies([]);
      setActiveCompany(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const res = await apiClient<{ companies: Company[] }>('/api/app/companies');
      setCompanies(res.companies || []);

      const savedId = localStorage.getItem('active_company_id');
      const found = res.companies?.find((c) => c.id === savedId);

      if (found) {
        setActiveCompany(found);
      } else if (res.companies && res.companies.length > 0) {
        setActiveCompany(res.companies[0]);
        localStorage.setItem('active_company_id', res.companies[0].id);
      } else {
        setActiveCompany(null);
        localStorage.removeItem('active_company_id');
      }
    } catch (err) {
      console.error('[TenantContext] Error fetching companies:', err);
    } finally {
      setLoading(false);
    }
  }, [token, currentUser]);

  useEffect(() => {
    fetchCompanies();
  }, [fetchCompanies]);

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

  return (
    <TenantContext.Provider
      value={{
        activeCompany,
        companies,
        loading,
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

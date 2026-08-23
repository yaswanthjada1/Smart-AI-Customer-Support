import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  auth,
  googleProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithPopup,
  sendPasswordResetEmail,
  firebaseSignOut,
  onAuthStateChanged,
  FirebaseUser,
} from '../lib/firebase';
import { configureApiClient, apiClient } from '../api/client';
import { User, Company } from '../types';

export interface MeApiResponse {
  user: User;
  companies: (Company & { role?: string })[];
  onboardingRequired: boolean;
}

interface AuthContextType {
  currentUser: User | null;
  firebaseUser: FirebaseUser | null;
  loading: boolean;
  authLoading: boolean;
  userLoading: boolean;
  token: string | null;
  initialCompanies: (Company & { role?: string })[];
  signIn: (email: string, pass: string) => Promise<void>;
  signUp: (email: string, pass: string, displayName?: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  devLogin: (email: string, name?: string) => Promise<void>;
  refreshUserProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [initialCompanies, setInitialCompanies] = useState<(Company & { role?: string })[]>([]);
  const [token, setToken] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(true);
  const [userLoading, setUserLoading] = useState<boolean>(true);

  // Sync token to API client
  useEffect(() => {
    configureApiClient(
      async () => {
        if (token) return token;
        if (firebaseUser) {
          try {
            return await firebaseUser.getIdToken();
          } catch (e) {
            return null;
          }
        }
        return null;
      },
      () => localStorage.getItem('active_company_id')
    );
  }, [token, firebaseUser]);

  const syncBackendUser = useCallback(async (idToken: string): Promise<MeApiResponse | null> => {
    try {
      setUserLoading(true);
      const res = await apiClient<MeApiResponse>('/api/app/me', {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      setCurrentUser(res.user);
      setInitialCompanies(res.companies || []);
      return res;
    } catch (err) {
      console.warn('[AuthContext] Failed to sync backend user from /api/app/me:', err);
      return null;
    } finally {
      setUserLoading(false);
    }
  }, []);

  useEffect(() => {
    // 1. Check if dev token was stored
    const devToken = localStorage.getItem('dev_auth_token');
    const devUid = localStorage.getItem('dev_auth_uid');
    const devEmail = localStorage.getItem('dev_auth_email');

    if (devToken && devUid && devEmail) {
      setToken(devToken);
      syncBackendUser(devToken).finally(() => {
        setAuthLoading(false);
        setUserLoading(false);
      });
      return;
    }

    // 2. Subscribe to Firebase auth state
    try {
      const unsubscribe = onAuthStateChanged(auth, async (fUser) => {
        setFirebaseUser(fUser);
        if (fUser) {
          try {
            const idToken = await fUser.getIdToken();
            setToken(idToken);
            await syncBackendUser(idToken);
          } catch (err) {
            console.error('[AuthContext] Error retrieving Firebase ID token:', err);
          }
        } else {
          setToken(null);
          setCurrentUser(null);
          setInitialCompanies([]);
          setUserLoading(false);
        }
        setAuthLoading(false);
      });

      return () => unsubscribe();
    } catch (e) {
      console.warn('[AuthContext] Firebase Auth listener fallback:', e);
      setAuthLoading(false);
      setUserLoading(false);
    }
  }, [syncBackendUser]);

  const signIn = async (email: string, pass: string) => {
    setAuthLoading(true);
    setUserLoading(true);
    try {
      localStorage.removeItem('dev_auth_token');
      const cred = await signInWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      setFirebaseUser(cred.user);
      await syncBackendUser(idToken);
    } finally {
      setAuthLoading(false);
      setUserLoading(false);
    }
  };

  const signUp = async (email: string, pass: string, displayName?: string) => {
    setAuthLoading(true);
    setUserLoading(true);
    try {
      localStorage.removeItem('dev_auth_token');
      const cred = await createUserWithEmailAndPassword(auth, email, pass);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      setFirebaseUser(cred.user);
      await syncBackendUser(idToken);
    } finally {
      setAuthLoading(false);
      setUserLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setAuthLoading(true);
    setUserLoading(true);
    try {
      localStorage.removeItem('dev_auth_token');
      const cred = await signInWithPopup(auth, googleProvider);
      const idToken = await cred.user.getIdToken();
      setToken(idToken);
      setFirebaseUser(cred.user);
      await syncBackendUser(idToken);
    } finally {
      setAuthLoading(false);
      setUserLoading(false);
    }
  };

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const devLogin = async (email: string, name?: string) => {
    setAuthLoading(true);
    setUserLoading(true);
    try {
      const cleanUid = 'dev-' + email.replace(/[^a-zA-Z0-9]/g, '-').toLowerCase();
      const devToken = `dev-token-${cleanUid}`;
      localStorage.setItem('dev_auth_token', devToken);
      localStorage.setItem('dev_auth_uid', cleanUid);
      localStorage.setItem('dev_auth_email', email);
      localStorage.setItem('dev_auth_name', name || email.split('@')[0]);

      setToken(devToken);
      await syncBackendUser(devToken);
    } finally {
      setAuthLoading(false);
      setUserLoading(false);
    }
  };

  const signOut = async () => {
    localStorage.removeItem('dev_auth_token');
    localStorage.removeItem('dev_auth_uid');
    localStorage.removeItem('dev_auth_email');
    localStorage.removeItem('dev_auth_name');
    localStorage.removeItem('active_company_id');
    setToken(null);
    setCurrentUser(null);
    setFirebaseUser(null);
    setInitialCompanies([]);
    try {
      await firebaseSignOut(auth);
    } catch (e) {
      // Ignore
    }
  };

  const refreshUserProfile = async () => {
    if (token) {
      await syncBackendUser(token);
    }
  };

  const overallLoading = authLoading || userLoading;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        firebaseUser,
        loading: overallLoading,
        authLoading,
        userLoading,
        token,
        initialCompanies,
        signIn,
        signUp,
        signInWithGoogle,
        resetPassword,
        signOut,
        devLogin,
        refreshUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

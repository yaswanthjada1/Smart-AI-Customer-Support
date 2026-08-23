import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { TenantProvider, useTenant } from './contexts/TenantContext';
import { LoadingScreen } from './components/Common/LoadingScreen';
import { AppLayout } from './components/Layout/AppLayout';
import { LoginPage } from './pages/Auth/LoginPage';
import { SignupPage } from './pages/Auth/SignupPage';
import { ForgotPasswordPage } from './pages/Auth/ForgotPasswordPage';
import { OnboardingPage } from './pages/Onboarding/OnboardingPage';
import { DashboardPage } from './pages/Dashboard/DashboardPage';
import { KnowledgePage } from './pages/Knowledge/KnowledgePage';
import { ChatbotPage } from './pages/Chatbot/ChatbotPage';
import { ConversationsPage } from './pages/Conversations/ConversationsPage';
import { AnalyticsPage } from './pages/Analytics/AnalyticsPage';
import { ApiKeysPage } from './pages/ApiKeys/ApiKeysPage';
import { SettingsPage } from './pages/Settings/SettingsPage';
import { WidgetChatPage } from './pages/Widget/WidgetChatPage';
import { WidgetTestPage } from './pages/Widget/WidgetTestPage';

// 1. Guard for unauthenticated visitor auth pages (/login, /signup)
const PublicAuthRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, token, loading: authLoading } = useAuth();
  const { activeCompany, companies, loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return <LoadingScreen message="Checking session..." />;
  }

  // If already authenticated with existing company, go to dashboard
  if (currentUser && token) {
    if (activeCompany || companies.length > 0) {
      return <Navigate to="/dashboard" replace />;
    }
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

// 2. Guard requiring active authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, token, loading: authLoading } = useAuth();
  const { loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return <LoadingScreen message="Verifying session..." />;
  }

  if (!currentUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// 3. Guard for Onboarding page
const OnboardingRoute: React.FC = () => {
  const { currentUser, token, loading: authLoading } = useAuth();
  const { loading: tenantLoading } = useTenant();

  if (authLoading || tenantLoading) {
    return <LoadingScreen message="Verifying workspace..." />;
  }

  if (!currentUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return <OnboardingPage />;
};

// 4. Guard requiring company membership for dashboard/app sections
const WorkspaceRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompany, companies, loading: tenantLoading, onboardingRequired } = useTenant();
  const { loading: authLoading } = useAuth();

  if (authLoading || tenantLoading) {
    return <LoadingScreen message="Loading workspace..." />;
  }

  // If user has no company created yet, redirect to onboarding
  if (onboardingRequired || (!activeCompany && companies.length === 0)) {
    return <Navigate to="/onboarding" replace />;
  }

  return <>{children}</>;
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <TenantProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Unauthenticated Chatbot & Iframe Routes */}
            <Route path="/widget" element={<WidgetChatPage />} />
            <Route path="/widget-test" element={<WidgetTestPage />} />

            {/* Public Auth Routes */}
            <Route
              path="/login"
              element={
                <PublicAuthRoute>
                  <LoginPage />
                </PublicAuthRoute>
              }
            />
            <Route
              path="/signup"
              element={
                <PublicAuthRoute>
                  <SignupPage />
                </PublicAuthRoute>
              }
            />
            <Route
              path="/forgot-password"
              element={
                <PublicAuthRoute>
                  <ForgotPasswordPage />
                </PublicAuthRoute>
              }
            />

            {/* Onboarding Route (Guarded) */}
            <Route path="/onboarding" element={<OnboardingRoute />} />

            {/* Protected Dashboard & App Routes */}
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <WorkspaceRoute>
                    <AppLayout />
                  </WorkspaceRoute>
                </ProtectedRoute>
              }
            >
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="dashboard" element={<DashboardPage />} />
              <Route path="knowledge" element={<KnowledgePage />} />
              <Route path="chatbot" element={<ChatbotPage />} />
              <Route path="agent" element={<ChatbotPage />} />
              <Route path="conversations" element={<ConversationsPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="api" element={<ApiKeysPage />} />
              <Route path="settings" element={<SettingsPage />} />
            </Route>

            {/* Catch-all fallback */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </TenantProvider>
    </AuthProvider>
  );
};

export default App;

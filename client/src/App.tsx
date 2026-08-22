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

// Protected Route wrapper requiring active authentication
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentUser, token, loading } = useAuth();

  if (loading) {
    return <LoadingScreen message="Verifying session..." />;
  }

  if (!currentUser && !token) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

// Workspace Route wrapper ensuring the user has a company workspace created
const WorkspaceRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { activeCompany, companies, loading } = useTenant();

  if (loading) {
    return <LoadingScreen message="Loading workspace..." />;
  }

  // If user has no company created yet, redirect to onboarding
  if (!activeCompany && companies.length === 0) {
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
            {/* Public Auth Routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />

            {/* Protected Onboarding Route */}
            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <OnboardingPage />
                </ProtectedRoute>
              }
            />

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

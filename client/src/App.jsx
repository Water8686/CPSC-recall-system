import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentTitle from './components/DocumentTitle';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import RecallsPage from './pages/RecallsPage';
import RecallDetailPage from './pages/RecallDetailPage';
import ViolationsPage from './pages/ViolationsPage';
import ViolationDetailPage from './pages/ViolationDetailPage';
import ResponsesPage from './pages/ResponsesPage';
import SellerResponsesPage from './pages/SellerResponsesPage';
import InvestigatorAdjudicationsPage from './pages/InvestigatorAdjudicationsPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import { RECALL_PAGE_ROLES, OPERATIONAL_ROLES, VIOLATION_WORKFLOW_ROLES, USER_ROLES, normalizeAppRole } from 'shared';

/** Redirect unauthenticated users to /login; authenticated sellers to /violations; others to /dashboard. */
function DefaultRedirect() {
  const { user, profile, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;
  const role = normalizeAppRole(profile, user?.user_metadata?.role);
  return <Navigate to={role === USER_ROLES.SELLER ? '/violations' : '/dashboard'} replace />;
}

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <DocumentTitle />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes — wrapped in Layout (top bar + tab bar) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route
                path="/analytics"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <AnalyticsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls/:id"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/violations"
                element={
                  <ProtectedRoute allowedRoles={VIOLATION_WORKFLOW_ROLES}>
                    <ViolationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/violations/:id"
                element={
                  <ProtectedRoute allowedRoles={VIOLATION_WORKFLOW_ROLES}>
                    <ViolationDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/responses"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ResponsesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/seller/responses"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.SELLER]}>
                    <SellerResponsesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/investigator/adjudications"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.INVESTIGATOR]}>
                    <InvestigatorAdjudicationsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Default redirect — role-aware */}
            <Route path="*" element={<DefaultRedirect />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

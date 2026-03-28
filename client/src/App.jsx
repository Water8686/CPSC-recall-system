import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentTitle from './components/DocumentTitle';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import ProfilePage from './pages/ProfilePage';
import DashboardPage from './pages/DashboardPage';
import RecallsPage from './pages/RecallsPage';
import ViolationsPage from './pages/ViolationsPage';
import ResponsesPage from './pages/ResponsesPage';
import AdjudicationsPage from './pages/AdjudicationsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminUsersPage from './pages/AdminUsersPage';
import AdminImportPage from './pages/AdminImportPage';
import {
  RECALL_PAGE_ROLES,
  USER_ROLES,
  OPERATIONAL_ROLES,
} from 'shared';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <DocumentTitle />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes — wrapped in Layout (sidebar + topbar) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/profile" element={<ProfilePage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              {/* Sprint 1 — manager only */}
              <Route
                path="/recalls"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/import"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN]}>
                    <AdminImportPage />
                  </ProtectedRoute>
                }
              />
              {/* Sprint 2 — investigators+ (sellers use Dashboard only for these placeholders) */}
              <Route
                path="/violations"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ViolationsPage />
                  </ProtectedRoute>
                }
              />
              {/* Sprint 3 */}
              <Route
                path="/responses"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ResponsesPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/adjudications"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <AdjudicationsPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
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
import ResponsesPage from './pages/ResponsesPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import { RECALL_PAGE_ROLES, OPERATIONAL_ROLES } from 'shared';

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
              <Route path="/analytics" element={<AnalyticsPage />} />
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
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ViolationsPage />
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
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

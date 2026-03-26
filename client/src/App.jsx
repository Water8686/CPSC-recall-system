import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import PendingApprovalPage from './pages/PendingApprovalPage';
import DashboardPage from './pages/DashboardPage';
import RecallsPage from './pages/RecallsPage';
import RecallFormPage from './pages/RecallFormPage';
import RecallsImportPage from './pages/RecallsImportPage';
import ViolationsPage from './pages/ViolationsPage';
import ViolationFormPage from './pages/ViolationFormPage';
import ResponsesPage from './pages/ResponsesPage';
import ResponseFormPage from './pages/ResponseFormPage';
import AdjudicationsPage from './pages/AdjudicationsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import AdminUsersPage from './pages/AdminUsersPage';
import ProfilePage from './pages/ProfilePage';
import {
  RECALL_PAGE_ROLES,
  USER_ROLES,
  MANAGER_ACCESS_ROLES,
  USER_APPROVAL_ROLES,
} from 'shared';

const RECALL_WRITE_ROLES = MANAGER_ACCESS_ROLES;

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route
              path="/pending-approval"
              element={
                <ProtectedRoute allowPending>
                  <PendingApprovalPage />
                </ProtectedRoute>
              }
            />

            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route
                path="/recalls"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls/new"
                element={
                  <ProtectedRoute allowedRoles={RECALL_WRITE_ROLES}>
                    <RecallFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls/:id/edit"
                element={
                  <ProtectedRoute allowedRoles={RECALL_WRITE_ROLES}>
                    <RecallFormPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls/import"
                element={
                  <ProtectedRoute allowedRoles={RECALL_WRITE_ROLES}>
                    <RecallsImportPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <ProtectedRoute allowedRoles={USER_APPROVAL_ROLES}>
                    <AdminUsersPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/violations" element={<ViolationsPage />} />
              <Route
                path="/violations/new"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.ADMIN, USER_ROLES.MANAGER, USER_ROLES.INVESTIGATOR]}>
                    <ViolationFormPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/responses" element={<ResponsesPage />} />
              <Route
                path="/responses/new"
                element={
                  <ProtectedRoute allowedRoles={[USER_ROLES.SELLER]}>
                    <ResponseFormPage />
                  </ProtectedRoute>
                }
              />
              <Route path="/adjudications" element={<AdjudicationsPage />} />
              <Route path="/profile" element={<ProfilePage />} />
            </Route>

            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

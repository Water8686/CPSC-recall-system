import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';
import RecallsPage from './pages/RecallsPage';
import ViolationsPage from './pages/ViolationsPage';
import ResponsesPage from './pages/ResponsesPage';
import AdjudicationsPage from './pages/AdjudicationsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public route */}
            <Route path="/login" element={<LoginPage />} />

            {/* Protected routes — wrapped in Layout (sidebar + topbar) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              {/* Sprint 1 — manager only */}
              <Route
                path="/recalls"
                element={
                  <ProtectedRoute allowedRoles={['manager']}>
                    <RecallsPage />
                  </ProtectedRoute>
                }
              />
              {/* Sprint 2 */}
              <Route path="/violations" element={<ViolationsPage />} />
              {/* Sprint 3 */}
              <Route path="/responses" element={<ResponsesPage />} />
              <Route path="/adjudications" element={<AdjudicationsPage />} />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}

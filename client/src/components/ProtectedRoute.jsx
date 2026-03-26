import { Navigate, useLocation } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { normalizeAppRole } from 'shared';

/**
 * @param {object} props
 * @param {boolean} [props.allowPending] — when true, pending (unapproved) users may view this route; approved users on /pending-approval are redirected to dashboard.
 */
export default function ProtectedRoute({ children, allowedRoles, allowPending }) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const role = normalizeAppRole(profile, user.user_metadata?.role ?? user.app_metadata?.role);
    if (!role || !allowedRoles.includes(role)) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  const pending =
    profile &&
    Object.prototype.hasOwnProperty.call(profile, 'approved') &&
    profile.approved === false;

  if (allowPending && location.pathname === '/pending-approval' && profile && !pending) {
    return <Navigate to="/dashboard" replace />;
  }

  if (!allowPending && pending) {
    return <Navigate to="/pending-approval" replace />;
  }

  return children;
}

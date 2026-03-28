import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const APP_SUFFIX = 'CPSC Monitor';

/** Browser tab titles per route (metric: page titles). */
export function titleForPath(pathname) {
  const map = {
    '/login': 'Sign in',
    '/register': 'Create account',
    '/forgot-password': 'Forgot password',
    '/reset-password': 'Reset password',
    '/dashboard': 'Dashboard',
    '/profile': 'Profile',
    '/unauthorized': 'Access denied',
    '/recalls': 'Recalls',
    '/admin/users': 'Users & roles',
    '/admin/import': 'Batch import',
    '/violations': 'Violations',
    '/responses': 'Responses',
    '/adjudications': 'Adjudications',
  };
  return map[pathname] ?? 'Home';
}

export default function DocumentTitle() {
  const { pathname } = useLocation();
  const page = titleForPath(pathname);
  return (
    <Helmet>
      <title>{`${page} · ${APP_SUFFIX}`}</title>
    </Helmet>
  );
}

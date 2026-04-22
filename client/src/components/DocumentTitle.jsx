import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

const APP_SUFFIX = 'CPSC Monitor';

/** Browser tab titles per route (metric: page titles). */
export function titleForPath(pathname) {
  const exact = {
    '/login': 'Sign in',
    '/register': 'Create account',
    '/forgot-password': 'Forgot password',
    '/reset-password': 'Reset password',
    '/dashboard': 'Dashboard',
    '/profile': 'Profile',
    '/settings': 'Settings',
    '/unauthorized': 'Access denied',
    '/recalls': 'Recalls',
    '/admin/users': 'Users & roles',
    '/admin/import': 'Batch import',
    '/violations': 'Violations',
    '/responses': 'Responses',
    '/seller/responses': 'Respond',
    '/adjudications': 'Adjudications',
    '/analytics': 'Analytics',
  };
  if (exact[pathname]) return exact[pathname];

  // Prefix matches for detail / nested routes (e.g. /recalls/123, /violations/42)
  const prefixes = [
    ['/recalls/', 'Recall detail'],
    ['/violations/', 'Violation detail'],
    ['/responses/', 'Response detail'],
    ['/admin/', 'Admin'],
  ];
  for (const [p, label] of prefixes) {
    if (pathname.startsWith(p)) return label;
  }
  return 'Home';
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

import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Shield, Settings, LogOut } from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';
import { normalizeAppRole, USER_ROLES } from 'shared';

const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.MANAGER]: 'CPSC Manager',
  [USER_ROLES.INVESTIGATOR]: 'Investigator',
  [USER_ROLES.SELLER]: 'Seller',
};

function roleBadgeClass(role) {
  if (role === USER_ROLES.ADMIN) return 'border-red-200 bg-red-50 text-red-800';
  if (role === USER_ROLES.MANAGER) return 'border-blue-200 bg-blue-50 text-blue-800';
  if (role === USER_ROLES.INVESTIGATOR) return 'border-emerald-200 bg-emerald-50 text-emerald-800';
  return 'border-orange-200 bg-orange-50 text-orange-800';
}

const STAFF_TABS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Recalls', path: '/recalls' },
  { label: 'Violations', path: '/violations' },
  { label: 'Responses', path: '/responses' },
];

const SELLER_TABS = [
  { label: 'My Violations', path: '/violations' },
];

function tabsForRole(role) {
  return role === USER_ROLES.SELLER ? SELLER_TABS : STAFF_TABS;
}

function resolvedRole(profile, user) {
  return normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
}

export default function Layout() {
  const { signOut, user, profile } = useAuth();
  const avatarSrc = profile?.avatar_url?.trim() || null;
  const avatarLetter = (user?.email || '?')[0].toUpperCase();
  const role = resolvedRole(profile, user);
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const TAB_ITEMS = tabsForRole(role);

  // Match tab to current path (e.g. /recalls/123 still highlights Recalls)
  const activeTab = TAB_ITEMS.findIndex(
    (t) => location.pathname === t.path || location.pathname.startsWith(t.path + '/'),
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 items-center gap-3">
            <Shield className="size-7 shrink-0 text-primary" aria-hidden />
            <h1 className="truncate text-base font-bold leading-tight text-foreground md:text-lg">
              CPSC Recall System
            </h1>
          </div>
          {user && (
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <Badge
                variant="outline"
                className={`hidden max-w-[140px] truncate sm:inline-flex ${roleBadgeClass(role)}`}
              >
                {ROLE_LABELS[role] ?? role}
              </Badge>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate('/settings')}
                aria-label="Settings"
              >
                <Settings className="size-5" />
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="rounded-full border-border"
                    aria-label="Account menu"
                  >
                    {avatarSrc ? (
                      <img src={avatarSrc} alt="" className="size-8 rounded-full object-cover" />
                    ) : (
                      <span className="text-sm font-semibold">{avatarLetter}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem disabled className="text-xs text-muted-foreground">
                    {user?.email}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                    <LogOut className="size-4" />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Tab bar */}
        <nav className="mx-auto max-w-[1600px] px-4 md:px-8">
          <div className="flex gap-0">
            {TAB_ITEMS.map((tab, i) => (
              <button
                key={tab.path}
                type="button"
                onClick={() => navigate(tab.path)}
                className={`relative px-4 py-2.5 text-sm font-medium transition-colors ${
                  activeTab === i
                    ? 'text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {tab.label}
                {activeTab === i && (
                  <span className="absolute inset-x-0 bottom-0 h-0.5 bg-primary rounded-full" />
                )}
              </button>
            ))}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
        <div className="mx-auto max-w-[1600px]">
          <Outlet />
        </div>
        <footer className="mt-10 border-t border-border pt-6 text-center">
          <p className="text-xs text-muted-foreground">
            Student prototype — not endorsed by or affiliated with the U.S. Consumer Product
            Safety Commission (CPSC)
          </p>
        </footer>
      </main>
    </div>
  );
}

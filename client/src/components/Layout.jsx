import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Menu,
  LayoutDashboard,
  ListOrdered,
  AlertTriangle,
  MessageSquareReply,
  Gavel,
  ClipboardList,
  User,
  Users,
  Upload,
  LogOut,
} from 'lucide-react';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import { useAuth } from '../context/AuthContext';
import {
  canViewRecallsPage,
  canViewOperationalSprintPages,
  normalizeAppRole,
  USER_ROLES,
} from 'shared';

const DRAWER_WIDTH = 256;

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
  return 'border-border bg-muted text-muted-foreground';
}

const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: LayoutDashboard, sprint: 1 },
  {
    label: 'Recalls',
    path: '/recalls',
    icon: ListOrdered,
    sprint: 1,
    requiresManagerAccess: true,
  },
  {
    label: 'Violations',
    path: '/violations',
    icon: AlertTriangle,
    sprint: 2,
    requiresOperationalRole: true,
  },
  {
    label: 'Responses',
    path: '/responses',
    icon: MessageSquareReply,
    sprint: 3,
    requiresOperationalRole: true,
  },
  {
    label: 'Adjudications',
    path: '/adjudications',
    icon: Gavel,
    sprint: 3,
    requiresOperationalRole: true,
  },
  {
    label: 'Investigators',
    path: '/investigators',
    icon: ClipboardList,
    sprint: 2,
    requiresOperationalRole: true,
  },
];

const SETTINGS_NAV_ITEMS = [
  { label: 'Profile', path: '/profile', icon: User },
  { label: 'Users & roles', path: '/admin/users', icon: Users, adminOnly: true },
  { label: 'Batch import', path: '/admin/import', icon: Upload, adminOnly: true },
];

function resolvedRole(profile, user) {
  return normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
}

function NavLink({ item, onNavigate }) {
  const location = useLocation();
  const Icon = item.icon;
  const selected = location.pathname === item.path;
  return (
    <button
      type="button"
      onClick={() => onNavigate(item.path)}
      className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
        selected
          ? 'bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-100'
          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
      }`}
    >
      <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
      <span className="truncate">{item.label}</span>
      <span className="ml-auto text-[10px] font-normal text-muted-foreground">S{item.sprint}</span>
    </button>
  );
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { signOut, user, profile } = useAuth();
  const avatarSrc = profile?.avatar_url?.trim() || null;
  const avatarLetter = (user?.email || '?')[0].toUpperCase();
  const role = resolvedRole(profile, user);
  const navigate = useNavigate();
  const location = useLocation();

  const navItems = NAV_ITEMS.filter((item) => {
    if (item.requiresManagerAccess && !canViewRecallsPage(role)) return false;
    if (item.requiresOperationalRole && !canViewOperationalSprintPages(role)) return false;
    return true;
  });

  const settingsNavItems = SETTINGS_NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === USER_ROLES.ADMIN,
  );

  const handleNav = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const sidebarInner = (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="px-1 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Main
        </p>
      </div>
      {navItems.map((item) => (
        <NavLink key={item.path} item={item} onNavigate={handleNav} />
      ))}
      <Separator className="my-3" />
      <div className="px-1 pb-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Settings
        </p>
      </div>
      {settingsNavItems.map((item) => {
        const Icon = item.icon;
        const selected = location.pathname === item.path;
        return (
          <button
            key={item.path}
            type="button"
            onClick={() => handleNav(item.path)}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors ${
              selected
                ? 'bg-blue-50 text-blue-900 shadow-sm ring-1 ring-blue-100'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            }`}
          >
            <Icon className="size-4 shrink-0 opacity-80" aria-hidden />
            <span className="truncate">{item.label}</span>
            {item.adminOnly && (
              <span className="ml-auto text-[10px] text-muted-foreground">Admin</span>
            )}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col bg-gray-50">
      {/* Top bar — matches wireframe stakeholder headers */}
      <header className="sticky top-0 z-50 border-b border-border bg-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 md:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 md:hidden"
              onClick={() => setDrawerOpen((o) => !o)}
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </Button>
            <Shield className="size-8 shrink-0 text-blue-600" aria-hidden />
            <div className="min-w-0">
              <h1 className="truncate text-lg font-bold leading-tight text-gray-900 md:text-xl">
                CPSC Recall Violation Monitoring System
              </h1>
              <p className="hidden text-xs text-gray-600 sm:block">
                Regulatory monitoring and violation response
              </p>
            </div>
          </div>
          {user && (
            <div className="flex shrink-0 items-center gap-2 md:gap-3">
              <Badge
                variant="outline"
                className={`hidden max-w-[140px] truncate sm:inline-flex ${roleBadgeClass(role)}`}
              >
                {ROLE_LABELS[role] ?? role}
              </Badge>
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
                      <img
                        src={avatarSrc}
                        alt=""
                        className="size-8 rounded-full object-cover"
                      />
                    ) : (
                      <span className="text-sm font-semibold">{avatarLetter}</span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52">
                  <DropdownMenuItem onClick={() => navigate('/profile')}>
                    <User className="size-4" />
                    Profile
                  </DropdownMenuItem>
                  {role === USER_ROLES.ADMIN && (
                    <>
                      <DropdownMenuItem onClick={() => navigate('/admin/users')}>
                        <Users className="size-4" />
                        Users &amp; roles
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => navigate('/admin/import')}>
                        <Upload className="size-4" />
                        Batch import
                      </DropdownMenuItem>
                    </>
                  )}
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
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Desktop sidebar */}
        <aside
          className="hidden shrink-0 border-r border-border bg-sidebar md:block"
          style={{ width: DRAWER_WIDTH }}
        >
          {sidebarInner}
        </aside>

        {/* Mobile overlay */}
        {drawerOpen && (
          <button
            type="button"
            className="fixed inset-0 z-40 bg-black/40 md:hidden"
            aria-label="Close menu"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* Mobile drawer */}
        <aside
          className={`fixed inset-y-0 left-0 z-50 w-[min(280px,85vw)] border-r border-border bg-sidebar shadow-lg transition-transform duration-200 ease-out md:hidden ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full pointer-events-none'
          }`}
        >
          {sidebarInner}
        </aside>

        <main className="min-h-0 flex-1 overflow-auto p-4 md:p-6 lg:p-8">
          <Outlet />
          <footer className="mt-10 border-t border-border pt-6 text-center">
            <p className="text-xs text-muted-foreground">
              Student prototype — not endorsed by or affiliated with the U.S. Consumer Product
              Safety Commission (CPSC)
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}

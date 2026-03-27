import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  ListSubheader,
  Menu,
  MenuItem,
  Toolbar,
  Typography,
  Divider,
  Button,
  Chip,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsIcon from '@mui/icons-material/Settings';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PriorityHighIcon from '@mui/icons-material/PriorityHigh';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import GavelIcon from '@mui/icons-material/Gavel';
import ReplyIcon from '@mui/icons-material/Reply';
import LogoutIcon from '@mui/icons-material/Logout';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import Avatar from '@mui/material/Avatar';
import { useAuth } from '../context/AuthContext';
import {
  canViewRecallsPage,
  canViewOperationalSprintPages,
  normalizeAppRole,
  USER_ROLES,
} from 'shared';

const DRAWER_WIDTH = 240;

const ROLE_LABELS = {
  [USER_ROLES.ADMIN]: 'Admin',
  [USER_ROLES.MANAGER]: 'CPSC Manager',
  [USER_ROLES.INVESTIGATOR]: 'Investigator',
  [USER_ROLES.SELLER]: 'Seller',
};

function roleChipColor(role) {
  if (role === USER_ROLES.ADMIN) return 'error';
  if (role === USER_ROLES.MANAGER) return 'primary';
  if (role === USER_ROLES.INVESTIGATOR) return 'info';
  return 'default';
}

// Navigation items organized by sprint for easy expansion
const NAV_ITEMS = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon />, sprint: 1 },
  {
    label: 'Recalls',
    path: '/recalls',
    icon: <PriorityHighIcon />,
    sprint: 1,
    requiresManagerAccess: true,
  },
  // Sprint 2+ — hidden for sellers (operational roles only)
  {
    label: 'Violations',
    path: '/violations',
    icon: <ReportProblemIcon />,
    sprint: 2,
    requiresOperationalRole: true,
  },
  {
    label: 'Responses',
    path: '/responses',
    icon: <ReplyIcon />,
    sprint: 3,
    requiresOperationalRole: true,
  },
  {
    label: 'Adjudications',
    path: '/adjudications',
    icon: <GavelIcon />,
    sprint: 3,
    requiresOperationalRole: true,
  },
];

/** Settings: Users & roles is admin-only (ProtectedRoute still enforces). */
const SETTINGS_NAV_ITEMS = [
  {
    label: 'Profile',
    path: '/profile',
    icon: <PersonIcon />,
  },
  {
    label: 'Users & roles',
    path: '/admin/users',
    icon: <PeopleIcon />,
    adminOnly: true,
  },
];

function resolvedRole(profile, user) {
  return normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const { signOut, user, profile } = useAuth();
  const avatarSrc = profile?.avatar_url?.trim() || null;
  const avatarLetter = (user?.email || '?')[0].toUpperCase();
  const role = resolvedRole(profile, user);
  const navItems = NAV_ITEMS.filter((item) => {
    if (item.requiresManagerAccess && !canViewRecallsPage(role)) return false;
    if (item.requiresOperationalRole && !canViewOperationalSprintPages(role)) return false;
    return true;
  });

  const settingsNavItems = SETTINGS_NAV_ITEMS.filter(
    (item) => !item.adminOnly || role === USER_ROLES.ADMIN,
  );
  const navigate = useNavigate();
  const location = useLocation();

  const handleNav = (path) => {
    navigate(path);
    setDrawerOpen(false);
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const drawer = (
    <Box>
      <Toolbar>
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          CPSC Monitor
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {navItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} />
          </ListItemButton>
        ))}
        <Divider sx={{ my: 1 }} />
        <ListSubheader component="div" disableSticky sx={{ lineHeight: 2, fontWeight: 700 }}>
          Settings
        </ListSubheader>
        {settingsNavItems.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText
              primary={item.label}
              secondary={item.adminOnly ? 'Admin only' : undefined}
            />
          </ListItemButton>
        ))}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      {/* Top app bar */}
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
          >
            <MenuIcon />
          </IconButton>
          <Typography variant="h6" noWrap sx={{ flexGrow: 1, minWidth: 0, mr: 1 }}>
            CPSC Recall Violation Monitoring System
          </Typography>
          {user && (
            <>
              <Chip
                label={ROLE_LABELS[role] ?? role}
                size="small"
                color={roleChipColor(role)}
                sx={{ mr: 1, flexShrink: 0, fontWeight: 600, maxWidth: { xs: 140, sm: 'none' } }}
              />
              <IconButton
                color="inherit"
                aria-label="Profile"
                onClick={() => navigate('/profile')}
                sx={{ mr: 0.5 }}
              >
                <Avatar
                  src={avatarSrc || undefined}
                  alt=""
                  sx={{ width: 32, height: 32, bgcolor: 'secondary.dark' }}
                >
                  {!avatarSrc ? avatarLetter : null}
                </Avatar>
              </IconButton>
              <IconButton
                color="inherit"
                aria-label="Settings"
                onClick={(e) => setSettingsAnchor(e.currentTarget)}
                sx={{ mr: 0.5 }}
              >
                <SettingsIcon />
              </IconButton>
              <Menu
                anchorEl={settingsAnchor}
                open={Boolean(settingsAnchor)}
                onClose={() => setSettingsAnchor(null)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
              >
                <MenuItem
                  onClick={() => {
                    setSettingsAnchor(null);
                    navigate('/profile');
                  }}
                >
                  Profile
                </MenuItem>
                {role === USER_ROLES.ADMIN && (
                  <MenuItem
                    onClick={() => {
                      setSettingsAnchor(null);
                      navigate('/admin/users');
                    }}
                  >
                    Users &amp; roles
                  </MenuItem>
                )}
              </Menu>
              <Button
                color="inherit"
                startIcon={<LogoutIcon />}
                onClick={handleSignOut}
              >
                Sign Out
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      {/* Sidebar — permanent on desktop, toggle on mobile */}
      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: 0 }}>
        {/* Mobile drawer */}
        <Drawer
          variant="temporary"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          sx={{
            display: { xs: 'block', md: 'none' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH },
          }}
        >
          {drawer}
        </Drawer>
        {/* Desktop drawer */}
        <Drawer
          variant="permanent"
          sx={{
            display: { xs: 'none', md: 'block' },
            '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box' },
          }}
          open
        >
          {drawer}
        </Drawer>
      </Box>

      {/* Main content area */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        <Toolbar /> {/* Spacer for fixed AppBar */}
        <Box sx={{ flexGrow: 1 }}>
          <Outlet />
        </Box>
        <Box
          component="footer"
          sx={{
            mt: 4,
            py: 1.5,
            px: 2,
            borderTop: '1px solid',
            borderColor: 'divider',
            textAlign: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            Student prototype — not endorsed by or affiliated with the U.S. Consumer Product Safety Commission (CPSC)
          </Typography>
        </Box>
      </Box>
    </Box>
  );
}

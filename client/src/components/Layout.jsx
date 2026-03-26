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
  Avatar,
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
import { useAuth } from '../context/AuthContext';
import {
  canViewRecallsPage,
  normalizeAppRole,
  VIOLATION_STAFF_ROLES,
  USER_APPROVAL_ROLES,
} from 'shared';

const DRAWER_WIDTH = 260;

function resolvedRole(profile, user) {
  return normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
}

function navAllowed(path, role) {
  if (path === '/dashboard') return true;
  if (path === '/profile') return true;
  if (path === '/recalls' || path === '/recalls/new' || path.startsWith('/recalls/')) {
    return canViewRecallsPage(role);
  }
  if (path === '/violations' || path === '/violations/new') {
    return true;
  }
  if (path === '/responses' || path === '/responses/new') {
    return true;
  }
  if (path === '/adjudications') {
    return VIOLATION_STAFF_ROLES.includes(role);
  }
  if (path === '/admin/users') {
    return USER_APPROVAL_ROLES.includes(role);
  }
  return true;
}

const ALL_NAV = [
  { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
  { label: 'Recalls', path: '/recalls', icon: <PriorityHighIcon /> },
  { label: 'Violations', path: '/violations', icon: <ReportProblemIcon /> },
  { label: 'Responses', path: '/responses', icon: <ReplyIcon /> },
  { label: 'Adjudications', path: '/adjudications', icon: <GavelIcon /> },
  { label: 'My profile', path: '/profile', icon: <PersonIcon /> },
];

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const { signOut, user, profile } = useAuth();
  const role = resolvedRole(profile, user);
  const navItems = ALL_NAV.filter((item) => navAllowed(item.path, role));
  const showAdminUsers = USER_APPROVAL_ROLES.includes(role);
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

  const displayName = profile?.display_name || profile?.full_name || user?.email || 'User';
  const avatarSrc = profile?.avatar_url || undefined;

  const drawer = (
    <Box>
      <Toolbar sx={{ gap: 1 }}>
        <Box
          component="img"
          src="/cpsc-logo.svg"
          alt="CPSC"
          sx={{ height: 32, width: 'auto' }}
        />
        <Typography variant="subtitle1" fontWeight={700} noWrap>
          Recall Monitor
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
        {showAdminUsers && (
          <ListItemButton
            selected={location.pathname === '/admin/users'}
            onClick={() => handleNav('/admin/users')}
          >
            <ListItemIcon>
              <PeopleIcon />
            </ListItemIcon>
            <ListItemText primary="Users & roles" secondary="Managers & admins" />
          </ListItemButton>
        )}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar position="fixed" sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}>
        <Toolbar>
          <IconButton
            color="inherit"
            edge="start"
            onClick={() => setDrawerOpen(!drawerOpen)}
            sx={{ mr: 2, display: { md: 'none' } }}
            aria-label="menu"
          >
            <MenuIcon />
          </IconButton>
          <Box
            component="img"
            src="/cpsc-logo.svg"
            alt=""
            sx={{ height: 28, mr: 1, display: { xs: 'none', sm: 'block' } }}
          />
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            CPSC Recall Violation Monitoring System
          </Typography>
          {user && (
            <>
              <Avatar
                src={avatarSrc}
                alt=""
                sx={{ width: 32, height: 32, mr: 1 }}
                onClick={() => navigate('/profile')}
                style={{ cursor: 'pointer' }}
              >
                {displayName.charAt(0).toUpperCase()}
              </Avatar>
              <Typography variant="body2" noWrap sx={{ mr: 1, maxWidth: 160, display: { xs: 'none', sm: 'block' } }}>
                {displayName}
              </Typography>
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
                {showAdminUsers && (
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
              <Button color="inherit" startIcon={<LogoutIcon />} onClick={handleSignOut}>
                Sign Out
              </Button>
            </>
          )}
        </Toolbar>
      </AppBar>

      <Box component="nav" sx={{ width: { md: DRAWER_WIDTH }, flexShrink: 0 }}>
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

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: { xs: 2, sm: 3 },
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}

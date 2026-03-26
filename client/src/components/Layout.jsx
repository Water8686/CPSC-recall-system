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
import { useAuth } from '../context/AuthContext';
import { canViewRecallsPage, normalizeAppRole } from 'shared';

const DRAWER_WIDTH = 240;

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
  // Sprint 2
  { label: 'Violations', path: '/violations', icon: <ReportProblemIcon />, sprint: 2 },
  // Sprint 3
  { label: 'Responses', path: '/responses', icon: <ReplyIcon />, sprint: 3 },
  { label: 'Adjudications', path: '/adjudications', icon: <GavelIcon />, sprint: 3 },
];

/** Shown under Settings for everyone; /admin/users is still admin-only (ProtectedRoute). */
const SETTINGS_NAV_ITEMS = [
  {
    label: 'Users & roles',
    path: '/admin/users',
    icon: <PeopleIcon />,
  },
];

function resolvedRole(profile, user) {
  return normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
}

export default function Layout() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsAnchor, setSettingsAnchor] = useState(null);
  const { signOut, user, profile } = useAuth();
  const role = resolvedRole(profile, user);
  const navItems = NAV_ITEMS.filter(
    (item) =>
      !item.requiresManagerAccess || canViewRecallsPage(role),
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
        {SETTINGS_NAV_ITEMS.map((item) => (
          <ListItemButton
            key={item.path}
            selected={location.pathname === item.path}
            onClick={() => handleNav(item.path)}
          >
            <ListItemIcon>{item.icon}</ListItemIcon>
            <ListItemText primary={item.label} secondary="Admin only" />
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
          <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
            CPSC Recall Violation Monitoring System
          </Typography>
          {user && (
            <>
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
                    navigate('/admin/users');
                  }}
                >
                  Users &amp; roles (admin)
                </MenuItem>
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

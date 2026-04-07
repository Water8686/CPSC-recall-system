import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Tabs, Tab, Typography, Button } from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import { normalizeAppRole, USER_ROLES } from 'shared';
import ProfilePage from './ProfilePage';
import AdminUsersPage from './AdminUsersPage';
import AdminImportPage from './AdminImportPage';

export default function SettingsPage() {
  const [tab, setTab] = useState(0);
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const role = normalizeAppRole(profile, user?.user_metadata?.role ?? user?.app_metadata?.role);
  const isAdmin = role === USER_ROLES.ADMIN;

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>
      <Typography variant="h5" fontWeight={700} sx={{ mb: 2 }}>
        Settings
      </Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
        <Tab label="Profile" />
        {isAdmin && <Tab label="Users & Roles" />}
        {isAdmin && <Tab label="Batch Import" />}
      </Tabs>
      {tab === 0 && <ProfilePage />}
      {isAdmin && tab === 1 && <AdminUsersPage />}
      {isAdmin && tab === 2 && <AdminImportPage />}
    </Box>
  );
}

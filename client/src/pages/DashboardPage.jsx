import { useState, useEffect } from 'react';
import { Link as RouterLink } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import { Chart } from 'react-google-charts';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole } from 'shared';

const KPI_CARDS = [
  { key: 'open_violations', label: 'Open Violations', color: '#0D47A1', bg: '#e3f2fd' },
  { key: 'active_listings', label: 'Active Listings', color: '#e65100', bg: '#fff3e0' },
  { key: 'prioritized_recalls', label: 'Prioritized Recalls', color: '#2e7d32', bg: '#e8f5e9' },
  { key: 'pending_responses', label: 'Pending Responses', color: '#c62828', bg: '#fce4ec' },
];

const TYPE_COLORS = ['#0D47A1', '#1565C0', '#1976D2', '#1E88E5', '#42A5F5', '#64B5F6'];
const MKT_COLORS = ['#e65100', '#f57c00', '#ff9800', '#ffb74d', '#ffe0b2'];

export default function DashboardPage() {
  const { session, profile, user } = useAuth();
  const [prioritizations, setPrioritizations] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const managerUi = canAccessManagerFeatures(role);
  const displayName = profile?.full_name || user?.email || 'User';

  useEffect(() => {
    async function fetchData() {
      try {
        const [prioRes, statsRes] = await Promise.all([
          apiFetch('/api/prioritizations', session),
          apiFetch('/api/stats/dashboard', session),
        ]);
        if (prioRes.ok) setPrioritizations(await prioRes.json());
        if (statsRes.ok) setStats(await statsRes.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  const counts = { High: 0, Medium: 0, Low: 0 };
  prioritizations.forEach((p) => {
    if (counts[p.priority] !== undefined) counts[p.priority]++;
  });
  const barChartData = [['Priority', 'Count'], ['High', counts.High], ['Medium', counts.Medium], ['Low', counts.Low]];
  const pieChartData = [['Priority', 'Count'], ['High', counts.High], ['Medium', counts.Medium], ['Low', counts.Low]];

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>Dashboard</Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Welcome back, {displayName}
      </Typography>

      {/* KPI Cards */}
      {stats && (
        <Grid container spacing={2} sx={{ mb: 3 }}>
          {KPI_CARDS.map((card) => (
            <Grid item xs={6} md={3} key={card.key}>
              <Paper sx={{ p: 2, textAlign: 'center', bgcolor: card.bg, borderColor: card.bg }}>
                <Typography variant="h3" fontWeight={700} sx={{ color: card.color }}>
                  {stats[card.key] ?? 0}
                </Typography>
                <Typography variant="caption" fontWeight={600} sx={{ color: card.color }}>
                  {card.label}
                </Typography>
              </Paper>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Sprint 2 Charts */}
      {stats && (
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Violations by Type
              </Typography>
              {stats.violations_by_type.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.violations_by_type} layout="vertical">
                    <XAxis type="number" allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="type"
                      width={160}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                      {stats.violations_by_type.map((_, i) => (
                        <Cell key={i} fill={TYPE_COLORS[i % TYPE_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No violations recorded yet.
                </Typography>
              )}
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="subtitle2" fontWeight={600} sx={{ mb: 2 }}>
                Listings by Marketplace
              </Typography>
              {stats.listings_by_marketplace.length > 0 ? (
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={stats.listings_by_marketplace}>
                    <XAxis dataKey="marketplace" tick={{ fontSize: 12 }} />
                    <YAxis allowDecimals={false} />
                    <Tooltip />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {stats.listings_by_marketplace.map((_, i) => (
                        <Cell key={i} fill={MKT_COLORS[i % MKT_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No listings recorded yet.
                </Typography>
              )}
            </Paper>
          </Grid>
        </Grid>
      )}

      {/* Existing Sprint 1 priority charts */}
      <Typography color="text.secondary" sx={{ mb: 2 }}>
        Recall priority overview
      </Typography>
      {managerUi && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          For the full manager workflow, open{' '}
          <Link component={RouterLink} to="/recalls">Recalls</Link>.
        </Typography>
      )}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Chart chartType="BarChart" width="100%" height="300px" data={barChartData}
              options={{ title: 'Recalls by Priority', chartArea: { width: '60%' }, hAxis: { title: 'Count', minValue: 0 }, vAxis: { title: 'Priority' } }} />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Chart chartType="PieChart" width="100%" height="300px" data={pieChartData}
              options={{ title: 'Percentage by Priority', pieHole: 0.4, sliceVisibilityThreshold: 0 }} />
          </Paper>
        </Grid>
      </Grid>

      <Box sx={{ textAlign: 'center' }}>
        <Link component={RouterLink} to="/analytics" color="primary">
          View full analytics dashboard →
        </Link>
      </Box>
    </Box>
  );
}

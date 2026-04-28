import { useState, useEffect } from 'react';
import { Link as RouterLink, Navigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
  Link,
} from '@mui/material';
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  PieChart,
  Pie,
  RadialBarChart,
  RadialBar,
  PolarAngleAxis,
  Legend,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { canAccessManagerFeatures, normalizeAppRole, USER_ROLES } from 'shared';

const PRIORITY_COLORS = {
  Critical: '#7c3aed',
  High: '#d97706',
  Medium: '#2563eb',
};
const STATUS_COLORS = {
  Open: '#d946ef',
  Resolved: '#8b5cf6',
  Other: '#4f46e5',
};
const OUTCOME_COLORS = {
  Approved: '#4ade80',
  Closed: '#facc15',
  'Pending Remediation': '#60a5fa',
};
const PANEL_SX = {
  p: 2.5,
  borderRadius: 2,
  border: '1px solid',
  borderColor: 'rgba(148,163,184,0.18)',
  bgcolor: '#111827',
  color: '#e2e8f0',
  height: 320,
};
const LIGHT_PANEL_SX = {
  ...PANEL_SX,
  borderColor: 'rgba(148,163,184,0.32)',
  bgcolor: '#f8fafc',
  color: '#0f172a',
};
const lightTooltipStyle = {
  background: '#ffffff',
  border: '1px solid #cbd5e1',
  borderRadius: 8,
  color: '#0f172a',
};
const lightGridStroke = '#cbd5e1';
const lightAxisTick = '#475569';
const lightLabelTick = '#334155';

export default function DashboardPage() {
  const { session, profile, user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const isSeller = role === USER_ROLES.SELLER;
  const managerUi = canAccessManagerFeatures(role);
  const displayName = profile?.full_name || user?.email || 'User';

  useEffect(() => {
    if (isSeller) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    async function fetchData() {
      try {
        const statsRes = await apiFetch('/api/stats/dashboard', session, { signal: controller.signal });
        if (statsRes.ok) setStats(await statsRes.json());
        if (!statsRes.ok) {
          setError(await getApiErrorMessage(statsRes, 'Failed to load dashboard statistics.'));
        }
      } catch (err) {
        if (err.name !== 'AbortError') setError(err.message);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    fetchData();
    return () => controller.abort();
  }, [session, isSeller]);

  // Sellers do not have a dashboard — redirect them to the violations list
  // (demo seller can browse all; real seller sees their own).
  // Hook order must stay stable, so this happens after the effect above.
  if (isSeller) return <Navigate to="/violations" replace />;

  const openViolationsSeries = stats?.open_violations_over_time ?? [];
  const listingsByStatus = stats?.listings_by_violation_status ?? [];
  const recallsByPriorityPercent = stats?.recalls_by_priority_percent ?? [];
  const violationsByPriority = stats?.violations_by_priority ?? [];
  const openViolationsTotal = stats?.open_violations_total ?? 0;
  const adjudicationOutcomes = stats?.adjudication_outcomes ?? [];
  const recallsByPriorityCounts = stats?.recalls_by_priority_counts ?? [];
  const responsesByMonth = stats?.responses_by_month ?? [];
  const hasPriorityPercentData = recallsByPriorityPercent.some((row) => Number(row?.percent ?? 0) > 0);
  const hasViolationsByPriorityData = violationsByPriority.some((row) => Number(row?.count ?? 0) > 0);
  const hasRecallPriorityCountData = recallsByPriorityCounts.some((row) => Number(row?.count ?? 0) > 0);

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
      {managerUi && (
        <Typography variant="body2" sx={{ mb: 2 }}>
          For the full manager workflow, open{' '}
          <Link component={RouterLink} to="/recalls">Recalls</Link>.
        </Typography>
      )}

      <Grid container spacing={2.5} sx={{ mt: 0.5 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Open Violations Over Time
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={openViolationsSeries}>
                <defs>
                  <linearGradient id="openViolationsFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={lightGridStroke} />
                <XAxis dataKey="label" tick={{ fill: lightAxisTick, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: lightAxisTick, fontSize: 11 }} />
                <Tooltip contentStyle={lightTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#openViolationsFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Listings by Violation Status
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={listingsByStatus} layout="vertical" margin={{ left: 10, right: 12 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={lightGridStroke} />
                <XAxis type="number" allowDecimals={false} tick={{ fill: lightAxisTick, fontSize: 11 }} />
                <YAxis dataKey="status" type="category" tick={{ fill: lightLabelTick, fontSize: 12 }} />
                <Tooltip contentStyle={lightTooltipStyle} />
                <Bar dataKey="count" radius={[0, 10, 10, 0]}>
                  {listingsByStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || '#7c3aed'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Percentage of Recalls by Priority
            </Typography>
            {hasPriorityPercentData ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Tooltip contentStyle={lightTooltipStyle} />
                  <Legend wrapperStyle={{ color: lightLabelTick, fontSize: 12 }} />
                  <Pie
                    data={recallsByPriorityPercent}
                    dataKey="percent"
                    nameKey="priority"
                    cx="50%"
                    cy="50%"
                    outerRadius={88}
                    label={({ percent }) => `${percent}%`}
                  >
                    {recallsByPriorityPercent.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#7c3aed'} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                <Typography variant="body2" color="text.secondary">No priority data yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Violations by Priority
            </Typography>
            {hasViolationsByPriorityData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={violationsByPriority}>
                  <CartesianGrid strokeDasharray="3 3" stroke={lightGridStroke} />
                  <XAxis dataKey="priority" tick={{ fill: lightLabelTick, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: lightAxisTick, fontSize: 11 }} />
                  <Tooltip contentStyle={lightTooltipStyle} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {violationsByPriority.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#7c3aed'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                <Typography variant="body2" color="text.secondary">No priority data yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Open Violations
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart
                  innerRadius="72%"
                  outerRadius="95%"
                  startAngle={90}
                  endAngle={-270}
                  data={[
                    {
                      name: 'Open Violations',
                      value: openViolationsTotal,
                      fill: '#fb7185',
                    },
                  ]}
                >
                  <PolarAngleAxis
                    type="number"
                    domain={[0, Math.max(openViolationsTotal * 1.5, 10)]}
                    tick={false}
                  />
                  <RadialBar background dataKey="value" clockWise cornerRadius={10} />
                  <text
                    x="50%"
                    y="50%"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="#0f172a"
                    fontSize="40"
                    fontWeight="700"
                  >
                    {openViolationsTotal}
                  </text>
                </RadialBarChart>
              </ResponsiveContainer>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Adjudication Outcomes
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Tooltip contentStyle={lightTooltipStyle} />
                <Legend wrapperStyle={{ color: lightLabelTick, fontSize: 12 }} />
                <Pie
                  data={adjudicationOutcomes}
                  dataKey="count"
                  nameKey="outcome"
                  cx="50%"
                  cy="50%"
                  outerRadius={88}
                  label={({ percent }) => `${Math.round(percent * 100)}%`}
                >
                  {adjudicationOutcomes.map((entry) => (
                    <Cell key={entry.outcome} fill={OUTCOME_COLORS[entry.outcome] || '#64748b'} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Recalls by Priority
            </Typography>
            {hasRecallPriorityCountData ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={recallsByPriorityCounts}>
                  <CartesianGrid strokeDasharray="3 3" stroke={lightGridStroke} />
                  <XAxis dataKey="priority" tick={{ fill: lightLabelTick, fontSize: 12 }} />
                  <YAxis allowDecimals={false} tick={{ fill: lightAxisTick, fontSize: 11 }} />
                  <Tooltip contentStyle={lightTooltipStyle} />
                  <Bar dataKey="count" radius={[8, 8, 0, 0]}>
                    {recallsByPriorityCounts.map((entry) => (
                      <Cell key={entry.priority} fill={PRIORITY_COLORS[entry.priority] || '#7c3aed'} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 250 }}>
                <Typography variant="body2" color="text.secondary">No priority data yet</Typography>
              </Box>
            )}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={LIGHT_PANEL_SX}>
            <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 1.5 }}>
              Responses by Month
            </Typography>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={responsesByMonth}>
                <defs>
                  <linearGradient id="responsesFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f43f5e" stopOpacity={0.6} />
                    <stop offset="100%" stopColor="#2563eb" stopOpacity={0.08} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={lightGridStroke} />
                <XAxis dataKey="label" tick={{ fill: lightAxisTick, fontSize: 11 }} />
                <YAxis allowDecimals={false} tick={{ fill: lightAxisTick, fontSize: 11 }} />
                <Tooltip contentStyle={lightTooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  fill="url(#responsesFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

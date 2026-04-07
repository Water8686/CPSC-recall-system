# Unified Workspace Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the sidebar, replace with horizontal tab bar navigation, consolidate settings into a single page, overhaul Recalls/Violations/Responses pages for a streamlined investigator workflow.

**Architecture:** The Layout component is rewritten to remove the sidebar and render a top bar + tab bar. Routing is simplified — removed pages (CreateViolation, Adjudications, Investigators) are replaced by modals or removed entirely. Settings consolidates Profile, Users, and Import into one page with internal tabs.

**Tech Stack:** React 18, React Router 7, MUI 6, Tailwind CSS 4, Lucide Icons, Recharts

**Spec:** `docs/superpowers/specs/2026-04-06-unified-workspace-redesign.md`

---

### Task 1: DB Migration — Add `notice_sent_at` to violation table

**Files:**
- Create: `supabase/migrations/20260406140000_violation_notice_sent_at.sql`
- Modify: `server/src/lib/supabaseViolationData.js:246-258`

The Responses tab needs to know when a notice was sent. Currently `notice_sent_at` is derived from the `contact` table, but that requires creating contact records. Adding a direct column is simpler and keeps the PATCH endpoint self-contained.

- [ ] **Step 1: Create the migration file**

```sql
-- Add notice_sent_at timestamp to violation table for response tracking
ALTER TABLE violation
  ADD COLUMN IF NOT EXISTS notice_sent_at TIMESTAMPTZ;
```

Write this to `supabase/migrations/20260406140000_violation_notice_sent_at.sql`.

- [ ] **Step 2: Apply migration to Supabase**

Use Supabase MCP `apply_migration` tool with project_id `chxhpblbckrzwmmoiuwr`, name `violation_notice_sent_at`, and the SQL from step 1.

- [ ] **Step 3: Update `dbUpdateViolationStatus` to save `notice_sent_at`**

In `server/src/lib/supabaseViolationData.js`, modify the `dbUpdateViolationStatus` function (around line 246) to include `notice_sent_at` in the patch object:

```javascript
export async function dbUpdateViolationStatus(supabase, violationId, fields) {
  const patch = {};
  if (fields.violation_status !== undefined) patch.violation_status = fields.violation_status;
  if (fields.notes !== undefined) patch.investigator_commentary = fields.notes;
  if (fields.notice_sent_at !== undefined) patch.notice_sent_at = fields.notice_sent_at;

  const { data, error } = await supabase
    .from('violation')
    .update(patch)
    .eq('violation_id', violationId)
    .select(VIOLATION_SELECT)
    .single();
  if (error) throw error;
  return mapViolationRow(data);
}
```

- [ ] **Step 4: Update `VIOLATION_SELECT` to include `notice_sent_at` column**

In the same file, update the `VIOLATION_SELECT` constant (around line 133) to include `notice_sent_at`:

```javascript
const VIOLATION_SELECT = `
  violation_id, listing_id, recall_id, user_id,
  investigator_commentary, violation_status, violation_noticed_at,
  violation_type, date_of_violation, notice_sent_at,
  recall(recall_number, recall_title, product_name),
  investigator:app_users!violation_user_id_fkey(user_id, full_name, email),
  listing(listing_url, listing_title, marketplace_id,
    marketplace(marketplace_name),
    seller(seller_name, seller_email)),
  contact(contact_id, contact_sent_at, message_summary,
    response(response_id, response_received_at, response_action, response_text,
      adjudication(adjudication_id, outcome, resolution_reason, adjudicated_at)))
`;
```

Note: also adding seller join through listing (matching the `LISTING_SELECT` pattern) so the Responses tab can show seller info.

- [ ] **Step 5: Update `mapViolationRow` to prefer direct column over contact-derived value**

Update the `notice_sent_at` mapping in `mapViolationRow` (around line 286):

```javascript
notice_sent_at:       row.notice_sent_at ?? latestContact?.contact_sent_at ?? null,
```

And add seller info to the mapped row (after `listing_title`):

```javascript
listing_title:        row.listing?.listing_title ?? null,
seller_name:          row.listing?.seller?.seller_name ?? null,
seller_email:         row.listing?.seller?.seller_email ?? null,
```

- [ ] **Step 6: Verify server starts without errors**

Run: `cd server && npm run dev` (or equivalent). Confirm no startup errors.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20260406140000_violation_notice_sent_at.sql server/src/lib/supabaseViolationData.js
git commit -m "feat: add notice_sent_at column to violation table and update data layer"
```

---

### Task 2: Layout Redesign — Remove sidebar, add tab bar

**Files:**
- Modify: `client/src/components/Layout.jsx` (full rewrite)

Replace the sidebar + mobile drawer with a horizontal tab bar below the top bar. The gear icon in the top bar navigates to `/settings`.

- [ ] **Step 1: Rewrite Layout.jsx**

Replace the entire contents of `client/src/components/Layout.jsx` with:

```jsx
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
  return 'border-border bg-muted text-muted-foreground';
}

const TAB_ITEMS = [
  { label: 'Dashboard', path: '/dashboard' },
  { label: 'Recalls', path: '/recalls' },
  { label: 'Violations', path: '/violations' },
  { label: 'Responses', path: '/responses' },
];

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
```

- [ ] **Step 2: Verify the layout renders**

Run the dev server (`cd client && npm run dev`). Navigate to `/dashboard`. Confirm:
- Top bar shows app title, role badge, gear icon, avatar dropdown
- Tab bar shows Dashboard | Recalls | Violations | Responses
- No sidebar visible
- Active tab is highlighted with blue underline
- Click between tabs — each loads the correct page

- [ ] **Step 3: Commit**

```bash
git add client/src/components/Layout.jsx
git commit -m "feat: replace sidebar with horizontal tab bar navigation"
```

---

### Task 3: Settings Page & Routing Update

**Files:**
- Create: `client/src/pages/SettingsPage.jsx`
- Modify: `client/src/App.jsx`

Create the consolidated Settings page and update routing to remove dead routes.

- [ ] **Step 1: Create SettingsPage.jsx**

```jsx
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
```

- [ ] **Step 2: Update App.jsx routing**

Replace the full contents of `client/src/App.jsx`:

```jsx
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider } from '@mui/material';
import { theme } from './theme';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import DocumentTitle from './components/DocumentTitle';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import DashboardPage from './pages/DashboardPage';
import RecallsPage from './pages/RecallsPage';
import RecallDetailPage from './pages/RecallDetailPage';
import ViolationsPage from './pages/ViolationsPage';
import ResponsesPage from './pages/ResponsesPage';
import SettingsPage from './pages/SettingsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import UnauthorizedPage from './pages/UnauthorizedPage';
import { RECALL_PAGE_ROLES, OPERATIONAL_ROLES } from 'shared';

export default function App() {
  return (
    <ThemeProvider theme={theme}>
      <AuthProvider>
        <BrowserRouter>
          <DocumentTitle />
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />

            {/* Protected routes — wrapped in Layout (top bar + tab bar) */}
            <Route
              element={
                <ProtectedRoute>
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/unauthorized" element={<UnauthorizedPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/analytics" element={<AnalyticsPage />} />
              <Route
                path="/recalls"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/recalls/:id"
                element={
                  <ProtectedRoute allowedRoles={RECALL_PAGE_ROLES}>
                    <RecallDetailPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/violations"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ViolationsPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/responses"
                element={
                  <ProtectedRoute allowedRoles={OPERATIONAL_ROLES}>
                    <ResponsesPage />
                  </ProtectedRoute>
                }
              />
            </Route>

            {/* Default redirect */}
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </ThemeProvider>
  );
}
```

Removed routes: `/profile`, `/admin/users`, `/admin/import`, `/violations/new`, `/adjudications`, `/investigators`.
Added: `/settings`.

- [ ] **Step 3: Verify Settings page renders**

Navigate to `/settings`. Confirm:
- Back button works
- Profile tab shows the profile form
- Admin users see all 3 tabs; non-admins see only Profile
- Each tab loads the correct content

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/SettingsPage.jsx client/src/App.jsx
git commit -m "feat: add Settings page, consolidate routing"
```

---

### Task 4: RecallsPage Overhaul — Clean Data Table

**Files:**
- Modify: `client/src/pages/RecallsPage.jsx` (major rewrite)

Replace the 500+ line component with a clean data table. Remove the modal detail view entirely. Clicking a row navigates to `/recalls/:id`.

- [ ] **Step 1: Rewrite RecallsPage.jsx**

Replace the full contents of `client/src/pages/RecallsPage.jsx`:

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  CircularProgress,
  Chip,
  Checkbox,
  Button,
  TableSortLabel,
} from '@mui/material';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import {
  canAccessManagerFeatures,
  normalizeAppRole,
  USER_ROLES,
} from 'shared';
import {
  PRIORITY_LEVELS,
  getPriorityBgColor,
  getPriorityColor,
} from '../constants/priorities';

function formatDate(value) {
  if (!value) return '—';
  const dt = new Date(value);
  if (!Number.isFinite(dt.getTime())) return String(value);
  return dt.toLocaleDateString();
}

export default function RecallsPage() {
  const { session, profile, user } = useAuth();
  const navigate = useNavigate();
  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const canPrioritize = canAccessManagerFeatures(role);

  const [recalls, setRecalls] = useState([]);
  const [prioritizations, setPrioritizations] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [search, setSearch] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('All');

  // Sorting
  const [sortField, setSortField] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  useEffect(() => {
    async function fetchData() {
      try {
        const [recallsRes, priorRes] = await Promise.all([
          apiFetch('/api/recalls', session),
          apiFetch('/api/prioritizations', session),
        ]);
        if (!recallsRes.ok) throw new Error(await getApiErrorMessage(recallsRes));
        if (!priorRes.ok) throw new Error(await getApiErrorMessage(priorRes));

        setRecalls(await recallsRes.json());
        const priorData = await priorRes.json();
        const priorMap = {};
        priorData.forEach((p) => { priorMap[p.recall_id] = p; });
        setPrioritizations(priorMap);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [session]);

  const filtered = useMemo(() => {
    let list = recalls;

    // Search filter
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          (r.title || '').toLowerCase().includes(q) ||
          (r.product || r.product_name || '').toLowerCase().includes(q) ||
          (r.recall_id || '').toString().toLowerCase().includes(q) ||
          (r.manufacturer || '').toLowerCase().includes(q),
      );
    }

    // Priority filter
    if (priorityFilter !== 'All') {
      list = list.filter((r) => {
        const p = prioritizations[r.recall_id];
        return p?.priority === priorityFilter;
      });
    }

    // Sorting
    if (sortField) {
      list = [...list].sort((a, b) => {
        let aVal, bVal;
        if (sortField === 'priority') {
          const order = { High: 0, Medium: 1, Low: 2 };
          aVal = order[prioritizations[a.recall_id]?.priority] ?? 3;
          bVal = order[prioritizations[b.recall_id]?.priority] ?? 3;
        } else {
          aVal = a[sortField] ?? '';
          bVal = b[sortField] ?? '';
        }
        if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return list;
  }, [recalls, search, priorityFilter, prioritizations, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700}>
          Active Recalls{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
          <TextField
            size="small"
            placeholder="Search recalls..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            sx={{ width: 220 }}
          />
          <FormControl size="small" sx={{ minWidth: 130 }}>
            <InputLabel>Priority</InputLabel>
            <Select
              value={priorityFilter}
              label="Priority"
              onChange={(e) => setPriorityFilter(e.target.value)}
            >
              <MenuItem value="All">All</MenuItem>
              <MenuItem value="High">High</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Low">Low</MenuItem>
            </Select>
          </FormControl>
        </Box>
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'title'}
                  direction={sortField === 'title' ? sortDir : 'asc'}
                  onClick={() => handleSort('title')}
                >
                  Product
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Hazard</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'recall_date'}
                  direction={sortField === 'recall_date' ? sortDir : 'asc'}
                  onClick={() => handleSort('recall_date')}
                >
                  Date
                </TableSortLabel>
              </TableCell>
              <TableCell sx={{ fontWeight: 600 }}>
                <TableSortLabel
                  active={sortField === 'priority'}
                  direction={sortField === 'priority' ? sortDir : 'asc'}
                  onClick={() => handleSort('priority')}
                >
                  Priority
                </TableSortLabel>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    {search || priorityFilter !== 'All'
                      ? 'No recalls match your filters.'
                      : 'No recalls found.'}
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((recall) => {
                const prior = prioritizations[recall.recall_id];
                const priority = prior?.priority;
                const priorityColors = priority ? getPriorityBgColor(priority) : null;
                return (
                  <TableRow
                    key={recall.recall_id}
                    hover
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/recalls/${recall.recall_id}`)}
                  >
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {recall.title || recall.product_name || recall.recall_id}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        Recall #{recall.recall_id}
                        {recall.manufacturer && <> &middot; {recall.manufacturer}</>}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="error.main" sx={{ fontSize: '0.825rem' }}>
                        {recall.hazard || '—'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{formatDate(recall.recall_date)}</Typography>
                    </TableCell>
                    <TableCell>
                      {priority && priorityColors ? (
                        <Chip
                          label={priority}
                          size="small"
                          variant="outlined"
                          sx={{
                            bgcolor: priorityColors.bgcolor,
                            color: priorityColors.color,
                            borderColor: priorityColors.borderColor,
                            fontWeight: 600,
                            fontSize: '0.75rem',
                          }}
                        />
                      ) : (
                        <Typography variant="caption" color="text.secondary">—</Typography>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
```

- [ ] **Step 2: Verify the recalls page renders**

Navigate to `/recalls`. Confirm:
- Clean data table with Product, Hazard, Date, Priority columns
- Search filters by product name, recall ID, manufacturer
- Priority dropdown filters by High/Medium/Low
- Clicking a row navigates to `/recalls/:id`
- Column headers sort on click
- No modal detail view anywhere

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/RecallsPage.jsx
git commit -m "feat: overhaul RecallsPage to clean data table"
```

---

### Task 5: Create Violation Modal on RecallDetailPage

**Files:**
- Modify: `client/src/components/ListingCard.jsx`
- Modify: `client/src/pages/RecallDetailPage.jsx`

Change the "Create Violation" button on ListingCard from navigating to `/violations/new` to calling a callback prop. Add a Create Violation modal dialog to RecallDetailPage.

- [ ] **Step 1: Update ListingCard to use callback instead of navigate**

Replace the full contents of `client/src/components/ListingCard.jsx`:

```jsx
import { Box, Typography, Paper, Chip, Button } from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { MARKETPLACE_COLORS, SOURCE_COLORS } from '../constants/violations';

export default function ListingCard({ listing, showViolationButton = true, onCreateViolation }) {
  const mktColors = MARKETPLACE_COLORS[listing.marketplace] || MARKETPLACE_COLORS.Other || {};
  const srcColors = SOURCE_COLORS[listing.source] || {};

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', alignItems: 'flex-start', gap: 2 }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography variant="body1" fontWeight={600} noWrap>
          {listing.title || 'Untitled Listing'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          {listing.marketplace && (
            <Chip
              label={listing.marketplace}
              size="small"
              sx={{
                bgcolor: mktColors.bg,
                color: mktColors.text,
                fontWeight: 500,
                fontSize: '0.7rem',
                height: 20,
              }}
            />
          )}
          {listing.source && (
            <Chip
              label={listing.source}
              size="small"
              variant="outlined"
              sx={{
                color: srcColors.text,
                borderColor: srcColors.text,
                fontSize: '0.7rem',
                height: 20,
              }}
            />
          )}
        </Box>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          {listing.seller_name && <>Seller: {listing.seller_name} &middot; </>}
          {listing.listed_at && <>Listed: {new Date(listing.listed_at).toLocaleDateString()}</>}
        </Typography>
        {listing.url && (
          <Typography
            variant="caption"
            component="a"
            href={listing.url}
            target="_blank"
            rel="noreferrer"
            sx={{ color: 'primary.main', display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
          >
            <ExternalLink size={12} /> View listing
          </Typography>
        )}
      </Box>
      {showViolationButton && onCreateViolation && (
        <Button
          variant="contained"
          size="small"
          color="error"
          onClick={() => onCreateViolation(listing)}
          sx={{ flexShrink: 0, mt: 0.5 }}
        >
          Create Violation
        </Button>
      )}
    </Paper>
  );
}
```

Key change: `onCreateViolation` callback prop replaces `useNavigate` to `/violations/new`.

- [ ] **Step 2: Add Create Violation Modal to RecallDetailPage**

In `client/src/pages/RecallDetailPage.jsx`, add the following imports at the top (merge with existing):

```jsx
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Snackbar,
} from '@mui/material';
import { VIOLATION_TYPES } from 'shared';
```

Then add the modal state and handler inside the `RecallDetailPage` component, after the existing state declarations (after line 36 `const [searchError, setSearchError] = useState(null);`):

```jsx
  // Create Violation modal state
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationListing, setViolationListing] = useState(null);
  const [violationType, setViolationType] = useState('');
  const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
  const [violationNotes, setViolationNotes] = useState('');
  const [violationSaving, setViolationSaving] = useState(false);
  const [violationError, setViolationError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  function openViolationModal(listing) {
    setViolationListing(listing);
    setViolationType('Recalled Product Listed for Sale');
    setViolationDate(new Date().toISOString().slice(0, 10));
    setViolationNotes('');
    setViolationError(null);
    setViolationModalOpen(true);
  }

  async function handleCreateViolation() {
    if (!violationType || !violationDate) {
      setViolationError('Violation type and date are required.');
      return;
    }
    setViolationSaving(true);
    setViolationError(null);
    try {
      const res = await apiFetch('/api/violations', session, {
        method: 'POST',
        body: JSON.stringify({
          listing_id: violationListing.listing_id,
          violation_type: violationType,
          date_of_violation: violationDate,
          recall_id: recall.recall_id,
          notes: violationNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const newViolation = await res.json();
      setViolations((prev) => [newViolation, ...prev]);
      setViolationModalOpen(false);
      setSnackbar('Violation created successfully');
    } catch (err) {
      setViolationError(err.message);
    } finally {
      setViolationSaving(false);
    }
  }
```

- [ ] **Step 3: Update the listings rendering to pass the callback**

In `RecallDetailPage.jsx`, find the listings map (around line 289 `{listings.map((listing) => (`). Replace the `<ListingCard>` usage:

```jsx
{listings.map((listing) => (
  <ListingCard
    key={listing.listing_id}
    listing={listing}
    onCreateViolation={openViolationModal}
  />
))}
```

- [ ] **Step 4: Add the modal dialog JSX**

At the bottom of the RecallDetailPage return, before the closing `</Box>`, add:

```jsx
      {/* Create Violation Modal */}
      <Dialog open={violationModalOpen} onClose={() => setViolationModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Violation</DialogTitle>
        <DialogContent>
          {violationListing && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, mt: 1, bgcolor: 'grey.50' }}>
              <Typography variant="body2" fontWeight={600}>
                {violationListing.title || 'Untitled Listing'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {violationListing.marketplace}
                {violationListing.seller_name && <> &middot; {violationListing.seller_name}</>}
              </Typography>
            </Paper>
          )}
          {violationError && <Alert severity="error" sx={{ mb: 2 }}>{violationError}</Alert>}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>Violation Type</InputLabel>
            <Select
              value={violationType}
              label="Violation Type"
              onChange={(e) => setViolationType(e.target.value)}
            >
              {VIOLATION_TYPES.map((t) => (
                <MenuItem key={t} value={t}>{t}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            label="Date of Violation"
            type="date"
            fullWidth
            value={violationDate}
            onChange={(e) => setViolationDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
            inputProps={{ max: new Date().toISOString().slice(0, 10) }}
            sx={{ mb: 2 }}
          />
          <TextField
            label="Notes (optional)"
            multiline
            minRows={2}
            fullWidth
            value={violationNotes}
            onChange={(e) => setViolationNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setViolationModalOpen(false)} disabled={violationSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleCreateViolation}
            disabled={violationSaving}
          >
            {violationSaving ? 'Saving...' : 'Submit'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
```

- [ ] **Step 5: Verify the Create Violation modal works**

Navigate to a recall detail page → Listings tab. Click "Create Violation" on a listing card. Confirm:
- Modal opens with listing info at top
- Violation type dropdown, date picker, notes field
- Submit creates violation and shows snackbar
- Modal closes, violation count updates on Violations tab
- No navigation away from the page

- [ ] **Step 6: Commit**

```bash
git add client/src/components/ListingCard.jsx client/src/pages/RecallDetailPage.jsx
git commit -m "feat: replace Create Violation page with modal dialog on RecallDetailPage"
```

---

### Task 6: ViolationsPage Redesign — Data Table with Expandable Rows

**Files:**
- Modify: `client/src/pages/ViolationsPage.jsx` (full rewrite)

Replace the 608-line page with a clean data table. Status filter pills at top. Clicking a row expands an inline detail panel with actions.

- [ ] **Step 1: Rewrite ViolationsPage.jsx**

Replace the full contents of `client/src/pages/ViolationsPage.jsx`:

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Collapse,
  IconButton,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { normalizeAppRole } from 'shared';
import {
  VIOLATION_STATUS_TABS,
  statusColor,
  MARKETPLACE_COLORS,
} from '../constants/violations';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function ViolationRow({ violation, onStatusChange }) {
  const [open, setOpen] = useState(false);
  const [updating, setUpdating] = useState(false);
  const navigate = useNavigate();
  const mktColors = MARKETPLACE_COLORS[violation.listing_marketplace] || {};

  const handleStatusUpdate = async (newStatus) => {
    setUpdating(true);
    try {
      await onStatusChange(violation.violation_id, {
        violation_status: newStatus,
        ...(newStatus === 'Notice Sent' ? { notice_sent_at: new Date().toISOString() } : {}),
      });
    } finally {
      setUpdating(false);
    }
  };

  return (
    <>
      <TableRow
        hover
        sx={{ cursor: 'pointer', '& > *': { borderBottom: open ? 'none' : undefined } }}
        onClick={() => setOpen(!open)}
      >
        <TableCell padding="checkbox">
          <IconButton size="small">
            {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
          </IconButton>
        </TableCell>
        <TableCell>
          <Typography variant="body2" fontWeight={600}>
            {violation.listing_title || `Violation #${violation.violation_id}`}
          </Typography>
          {violation.listing_marketplace && (
            <Chip
              label={violation.listing_marketplace}
              size="small"
              sx={{
                bgcolor: mktColors.bg,
                color: mktColors.text,
                fontSize: '0.65rem',
                height: 18,
                mt: 0.5,
              }}
            />
          )}
        </TableCell>
        <TableCell>
          <Typography variant="body2" sx={{ fontSize: '0.825rem' }}>
            {violation.violation_type || '—'}
          </Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{fmtDate(violation.date_of_violation)}</Typography>
        </TableCell>
        <TableCell>
          <Typography variant="body2">{violation.investigator_name || '—'}</Typography>
        </TableCell>
        <TableCell>
          <Chip
            label={violation.violation_status}
            color={statusColor(violation.violation_status)}
            size="small"
          />
        </TableCell>
      </TableRow>
      <TableRow>
        <TableCell sx={{ py: 0 }} colSpan={6}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ py: 2, px: 1 }}>
              <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                {violation.listing_url && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Listing URL:</strong>{' '}
                    <a href={violation.listing_url} target="_blank" rel="noreferrer">
                      {violation.listing_url}
                    </a>
                  </Typography>
                )}
                {violation.seller_name && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Seller:</strong> {violation.seller_name}
                    {violation.seller_email && ` (${violation.seller_email})`}
                  </Typography>
                )}
                {violation.notes && (
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Notes:</strong> {violation.notes}
                  </Typography>
                )}
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  {violation.violation_status === 'Open' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Notice Sent');
                      }}
                    >
                      Mark Notice Sent
                    </Button>
                  )}
                  {violation.violation_status === 'Notice Sent' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Response Received');
                      }}
                    >
                      Mark Response Received
                    </Button>
                  )}
                  {violation.violation_status === 'Response Received' && (
                    <Button
                      variant="contained"
                      size="small"
                      disabled={updating}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStatusUpdate('Closed');
                      }}
                    >
                      Close
                    </Button>
                  )}
                  {violation.recall_id && (
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/recalls/${violation.recall_id}`);
                      }}
                    >
                      View Recall
                    </Button>
                  )}
                </Box>
              </Paper>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
}

export default function ViolationsPage() {
  const { session } = useAuth();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/violations', session);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        setViolations(await res.json());
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleStatusChange = async (violationId, fields) => {
    const res = await apiFetch(`/api/violations/${violationId}`, session, {
      method: 'PATCH',
      body: JSON.stringify(fields),
    });
    if (!res.ok) throw new Error(await getApiErrorMessage(res));
    const updated = await res.json();
    setViolations((prev) =>
      prev.map((v) => (v.violation_id === violationId ? updated : v)),
    );
  };

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== 'All') {
      list = list.filter((v) => v.violation_status === statusFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.listing_title || '').toLowerCase().includes(q) ||
          (v.violation_type || '').toLowerCase().includes(q) ||
          (v.investigator_name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [violations, statusFilter, search]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Violations{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <TextField
          size="small"
          placeholder="Search violations..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>

      {/* Status filter pills */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {VIOLATION_STATUS_TABS.map((status) => {
          const count = status === 'All'
            ? violations.length
            : violations.filter((v) => v.violation_status === status).length;
          return (
            <Chip
              key={status}
              label={`${status} (${count})`}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              color={statusFilter === status ? 'primary' : 'default'}
              onClick={() => setStatusFilter(status)}
              sx={{ fontWeight: statusFilter === status ? 600 : 400 }}
            />
          );
        })}
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox" />
              <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Violation Type</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Investigator</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">No violations found.</Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => (
                <ViolationRow
                  key={v.violation_id}
                  violation={v}
                  onStatusChange={handleStatusChange}
                />
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}
```

- [ ] **Step 2: Verify the violations page renders**

Navigate to `/violations`. Confirm:
- Clean data table with Listing, Violation Type, Date, Investigator, Status columns
- Status filter pills (All, Open, Notice Sent, Response Received, Closed) with counts
- Clicking a row expands inline detail with listing URL, seller info, notes
- "Mark Notice Sent" button works on Open violations
- "View Recall" button navigates to the recall detail page
- Search filters by listing title, type, or investigator name

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/ViolationsPage.jsx
git commit -m "feat: redesign ViolationsPage with data table and expandable rows"
```

---

### Task 7: ResponsesPage Rebuild — Violation Status Tracker

**Files:**
- Modify: `client/src/pages/ResponsesPage.jsx` (full rewrite)

Rebuild as a filtered view of violations with status "Notice Sent" or beyond. Shows days elapsed, seller info, and response tracking.

- [ ] **Step 1: Rewrite ResponsesPage.jsx**

Replace the full contents of `client/src/pages/ResponsesPage.jsx`:

```jsx
import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Alert,
  CircularProgress,
  Chip,
  Button,
  Collapse,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Snackbar,
} from '@mui/material';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import KeyboardArrowUpIcon from '@mui/icons-material/KeyboardArrowUp';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { statusColor } from '../constants/violations';

function fmtDate(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function daysElapsed(dateStr) {
  if (!dateStr) return '—';
  const sent = new Date(dateStr);
  const now = new Date();
  const diff = Math.floor((now - sent) / (1000 * 60 * 60 * 24));
  return diff;
}

const STATUS_FILTERS = ['All', 'Awaiting Response', 'Response Received', 'Closed'];

function mapResponseStatus(violationStatus) {
  if (violationStatus === 'Notice Sent') return 'Awaiting Response';
  return violationStatus;
}

export default function ResponsesPage() {
  const { session } = useAuth();
  const navigate = useNavigate();
  const [violations, setViolations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [search, setSearch] = useState('');

  // Response dialog state
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogViolation, setDialogViolation] = useState(null);
  const [responseNotes, setResponseNotes] = useState('');
  const [responseSaving, setResponseSaving] = useState(false);
  const [snackbar, setSnackbar] = useState(null);

  // Expanded rows
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await apiFetch('/api/violations', session);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const all = await res.json();
        // Only show violations that have reached "Notice Sent" or beyond
        setViolations(all.filter((v) =>
          ['Notice Sent', 'Response Received', 'Closed'].includes(v.violation_status),
        ));
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [session]);

  const handleMarkReceived = (violation) => {
    setDialogViolation(violation);
    setResponseNotes('');
    setDialogOpen(true);
  };

  const handleSubmitResponse = async () => {
    setResponseSaving(true);
    try {
      const res = await apiFetch(`/api/violations/${dialogViolation.violation_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          violation_status: 'Response Received',
          notes: responseNotes.trim() || undefined,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setViolations((prev) =>
        prev.map((v) => (v.violation_id === updated.violation_id ? updated : v)),
      );
      setDialogOpen(false);
      setSnackbar('Response recorded');
    } catch (err) {
      setError(err.message);
    } finally {
      setResponseSaving(false);
    }
  };

  const handleClose = async (violationId) => {
    try {
      const res = await apiFetch(`/api/violations/${violationId}`, session, {
        method: 'PATCH',
        body: JSON.stringify({ violation_status: 'Closed' }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setViolations((prev) =>
        prev.map((v) => (v.violation_id === updated.violation_id ? updated : v)),
      );
      setSnackbar('Violation closed');
    } catch (err) {
      setError(err.message);
    }
  };

  const filtered = useMemo(() => {
    let list = violations;
    if (statusFilter !== 'All') {
      if (statusFilter === 'Awaiting Response') {
        list = list.filter((v) => v.violation_status === 'Notice Sent');
      } else {
        list = list.filter((v) => v.violation_status === statusFilter);
      }
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (v) =>
          (v.listing_title || '').toLowerCase().includes(q) ||
          (v.seller_name || '').toLowerCase().includes(q),
      );
    }
    return list;
  }, [violations, statusFilter, search]);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  return (
    <Box>
      {/* Toolbar */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2, flexWrap: 'wrap', gap: 2 }}>
        <Typography variant="h5" fontWeight={700}>
          Responses{' '}
          <Typography component="span" variant="h5" color="text.secondary" fontWeight={400}>
            ({filtered.length})
          </Typography>
        </Typography>
        <TextField
          size="small"
          placeholder="Search..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ width: 220 }}
        />
      </Box>

      {/* Status filter pills */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        {STATUS_FILTERS.map((status) => {
          const count = status === 'All'
            ? violations.length
            : status === 'Awaiting Response'
              ? violations.filter((v) => v.violation_status === 'Notice Sent').length
              : violations.filter((v) => v.violation_status === status).length;
          return (
            <Chip
              key={status}
              label={`${status} (${count})`}
              variant={statusFilter === status ? 'filled' : 'outlined'}
              color={statusFilter === status ? 'primary' : 'default'}
              onClick={() => setStatusFilter(status)}
              sx={{ fontWeight: statusFilter === status ? 600 : 400 }}
            />
          );
        })}
      </Box>

      {/* Data Table */}
      <TableContainer component={Paper} variant="outlined">
        <Table>
          <TableHead>
            <TableRow sx={{ bgcolor: 'grey.50' }}>
              <TableCell padding="checkbox" />
              <TableCell sx={{ fontWeight: 600 }}>Listing</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Seller</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Notice Sent</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Response Date</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Status</TableCell>
              <TableCell sx={{ fontWeight: 600 }}>Days Elapsed</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                  <Typography color="text.secondary">
                    No responses to track yet. Violations will appear here once notices are sent.
                  </Typography>
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((v) => {
                const isOpen = expandedId === v.violation_id;
                const days = daysElapsed(v.notice_sent_at);
                return (
                  <React.Fragment key={v.violation_id}>
                    <TableRow
                      hover
                      sx={{ cursor: 'pointer', '& > *': { borderBottom: isOpen ? 'none' : undefined } }}
                      onClick={() => setExpandedId(isOpen ? null : v.violation_id)}
                    >
                      <TableCell padding="checkbox">
                        <IconButton size="small">
                          {isOpen ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
                        </IconButton>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {v.listing_title || `Violation #${v.violation_id}`}
                        </Typography>
                        {v.listing_marketplace && (
                          <Typography variant="caption" color="text.secondary">
                            {v.listing_marketplace}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{v.seller_name || '—'}</Typography>
                        {v.seller_email && (
                          <Typography variant="caption" color="text.secondary">
                            {v.seller_email}
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">{fmtDate(v.notice_sent_at)}</Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {v.latest_response ? fmtDate(v.latest_response.responded_at) : '—'}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={mapResponseStatus(v.violation_status)}
                          color={statusColor(v.violation_status)}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        <Typography
                          variant="body2"
                          fontWeight={600}
                          color={typeof days === 'number' && days > 14 ? 'error.main' : 'text.primary'}
                        >
                          {typeof days === 'number' ? `${days}d` : days}
                        </Typography>
                      </TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell sx={{ py: 0 }} colSpan={7}>
                        <Collapse in={isOpen} timeout="auto" unmountOnExit>
                          <Box sx={{ py: 2, px: 1 }}>
                            <Paper variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Violation Type:</strong> {v.violation_type || '—'}
                              </Typography>
                              <Typography variant="body2" sx={{ mb: 1 }}>
                                <strong>Date of Violation:</strong> {fmtDate(v.date_of_violation)}
                              </Typography>
                              {v.notes && (
                                <Typography variant="body2" sx={{ mb: 1 }}>
                                  <strong>Notes:</strong> {v.notes}
                                </Typography>
                              )}
                              <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                {v.violation_status === 'Notice Sent' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleMarkReceived(v);
                                    }}
                                  >
                                    Mark Response Received
                                  </Button>
                                )}
                                {v.violation_status === 'Response Received' && (
                                  <Button
                                    variant="contained"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleClose(v.violation_id);
                                    }}
                                  >
                                    Close
                                  </Button>
                                )}
                                {v.recall_id && (
                                  <Button
                                    variant="outlined"
                                    size="small"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/recalls/${v.recall_id}`);
                                    }}
                                  >
                                    View Recall
                                  </Button>
                                )}
                              </Box>
                            </Paper>
                          </Box>
                        </Collapse>
                      </TableCell>
                    </TableRow>
                  </React.Fragment>
                );
              })
            )}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Mark Response Received Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Record Response</DialogTitle>
        <DialogContent>
          {dialogViolation && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 1 }}>
              Recording response for: <strong>{dialogViolation.listing_title}</strong>
            </Typography>
          )}
          <TextField
            label="Response Notes"
            multiline
            minRows={3}
            fullWidth
            value={responseNotes}
            onChange={(e) => setResponseNotes(e.target.value)}
            placeholder="What did the seller respond with?"
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)} disabled={responseSaving}>Cancel</Button>
          <Button variant="contained" onClick={handleSubmitResponse} disabled={responseSaving}>
            {responseSaving ? 'Saving...' : 'Record Response'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!snackbar}
        autoHideDuration={3000}
        onClose={() => setSnackbar(null)}
        message={snackbar}
      />
    </Box>
  );
}
```

- [ ] **Step 2: Add React import for Fragment**

At the top of the file, ensure `React` is imported (needed for `React.Fragment`):

```jsx
import React, { useState, useEffect, useMemo } from 'react';
```

- [ ] **Step 3: Verify the Responses page renders**

Navigate to `/responses`. Confirm:
- Shows only violations with status "Notice Sent", "Response Received", or "Closed"
- Status filter pills: All, Awaiting Response, Response Received, Closed
- Table shows: Listing, Seller, Notice Sent date, Response Date, Status, Days Elapsed
- Days > 14 show in red
- "Mark Response Received" opens dialog with notes field
- "Close" button closes violations
- "View Recall" navigates to recall detail

- [ ] **Step 4: Commit**

```bash
git add client/src/pages/ResponsesPage.jsx
git commit -m "feat: rebuild ResponsesPage as violation status tracker"
```

---

### Task 8: Dashboard Update — Analytics Link

**Files:**
- Modify: `client/src/pages/DashboardPage.jsx`

Add a "View Full Analytics" button that links to `/analytics`.

- [ ] **Step 1: Add analytics link to DashboardPage**

In `client/src/pages/DashboardPage.jsx`, find the end of the charts section (after the last chart `</Paper>` closing tag, before the component's return closing). Add:

```jsx
<Box sx={{ textAlign: 'center', mt: 3 }}>
  <Button
    variant="outlined"
    onClick={() => navigate('/analytics')}
  >
    View Full Analytics
  </Button>
</Box>
```

Also ensure `useNavigate` is imported and initialized:

```jsx
import { useNavigate } from 'react-router-dom';
```

And inside the component:

```jsx
const navigate = useNavigate();
```

- [ ] **Step 2: Verify the dashboard**

Navigate to `/dashboard`. Confirm:
- KPI cards render
- Charts render
- "View Full Analytics" button appears below charts
- Clicking it navigates to `/analytics`

- [ ] **Step 3: Commit**

```bash
git add client/src/pages/DashboardPage.jsx
git commit -m "feat: add analytics link to dashboard"
```

---

### Task 9: Cleanup — Remove Dead Files and References

**Files:**
- Delete: `client/src/pages/CreateViolationPage.jsx`
- Delete: `client/src/pages/AdjudicationsPage.jsx`
- Delete: `client/src/pages/InvestigatorsPage.jsx`

These pages are no longer routed to in App.jsx. Remove them to avoid confusion.

- [ ] **Step 1: Delete dead page files**

```bash
rm client/src/pages/CreateViolationPage.jsx
rm client/src/pages/AdjudicationsPage.jsx
rm client/src/pages/InvestigatorsPage.jsx
```

- [ ] **Step 2: Verify the app builds without errors**

Run: `cd client && npm run build`

If there are any import errors referencing deleted files, fix them. The App.jsx rewrite in Task 3 already removed these imports. Check for any other files that import them.

- [ ] **Step 3: Verify full app flow end-to-end**

1. Login → lands on Dashboard (tab highlighted)
2. Click Recalls tab → clean data table, search/filter works
3. Click a recall row → RecallDetailPage with tabs
4. Click Listings tab → search eBay/marketplaces/add manually
5. Click "Create Violation" on a listing → modal opens, submit works
6. Click Violations tab → data table with expandable rows, status updates work
7. Click Responses tab → filtered view, "Mark Response Received" dialog works
8. Click gear icon → Settings page with Profile tab (admin sees Users & Import tabs)
9. No sidebar visible anywhere
10. All routes redirect properly (old routes like `/profile` redirect to `/dashboard`)

- [ ] **Step 4: Commit**

```bash
git add -A
git commit -m "chore: remove dead pages (CreateViolation, Adjudications, Investigators)"
```

---

### Summary

| Task | What it does | Files |
|------|-------------|-------|
| 1 | DB migration + server data layer | migration SQL, supabaseViolationData.js |
| 2 | Remove sidebar, add tab bar | Layout.jsx |
| 3 | Settings page + routing update | SettingsPage.jsx (new), App.jsx |
| 4 | Recalls page overhaul | RecallsPage.jsx |
| 5 | Create Violation modal | ListingCard.jsx, RecallDetailPage.jsx |
| 6 | Violations page redesign | ViolationsPage.jsx |
| 7 | Responses page rebuild | ResponsesPage.jsx |
| 8 | Dashboard analytics link | DashboardPage.jsx |
| 9 | Remove dead files | Delete 3 pages, verify build |

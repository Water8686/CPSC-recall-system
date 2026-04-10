import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  Button,
  CircularProgress,
  Alert,
  Chip,
  Grid,
  Accordion,
  AccordionSummary,
  AccordionDetails,
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import SearchIcon from '@mui/icons-material/Search';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import ListingCard from '../components/ListingCard';
import DiscoveryPanel from '../components/DiscoveryPanel';
import AddListingDialog from '../components/AddListingDialog';
import { statusColor } from '../constants/violations';
import { getPriorityBgColor } from '../constants/priorities';
import {
  VIOLATION_TYPES,
  PRIORITY_LEVELS,
  canAccessManagerFeatures,
  canFileViolations,
  normalizeAppRole,
} from 'shared';

const ASSIGNABLE_ROLES = new Set(['admin', 'manager', 'investigator']);

export default function RecallDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { session, profile, user } = useAuth();
  const role = normalizeAppRole(
    profile,
    user?.user_metadata?.role ?? user?.app_metadata?.role,
  );
  const canManageTriage = canAccessManagerFeatures(role);
  const investigatorCanFile = canFileViolations(role);

  const [recall, setRecall] = useState(null);
  const recallPk = recall ? Number(recall.id) : null;
  const [listings, setListings] = useState([]);
  const [violations, setViolations] = useState([]);
  const [tab, setTab] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [addListingOpen, setAddListingOpen] = useState(false);

  const [searching, setSearching] = useState(false);
  const [searchResults, setSearchResults] = useState([]);
  const [searchError, setSearchError] = useState(null);

  // Create Violation modal state
  const [violationModalOpen, setViolationModalOpen] = useState(false);
  const [violationListing, setViolationListing] = useState(null);
  const [violationType, setViolationType] = useState('');
  const [violationDate, setViolationDate] = useState(new Date().toISOString().slice(0, 10));
  const [violationNotes, setViolationNotes] = useState('');
  const [violationSaving, setViolationSaving] = useState(false);
  const [violationError, setViolationError] = useState(null);
  const [snackbar, setSnackbar] = useState(null);

  const [assignableUsers, setAssignableUsers] = useState([]);
  const [priorityDraft, setPriorityDraft] = useState('');
  const [investigatorDraft, setInvestigatorDraft] = useState('');
  const [triageSaving, setTriageSaving] = useState(false);
  const [triageError, setTriageError] = useState(null);

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
          recall_id: recallPk,
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

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const recallRes = await apiFetch(`/api/recalls/${id}`, session);
        if (!recallRes.ok) throw new Error(await getApiErrorMessage(recallRes));
        const recallData = await recallRes.json();
        setRecall(recallData);

        const recallPk = recallData ? Number(recallData.id) : null;
        if (!Number.isFinite(recallPk)) throw new Error('Invalid recall id');

        const listingsRes = await apiFetch(
          `/api/listings?recall_id=${recallPk}`,
          session,
        );
        if (listingsRes.ok) {
          setListings(await listingsRes.json());
        }

        const violationsRes = await apiFetch('/api/violations', session);
        if (violationsRes.ok) {
          const allViolations = await violationsRes.json();
          setViolations(
            allViolations.filter(
              (v) => v.recall_id === recallPk,
            ),
          );
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [id, session]);

  useEffect(() => {
    if (!recall) return;
    setPriorityDraft(recall.priority || '');
    setInvestigatorDraft(
      recall.investigator_user_id != null ? String(recall.investigator_user_id) : '',
    );
    setTriageError(null);
  }, [recall?.recall_id, recall?.priority, recall?.investigator_user_id]);

  useEffect(() => {
    if (!canManageTriage || !session) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch('/api/users', session);
        if (!res.ok || cancelled) return;
        const rows = await res.json();
        if (cancelled) return;
        setAssignableUsers(
          (rows ?? []).filter(
            (u) => u.approved !== false && ASSIGNABLE_ROLES.has(u.role),
          ),
        );
      } catch {
        /* non-fatal */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [canManageTriage, session]);

  async function handleSaveTriage() {
    if (!recall) return;
    const recallNum = recall.recall_id;
    if (!priorityDraft) {
      setTriageError('Choose a priority to save triage.');
      return;
    }
    const curPrio = recall.priority || '';
    const curInv = recall.investigator_user_id;
    const newInv =
      investigatorDraft === '' ? null : Number.parseInt(investigatorDraft, 10);
    if (investigatorDraft === '' && curInv != null) {
      setTriageError(
        'Pick an investigator to reassign. Clearing an assignment is not supported yet.',
      );
      return;
    }
    const needPrio = priorityDraft !== curPrio;
    const needAsg =
      newInv != null &&
      Number.isFinite(newInv) &&
      newInv !== Number(curInv);

    if (!needPrio && !needAsg) {
      setSnackbar('No changes to save');
      return;
    }

    setTriageSaving(true);
    setTriageError(null);
    try {
      if (needPrio) {
        const res = await apiFetch('/api/prioritizations', session, {
          method: 'POST',
          body: JSON.stringify({ recall_id: recallNum, priority: priorityDraft }),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const p = await res.json();
        setRecall((prev) => (prev ? { ...prev, priority: p.priority } : prev));
      }
      if (needAsg) {
        const res = await apiFetch('/api/assignments', session, {
          method: 'POST',
          body: JSON.stringify({
            recall_id: recallNum,
            investigator_user_id: newInv,
          }),
        });
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const a = await res.json();
        const picked = assignableUsers.find(
          (u) => Number(u.user_id) === Number(a.investigator_user_id),
        );
        setRecall((prev) =>
          prev
            ? {
                ...prev,
                investigator_user_id: a.investigator_user_id,
                investigator_name:
                  (picked?.full_name && String(picked.full_name).trim()) ||
                  picked?.email ||
                  prev.investigator_name,
              }
            : prev,
        );
      }
      setSnackbar('Priority and assignment updated');
    } catch (err) {
      setTriageError(err.message);
    } finally {
      setTriageSaving(false);
    }
  }

  async function handleSearch(endpoint) {
    if (!recall) return;
    setSearching(true);
    setSearchError(null);
    setSearchResults([]);
    try {
      const res = await apiFetch(endpoint, session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallPk,
          query: recall.product_name || recall.recall_title,
        }),
      });
      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Search failed');
        setSearchError(msg);
        return;
      }
      const data = await res.json();
      if (data.warning) setSearchError(data.warning);
      setSearchResults(data.results || []);
    } catch (err) {
      setSearchError(err.message);
    } finally {
      setSearching(false);
    }
  }

  async function handleAddSearchResult(result) {
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallPk,
          url: result.url,
          marketplace: result.marketplace,
          title: result.title,
          description: result.description || null,
          source: result.source,
          listed_at: result.listed_at || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const newListing = await res.json();
      setListings((prev) => [newListing, ...prev]);
      setSearchResults((prev) =>
        prev.filter((r) => r.url !== result.url),
      );
    } catch (err) {
      setSearchError('Failed to save listing: ' + err.message);
    }
  }

  function handleListingAdded(listing) {
    setListings((prev) => [listing, ...prev]);
  }

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error || !recall) {
    return (
      <Box>
        <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recalls')} sx={{ mb: 2 }}>
          Back to Recalls
        </Button>
        <Alert severity={error ? 'error' : 'warning'}>{error || 'Recall not found.'}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Button startIcon={<ArrowBackIcon />} onClick={() => navigate('/recalls')} sx={{ mb: 2 }}>
        Back to Recalls
      </Button>

      {/* Recall header */}
      <Paper sx={{ p: 3, mb: 2, bgcolor: '#e3f2fd', borderColor: '#bbdefb' }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 2 }}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'start', minWidth: 0 }}>
            {recall.image_url && (
              <Box
                component="img"
                src={recall.image_url}
                alt={recall.product_name || recall.recall_title || 'Recall image'}
                loading="lazy"
                sx={{
                  width: 96,
                  height: 96,
                  objectFit: 'cover',
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: 'divider',
                  bgcolor: 'background.paper',
                  flexShrink: 0,
                }}
              />
            )}

            <Box sx={{ minWidth: 0 }}>
            <Typography variant="caption" fontWeight={700} color="primary">
              RECALL #{recall.recall_number || recall.recall_id}
            </Typography>
            <Typography variant="h5" fontWeight={700} sx={{ mt: 0.5 }}>
              {recall.product_name || recall.recall_title || 'Untitled Recall'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              {[recall.manufacturer, recall.number_of_units ? `${recall.number_of_units} units` : null, recall.recall_date ? `Recalled ${new Date(recall.recall_date).toLocaleDateString()}` : null].filter(Boolean).join(' \u00b7 ')}
            </Typography>
          </Box>
          </Box>
          <Box sx={{ textAlign: 'right', minWidth: 140 }}>
            <Typography variant="h4" fontWeight={700} color="error.main">
              {listings.length}
            </Typography>
            <Typography variant="caption" color="text.secondary" display="block">
              Active Listings
            </Typography>
            <Box sx={{ mt: 1.5, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.75 }}>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                Priority
              </Typography>
              {recall.priority ? (
                <Chip
                  label={recall.priority}
                  size="small"
                  variant="outlined"
                  sx={{
                    ...getPriorityBgColor(recall.priority),
                    fontWeight: 600,
                  }}
                />
              ) : (
                <Typography variant="caption" color="text.secondary">
                  Not set
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mt: 0.5 }}>
                Investigator
              </Typography>
              <Typography variant="body2" fontWeight={500} sx={{ maxWidth: 200, textAlign: 'right' }}>
                {recall.investigator_name ||
                  (recall.investigator_user_id != null
                    ? `User #${recall.investigator_user_id}`
                    : 'Unassigned')}
              </Typography>
            </Box>
          </Box>
        </Box>

        {canManageTriage && (
          <Box
            sx={{
              mt: 2,
              pt: 2,
              borderTop: '1px solid',
              borderColor: 'divider',
              display: 'flex',
              flexWrap: 'wrap',
              gap: 2,
              alignItems: 'flex-end',
            }}
          >
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Set priority</InputLabel>
              <Select
                label="Set priority"
                value={priorityDraft}
                onChange={(e) => setPriorityDraft(e.target.value)}
              >
                <MenuItem value="">
                  <em>Select priority</em>
                </MenuItem>
                <MenuItem value={PRIORITY_LEVELS.HIGH}>{PRIORITY_LEVELS.HIGH}</MenuItem>
                <MenuItem value={PRIORITY_LEVELS.MEDIUM}>{PRIORITY_LEVELS.MEDIUM}</MenuItem>
                <MenuItem value={PRIORITY_LEVELS.LOW}>{PRIORITY_LEVELS.LOW}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" sx={{ minWidth: 220 }}>
              <InputLabel>Assign investigator</InputLabel>
              <Select
                label="Assign investigator"
                value={investigatorDraft}
                onChange={(e) => setInvestigatorDraft(e.target.value)}
                displayEmpty
              >
                <MenuItem value="">
                  <em>No investigator</em>
                </MenuItem>
                {assignableUsers.map((u) => (
                  <MenuItem key={u.user_id} value={String(u.user_id)}>
                    {(u.full_name && u.full_name.trim()) || u.email || `User ${u.user_id}`}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              variant="contained"
              onClick={handleSaveTriage}
              disabled={triageSaving || !priorityDraft}
            >
              {triageSaving ? 'Saving…' : 'Save triage'}
            </Button>
            {triageError && (
              <Typography variant="caption" color="error" sx={{ width: '100%' }}>
                {triageError}
              </Typography>
            )}
          </Box>
        )}
      </Paper>

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Details" />
        <Tab label={`Listings (${listings.length})`} />
        <Tab label={`Violations (${violations.length})`} />
      </Tabs>

      {/* Details tab */}
      {tab === 0 && (
        <Paper sx={{ p: 3 }}>
          <Grid container spacing={2}>
            {[
              ['Product', recall.product_name],
              ['Manufacturer', recall.manufacturer],
              ['Model Number', recall.model_number],
              ['Hazard', recall.hazard],
              ['Remedy', recall.remedy],
              ['Units', recall.number_of_units],
              ['UPC', recall.upc],
              ['Recall Date', recall.recall_date ? new Date(recall.recall_date).toLocaleDateString() : null],
              ['Last Publish Date', recall.last_publish_date ? new Date(recall.last_publish_date).toLocaleDateString() : null],
              ['Recall URL', recall.recall_url],
              ['Added to System', recall.added_at ? new Date(recall.added_at).toLocaleDateString() : null],
              ['Description', recall.recall_description],
            ]
              .filter(([, v]) => v)
              .map(([label, value]) => (
                <Grid item xs={12} md={6} key={label}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    {label.toUpperCase()}
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {label === 'Recall URL' ? (
                      <a href={String(value)} target="_blank" rel="noreferrer">
                        {String(value)}
                      </a>
                    ) : (
                      value
                    )}
                  </Typography>
                </Grid>
              ))}
          </Grid>
        </Paper>
      )}

      {/* Listings tab */}
      {tab === 1 && (
        <Box>
          <DiscoveryPanel
            recallId={recallPk}
            onCreateViolation={openViolationModal}
            canCreateViolation={investigatorCanFile}
          />

          <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ flex: 1, minWidth: 220 }}>
              Saved listings
            </Typography>
            <Button
              variant="contained"
              startIcon={<AddIcon />}
              onClick={() => setAddListingOpen(true)}
            >
              Add Manually
            </Button>
          </Box>

          <Accordion variant="outlined" sx={{ mb: 2 }}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography variant="body2" fontWeight={600}>
                More search options
              </Typography>
            </AccordionSummary>
            <AccordionDetails>
              <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  startIcon={<SearchIcon />}
                  onClick={() => handleSearch('/api/listings/search/ebay')}
                  disabled={searching}
                  sx={{ borderColor: '#bbdefb', color: '#0D47A1', bgcolor: '#e3f2fd' }}
                >
                  Search eBay (API)
                </Button>
                <Typography variant="caption" color="text.secondary">
                  This is optional and does not run verification.
                </Typography>
              </Box>

              {searchError && <Alert severity="warning" sx={{ mb: 2 }}>{searchError}</Alert>}
              {searching && <CircularProgress sx={{ display: 'block', mx: 'auto', my: 2 }} />}

              {searchResults.length > 0 && (
                <Box sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                    Search Results — click Add to save
                  </Typography>
                  {searchResults.map((r, i) => (
                    <Paper
                      key={r.url || i}
                      sx={{ p: 2, mb: 1, display: 'flex', alignItems: 'center', gap: 2 }}
                    >
                      <Box sx={{ flex: 1, minWidth: 0 }}>
                        <Typography fontWeight={600} noWrap>
                          {r.title || 'Untitled'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {r.marketplace} {r.price ? `\u00b7 $${r.price}` : '\u00b7 Price N/A'}
                        </Typography>
                      </Box>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleAddSearchResult(r)}
                      >
                        Add
                      </Button>
                    </Paper>
                  ))}
                </Box>
              )}
            </AccordionDetails>
          </Accordion>

          {listings.length === 0 && !searching && (
            <Alert severity="info">
              No listings found for this recall. Use the buttons above to discover or add listings.
            </Alert>
          )}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            {listings.map((listing) => (
              <ListingCard
                key={listing.listing_id}
                listing={listing}
                showViolationButton={investigatorCanFile}
                investigatorActions={investigatorCanFile}
                onCreateViolation={openViolationModal}
                onListingUpdated={(u) =>
                  setListings((prev) =>
                    prev.map((l) => (l.listing_id === u.listing_id ? { ...l, ...u } : l)),
                  )
                }
              />
            ))}
          </Box>

          <AddListingDialog
            open={addListingOpen}
            onClose={() => setAddListingOpen(false)}
            recallId={recallPk}
            onListingAdded={handleListingAdded}
          />
        </Box>
      )}

      {/* Violations tab */}
      {tab === 2 && (
        <Box>
          {violations.length === 0 ? (
            <Alert severity="info">
              No violations filed for this recall yet. Go to the Listings tab to discover listings and create violations.
            </Alert>
          ) : (
            violations.map((v) => (
              <Paper key={v.violation_id} sx={{ p: 2, mb: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Box>
                    <Typography fontWeight={600}>
                      {v.listing_title || `Violation #${v.violation_id}`}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {v.violation_type ?? 'No type'} {'\u00b7'} {v.date_of_violation ? new Date(v.date_of_violation).toLocaleDateString() : 'No date'} {'\u00b7'} {v.investigator_name || 'Unknown investigator'}
                    </Typography>
                  </Box>
                  <Chip
                    label={v.violation_status}
                    color={statusColor(v.violation_status)}
                    size="small"
                  />
                </Box>
              </Paper>
            ))
          )}
        </Box>
      )}

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
    </Box>
  );
}

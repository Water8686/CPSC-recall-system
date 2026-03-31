import { useState, useEffect, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell,
  TableContainer, TableHead, TableRow, Button, Chip,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, MenuItem, Select, FormControl, InputLabel,
  Alert, CircularProgress, Tabs, Tab, Tooltip, IconButton,
  Link as MuiLink,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined';
import GavelIcon from '@mui/icons-material/Gavel';
import SendIcon from '@mui/icons-material/Send';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { normalizeAppRole } from 'shared';

const MARKETPLACES = ['eBay', 'Craigslist', 'Amazon', 'Facebook Marketplace', 'Etsy', 'Other'];
const VIOLATION_STATUS_TABS = ['All', 'Open', 'Notice Sent', 'Response Received', 'Closed'];

function statusColor(status) {
  switch (status) {
    case 'Open': return 'warning';
    case 'Notice Sent': return 'info';
    case 'Response Received': return 'secondary';
    case 'Closed': return 'default';
    default: return 'default';
  }
}

function AnnotationChip({ val }) {
  if (val === true)  return <Chip label="True match" color="error" size="small" icon={<CheckCircleOutlineIcon />} />;
  if (val === false) return <Chip label="False positive" color="success" size="small" icon={<CancelOutlinedIcon />} />;
  return <Chip label="Unannotated" size="small" variant="outlined" />;
}

function fmtDate(v) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString();
}

// ─── Add Listing Dialog ───────────────────────────────────────────────────────

function AddListingDialog({ open, onClose, onSave, session, recallOptions }) {
  const [recallId, setRecallId] = useState('');
  const [url, setUrl] = useState('');
  const [marketplace, setMarketplace] = useState('eBay');
  const [title, setTitle] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function reset() {
    setRecallId(''); setUrl(''); setMarketplace('eBay'); setTitle('');
    setPrice(''); setDescription(''); setError('');
  }

  async function handleSave() {
    if (!recallId) { setError('Select a recall'); return; }
    if (!url.trim()) { setError('Listing URL is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallId,
          url: url.trim(),
          marketplace: marketplace || 'Unknown',
          title: title.trim() || null,
          price: price ? Number(price) : null,
          description: description.trim() || null,
        }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to add listing')); return; }
      onSave(await res.json());
      reset();
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={() => { reset(); onClose(); }} maxWidth="sm" fullWidth>
      <DialogTitle>Add Marketplace Listing</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl fullWidth required>
          <InputLabel>Recall</InputLabel>
          <Select value={recallId} label="Recall" onChange={(e) => setRecallId(e.target.value)}>
            {recallOptions.map((r) => (
              <MenuItem key={r.recall_id} value={r.recall_id}>
                {r.recall_number} — {r.recall_title ?? r.product ?? ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <TextField
          label="Listing URL" required fullWidth value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://www.ebay.com/itm/..."
        />
        <FormControl fullWidth>
          <InputLabel>Marketplace</InputLabel>
          <Select value={marketplace} label="Marketplace" onChange={(e) => setMarketplace(e.target.value)}>
            {MARKETPLACES.map((m) => <MenuItem key={m} value={m}>{m}</MenuItem>)}
          </Select>
        </FormControl>
        <TextField label="Listing title" fullWidth value={title} onChange={(e) => setTitle(e.target.value)} />
        <TextField
          label="Price ($)" type="number" fullWidth value={price}
          onChange={(e) => setPrice(e.target.value)} inputProps={{ min: 0, step: '0.01' }}
        />
        <TextField
          label="Description / notes" multiline rows={2} fullWidth
          value={description} onChange={(e) => setDescription(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => { reset(); onClose(); }}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Add listing'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Annotate Dialog ─────────────────────────────────────────────────────────

function AnnotateDialog({ open, onClose, listing, onSave, session }) {
  const [isTrueMatch, setIsTrueMatch] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (listing) {
      setIsTrueMatch(listing.is_true_match === true ? 'true' : listing.is_true_match === false ? 'false' : '');
      setNotes(listing.annotation_notes ?? '');
    }
    setError('');
  }, [listing]);

  async function handleSave() {
    if (isTrueMatch === '') { setError('Select true match or false positive'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch(`/api/listings/${listing.listing_id}/annotate`, session, {
        method: 'PATCH',
        body: JSON.stringify({ is_true_match: isTrueMatch === 'true', annotation_notes: notes }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to annotate')); return; }
      onSave(await res.json());
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Annotate Listing</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {listing && (
          <Box sx={{ bgcolor: 'action.hover', p: 1.5, borderRadius: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>{listing.recall_title}</Typography>
            <MuiLink href={listing.url} target="_blank" rel="noopener" variant="body2"
              sx={{ wordBreak: 'break-all', fontSize: '0.8rem' }}>
              {listing.url}
            </MuiLink>
          </Box>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <FormControl fullWidth required>
          <InputLabel>Annotation</InputLabel>
          <Select value={isTrueMatch} label="Annotation" onChange={(e) => setIsTrueMatch(e.target.value)}>
            <MenuItem value="true">True match — this is a violation</MenuItem>
            <MenuItem value="false">False positive — not a match</MenuItem>
          </Select>
        </FormControl>
        <TextField
          label="Commentary (why it is / isn't a violation)" multiline rows={3} fullWidth
          value={notes} onChange={(e) => setNotes(e.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving}>
          {saving ? <CircularProgress size={18} /> : 'Save annotation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Create Violation Dialog ──────────────────────────────────────────────────

function CreateViolationDialog({ open, onClose, listing, onSave, session }) {
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setNotes(''); setError(''); }, [listing]);

  async function handleSave() {
    setSaving(true); setError('');
    try {
      const res = await apiFetch('/api/violations', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: listing.recall_id,
          listing_id: listing.listing_id,
          notes: notes.trim() || null,
        }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to create violation')); return; }
      onSave(await res.json());
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Create Violation Notice</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {listing && (
          <Alert severity="warning" icon={<GavelIcon />}>
            Formally recording a violation for <strong>{listing.recall_title}</strong>.
            Listing on <strong>{listing.marketplace}</strong>.
          </Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Notes" multiline rows={3} fullWidth
          value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Details about the violation..."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" color="error" onClick={handleSave} disabled={saving} startIcon={<GavelIcon />}>
          {saving ? <CircularProgress size={18} /> : 'Create violation'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Mark Notice Sent Dialog ──────────────────────────────────────────────────

function NoticeSentDialog({ open, onClose, violation, onSave, session }) {
  const [contact, setContact] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { setContact(violation?.notice_contact ?? ''); setError(''); }, [violation]);

  async function handleSave() {
    if (!contact.trim()) { setError('Contact info is required'); return; }
    setSaving(true); setError('');
    try {
      const res = await apiFetch(`/api/violations/${violation.violation_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          violation_status: 'Notice Sent',
          notice_sent_at: new Date().toISOString(),
          notice_contact: contact.trim(),
        }),
      });
      if (!res.ok) { setError(await getApiErrorMessage(res, 'Failed to update')); return; }
      onSave(await res.json());
      onClose();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Mark Notice as Sent</DialogTitle>
      <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '12px !important' }}>
        {error && <Alert severity="error">{error}</Alert>}
        <TextField
          label="Seller / marketplace contact" required fullWidth autoFocus
          value={contact} onChange={(e) => setContact(e.target.value)}
          placeholder="seller@example.com or marketplace support URL"
          helperText="Record who was contacted about this violation."
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button variant="contained" onClick={handleSave} disabled={saving} startIcon={<SendIcon />}>
          {saving ? <CircularProgress size={18} /> : 'Mark sent'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ViolationsPage() {
  const { session, profile } = useAuth();

  const [tab, setTab] = useState(0); // 0 = Listings, 1 = Violations
  const [listings, setListings] = useState([]);
  const [violations, setViolations] = useState([]);
  const [recallOptions, setRecallOptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [addListingOpen, setAddListingOpen] = useState(false);
  const [annotateTarget, setAnnotateTarget] = useState(null);
  const [violationTarget, setViolationTarget] = useState(null);
  const [noticeSentTarget, setNoticeSentTarget] = useState(null);

  useEffect(() => {
    async function load() {
      setLoading(true); setError('');
      try {
        const [lRes, vRes, rRes] = await Promise.all([
          apiFetch('/api/listings', session),
          apiFetch('/api/violations', session),
          apiFetch('/api/recalls', session),
        ]);
        if (!lRes.ok) throw new Error(await getApiErrorMessage(lRes, 'Failed to load listings'));
        if (!vRes.ok) throw new Error(await getApiErrorMessage(vRes, 'Failed to load violations'));
        const [lData, vData] = await Promise.all([lRes.json(), vRes.json()]);
        setListings(lData);
        setViolations(vData);
        if (rRes.ok) {
          const recalls = await rRes.json();
          setRecallOptions(recalls.map((r) => ({
            recall_id: r.id,
            recall_number: r.recall_id,
            recall_title: r.title,
            product: r.product,
          })));
        }
      } catch (e) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Violation sub-tabs
  const [vStatusTab, setVStatusTab] = useState(0);
  const filteredViolations = useMemo(() => {
    const label = VIOLATION_STATUS_TABS[vStatusTab];
    if (label === 'All') return violations;
    return violations.filter((v) => v.violation_status === label);
  }, [violations, vStatusTab]);

  function onListingAdded(row) { setListings((prev) => [row, ...prev]); }
  function onListingAnnotated(row) {
    setListings((prev) => prev.map((l) => l.listing_id === row.listing_id ? row : l));
  }
  function onViolationCreated(row) { setViolations((prev) => [row, ...prev]); setTab(1); }
  function onViolationUpdated(row) {
    setViolations((prev) => prev.map((v) => v.violation_id === row.violation_id ? row : v));
  }

  if (loading) return <Box sx={{ p: 4, textAlign: 'center' }}><CircularProgress /></Box>;

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 2 }}>
        <Box>
          <Typography variant="h4" fontWeight={700}>Investigation</Typography>
          <Typography variant="body2" color="text.secondary">
            Listings → Annotate → Violation notices → Responses → Adjudication
          </Typography>
        </Box>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddListingOpen(true)}>
          Add listing
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label={`Listings (${listings.length})`} />
        <Tab label={`Violations (${violations.length})`} />
      </Tabs>

      {/* ── LISTINGS TAB ─────────────────────────────────────── */}
      {tab === 0 && (
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                <TableCell>Recall</TableCell>
                <TableCell>Marketplace</TableCell>
                <TableCell>Listing</TableCell>
                <TableCell>Annotation</TableCell>
                <TableCell>Added</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {listings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                    No listings yet. Click "Add listing" to record a marketplace listing for a prioritized recall.
                  </TableCell>
                </TableRow>
              )}
              {listings.map((l) => (
                <TableRow key={l.listing_id} hover>
                  <TableCell>
                    <Typography variant="body2" fontWeight={600}>{l.recall_number}</Typography>
                    <Typography variant="caption" color="text.secondary"
                      sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {l.recall_title}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Chip label={l.marketplace} size="small" variant="outlined" />
                  </TableCell>
                  <TableCell sx={{ maxWidth: 220 }}>
                    <MuiLink href={l.url} target="_blank" rel="noopener"
                      sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                      {l.title || l.url}
                    </MuiLink>
                    {l.price != null && (
                      <Typography variant="caption" color="text.secondary">${l.price.toFixed(2)}</Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <AnnotationChip val={l.is_true_match} />
                    {l.annotated_by_name && (
                      <Typography variant="caption" display="block" color="text.secondary">
                        {l.annotated_by_name}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Typography variant="caption">{fmtDate(l.added_at)}</Typography>
                    {l.added_by_name && (
                      <Typography variant="caption" display="block" color="text.secondary">{l.added_by_name}</Typography>
                    )}
                  </TableCell>
                  <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                    <Tooltip title="Annotate listing">
                      <IconButton size="small" onClick={() => setAnnotateTarget(l)}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {l.is_true_match === true && (
                      <Tooltip title="Create violation notice">
                        <IconButton size="small" color="error" onClick={() => setViolationTarget(l)}>
                          <GavelIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                    <Tooltip title="Open listing">
                      <IconButton size="small" component="a" href={l.url} target="_blank" rel="noopener">
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* ── VIOLATIONS TAB ───────────────────────────────────── */}
      {tab === 1 && (
        <>
          <Tabs
            value={vStatusTab}
            onChange={(_, v) => setVStatusTab(v)}
            sx={{ mb: 1 }}
            variant="scrollable"
            scrollButtons="auto"
          >
            {VIOLATION_STATUS_TABS.map((t) => (
              <Tab key={t} label={
                t === 'All'
                  ? `All (${violations.length})`
                  : `${t} (${violations.filter((v) => v.violation_status === t).length})`
              } />
            ))}
          </Tabs>
          <TableContainer component={Paper}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700 } }}>
                  <TableCell>Recall</TableCell>
                  <TableCell>Listing</TableCell>
                  <TableCell>Investigator</TableCell>
                  <TableCell>Noticed</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell>Responses / Ruling</TableCell>
                  <TableCell align="right">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredViolations.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} align="center" sx={{ py: 5, color: 'text.secondary' }}>
                      No violations here. Go to the Listings tab, annotate a listing as "True match", then click the gavel icon.
                    </TableCell>
                  </TableRow>
                )}
                {filteredViolations.map((v) => (
                  <TableRow key={v.violation_id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>{v.recall_number}</Typography>
                      <Typography variant="caption" color="text.secondary"
                        sx={{ display: 'block', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {v.recall_title}
                      </Typography>
                    </TableCell>
                    <TableCell sx={{ maxWidth: 160 }}>
                      {v.listing_url ? (
                        <MuiLink href={v.listing_url} target="_blank" rel="noopener"
                          sx={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.8rem' }}>
                          {v.listing_marketplace || 'View'}
                        </MuiLink>
                      ) : <Typography variant="caption" color="text.secondary">—</Typography>}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{v.investigator_name ?? '—'}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{fmtDate(v.violation_noticed_at)}</Typography>
                    </TableCell>
                    <TableCell>
                      <Chip label={v.violation_status} color={statusColor(v.violation_status)} size="small" />
                      {v.notice_sent_at && (
                        <Typography variant="caption" display="block" color="text.secondary">
                          Sent {fmtDate(v.notice_sent_at)}
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {v.response_count > 0
                        ? <Chip label={`${v.response_count} response${v.response_count > 1 ? 's' : ''}`} size="small" color="secondary" />
                        : <Typography variant="caption" color="text.secondary">None</Typography>}
                      {v.adjudication && (
                        <Chip
                          label={v.adjudication.status}
                          size="small"
                          color={v.adjudication.status === 'Resolved' ? 'success' : 'error'}
                          sx={{ ml: 0.5 }}
                        />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {v.violation_status === 'Open' && (
                        <Tooltip title="Mark notice as sent">
                          <IconButton size="small" color="primary" onClick={() => setNoticeSentTarget(v)}>
                            <SendIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}

      {/* Dialogs */}
      <AddListingDialog
        open={addListingOpen}
        onClose={() => setAddListingOpen(false)}
        onSave={onListingAdded}
        session={session}
        recallOptions={recallOptions}
      />
      <AnnotateDialog
        open={!!annotateTarget}
        onClose={() => setAnnotateTarget(null)}
        listing={annotateTarget}
        onSave={onListingAnnotated}
        session={session}
      />
      <CreateViolationDialog
        open={!!violationTarget}
        onClose={() => setViolationTarget(null)}
        listing={violationTarget}
        onSave={onViolationCreated}
        session={session}
      />
      <NoticeSentDialog
        open={!!noticeSentTarget}
        onClose={() => setNoticeSentTarget(null)}
        violation={noticeSentTarget}
        onSave={onViolationUpdated}
        session={session}
      />
    </Box>
  );
}

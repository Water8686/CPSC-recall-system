import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Button,
  Typography,
  Paper,
  Chip,
  CircularProgress,
  Alert,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  ToggleButton,
  ToggleButtonGroup,
  IconButton,
  Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import RefreshIcon from '@mui/icons-material/Refresh';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { CONFIDENCE_TIERS, REVIEW_STATUSES } from 'shared';

const TIER_COLORS = {
  [CONFIDENCE_TIERS.HIGH]: 'success',
  [CONFIDENCE_TIERS.UNCERTAIN]: 'warning',
  [CONFIDENCE_TIERS.NO_MATCH]: 'error',
};

const STATUS_COLORS = {
  [REVIEW_STATUSES.PENDING]: 'default',
  [REVIEW_STATUSES.CONFIRMED]: 'success',
  [REVIEW_STATUSES.REJECTED]: 'error',
};

export default function DiscoveryPanel({ recallId, onCreateViolation }) {
  const { session } = useAuth();

  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState(null);
  const [cacheInfo, setCacheInfo] = useState(null);

  // Filter state
  const [tierFilter, setTierFilter] = useState([]);
  const [statusFilter, setStatusFilter] = useState([]);

  // Review dialog state
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [reviewTarget, setReviewTarget] = useState(null); // { result, action: 'confirm' | 'reject' }
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Create violation loading state per result
  const [creatingViolation, setCreatingViolation] = useState({});

  const loadExistingResults = useCallback(async () => {
    if (!recallId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await apiFetch(`/api/discovery/${recallId}`, session);
      if (!res.ok) {
        if (res.status === 404) {
          setResults([]);
          return;
        }
        throw new Error(await getApiErrorMessage(res));
      }
      const data = await res.json();
      setResults(data.results || []);
      if (data.cached_at) {
        setCacheInfo(data.cached_at);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [recallId, session]);

  useEffect(() => {
    loadExistingResults();
  }, [loadExistingResults]);

  async function handleSearch(force = false) {
    setSearching(true);
    setError(null);
    try {
      const url = force
        ? `/api/discovery/search?force=true`
        : `/api/discovery/search`;
      const res = await apiFetch(url, session, {
        method: 'POST',
        body: JSON.stringify({ recall_id: recallId }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res, 'Search failed'));
      const data = await res.json();
      setResults(data.results || []);
      setCacheInfo(data.cached_at || null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSearching(false);
    }
  }

  function openReviewDialog(result, action) {
    setReviewTarget({ result, action });
    setReviewNotes('');
    setReviewError(null);
    setReviewDialogOpen(true);
  }

  async function handleSubmitReview() {
    if (!reviewTarget) return;
    const { result, action } = reviewTarget;
    setReviewSaving(true);
    setReviewError(null);
    try {
      const newStatus =
        action === 'confirm' ? REVIEW_STATUSES.CONFIRMED : REVIEW_STATUSES.REJECTED;
      const res = await apiFetch(`/api/discovery/${result.discovery_id}`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          review_status: newStatus,
          reviewer_notes: reviewNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      setResults((prev) =>
        prev.map((r) =>
          r.discovery_id === result.discovery_id ? { ...r, ...updated } : r,
        ),
      );
      setReviewDialogOpen(false);
    } catch (err) {
      setReviewError(err.message);
    } finally {
      setReviewSaving(false);
    }
  }

  async function handleCreateViolation(result) {
    setCreatingViolation((prev) => ({ ...prev, [result.discovery_id]: true }));
    try {
      const res = await apiFetch('/api/listings', session, {
        method: 'POST',
        body: JSON.stringify({
          recall_id: recallId,
          url: result.listing_url,
          marketplace: result.marketplace,
          title: result.listing_title,
          source: 'Discovery',
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const listing = await res.json();
      if (onCreateViolation) onCreateViolation(listing);
    } catch (err) {
      setError('Failed to create listing: ' + err.message);
    } finally {
      setCreatingViolation((prev) => ({ ...prev, [result.discovery_id]: false }));
    }
  }

  // Apply filters
  const visibleResults = results.filter((r) => {
    if (tierFilter.length > 0 && !tierFilter.includes(r.confidence_tier)) return false;
    if (statusFilter.length > 0 && !statusFilter.includes(r.review_status)) return false;
    return true;
  });

  const hasResults = results.length > 0;

  return (
    <Box>
      {/* Header row */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={searching ? <CircularProgress size={16} color="inherit" /> : <SearchIcon />}
          onClick={() => handleSearch(false)}
          disabled={searching || loading}
        >
          {searching ? 'Searching...' : 'Discover & Verify Listings'}
        </Button>

        {hasResults && (
          <Tooltip title="Re-run search (ignore cache)">
            <span>
              <IconButton
                onClick={() => handleSearch(true)}
                disabled={searching || loading}
                size="small"
                color="primary"
              >
                <RefreshIcon />
              </IconButton>
            </span>
          </Tooltip>
        )}

        {cacheInfo && (
          <Typography variant="caption" color="text.secondary">
            Cached: {new Date(cacheInfo).toLocaleString()}
          </Typography>
        )}
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filters — only shown when there are results */}
      {hasResults && (
        <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              CONFIDENCE
            </Typography>
            <ToggleButtonGroup
              value={tierFilter}
              onChange={(_, val) => setTierFilter(val)}
              size="small"
            >
              {Object.values(CONFIDENCE_TIERS).map((tier) => (
                <ToggleButton key={tier} value={tier} sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}>
                  {tier}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600}>
              STATUS
            </Typography>
            <ToggleButtonGroup
              value={statusFilter}
              onChange={(_, val) => setStatusFilter(val)}
              size="small"
            >
              {Object.values(REVIEW_STATUSES).map((status) => (
                <ToggleButton key={status} value={status} sx={{ fontSize: '0.7rem', py: 0.25, px: 1 }}>
                  {status}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
          </Box>

          {(tierFilter.length > 0 || statusFilter.length > 0) && (
            <Button
              size="small"
              variant="text"
              onClick={() => { setTierFilter([]); setStatusFilter([]); }}
            >
              Clear filters
            </Button>
          )}
        </Box>
      )}

      {/* Loading state */}
      {(loading || searching) && !hasResults && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Empty state */}
      {!loading && !searching && !hasResults && (
        <Alert severity="info">
          No discovery results yet. Click "Discover & Verify Listings" to search for marketplace
          listings matching this recall.
        </Alert>
      )}

      {/* Results count */}
      {hasResults && (
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
          Showing {visibleResults.length} of {results.length} result
          {results.length !== 1 ? 's' : ''}
        </Typography>
      )}

      {/* Result cards */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
        {visibleResults.map((result) => (
          <Paper
            key={result.discovery_id}
            variant="outlined"
            sx={{ p: 2 }}
          >
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
              {/* Main content */}
              <Box sx={{ flex: 1, minWidth: 0 }}>
                {/* Title + external link */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mb: 0.5 }}>
                  <Typography variant="body1" fontWeight={600} noWrap sx={{ flex: 1, minWidth: 0 }}>
                    {result.listing_title || 'Untitled Listing'}
                  </Typography>
                  {result.listing_url && (
                    <Tooltip title="Open listing">
                      <IconButton
                        component="a"
                        href={result.listing_url}
                        target="_blank"
                        rel="noreferrer"
                        size="small"
                        sx={{ color: 'primary.main', flexShrink: 0 }}
                      >
                        <OpenInNewIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>

                {/* Marketplace + price */}
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                  {result.marketplace}
                  {result.price ? ` · $${result.price}` : ''}
                </Typography>

                {/* Scraped brand/model */}
                {(result.scraped_manufacturer || result.scraped_model_number) && (
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.75 }}>
                    {[result.scraped_manufacturer, result.scraped_model_number].filter(Boolean).join(' · ')}
                  </Typography>
                )}

                {/* Chips */}
                <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
                  {result.confidence_tier && (
                    <Chip
                      label={result.confidence_tier}
                      size="small"
                      color={TIER_COLORS[result.confidence_tier] || 'default'}
                    />
                  )}
                  {result.review_status && (
                    <Chip
                      label={result.review_status}
                      size="small"
                      color={STATUS_COLORS[result.review_status] || 'default'}
                      variant="outlined"
                    />
                  )}
                </Box>
              </Box>

              {/* Action buttons */}
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0 }}>
                {result.review_status === REVIEW_STATUSES.PENDING && (
                  <>
                    <Button
                      variant="outlined"
                      size="small"
                      color="success"
                      startIcon={<CheckCircleIcon />}
                      onClick={() => openReviewDialog(result, 'confirm')}
                    >
                      Confirm Match
                    </Button>
                    <Button
                      variant="outlined"
                      size="small"
                      color="error"
                      startIcon={<CancelIcon />}
                      onClick={() => openReviewDialog(result, 'reject')}
                    >
                      Reject
                    </Button>
                  </>
                )}

                {result.review_status === REVIEW_STATUSES.CONFIRMED && (
                  <Button
                    variant="contained"
                    size="small"
                    color="error"
                    onClick={() => handleCreateViolation(result)}
                    disabled={!!creatingViolation[result.discovery_id]}
                  >
                    {creatingViolation[result.discovery_id] ? 'Creating...' : 'Create Violation'}
                  </Button>
                )}
              </Box>
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Review dialog */}
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {reviewTarget?.action === 'confirm' ? 'Confirm Match' : 'Reject Listing'}
        </DialogTitle>
        <DialogContent>
          {reviewTarget && (
            <Paper variant="outlined" sx={{ p: 1.5, mb: 2, mt: 1, bgcolor: 'grey.50' }}>
              <Typography variant="body2" fontWeight={600} noWrap>
                {reviewTarget.result.listing_title || 'Untitled Listing'}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {reviewTarget.result.marketplace}
              </Typography>
            </Paper>
          )}
          {reviewError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {reviewError}
            </Alert>
          )}
          <TextField
            label="Notes (optional)"
            multiline
            minRows={2}
            fullWidth
            value={reviewNotes}
            onChange={(e) => setReviewNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)} disabled={reviewSaving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            color={reviewTarget?.action === 'confirm' ? 'success' : 'error'}
            onClick={handleSubmitReview}
            disabled={reviewSaving}
          >
            {reviewSaving
              ? 'Saving...'
              : reviewTarget?.action === 'confirm'
              ? 'Confirm'
              : 'Reject'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Alert,
  Autocomplete,
  CircularProgress,
  Snackbar,
  Chip,
} from '@mui/material';
import LockIcon from '@mui/icons-material/Lock';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { VIOLATION_TYPES } from 'shared';
import { MARKETPLACE_COLORS } from '../constants/violations';

export default function CreateViolationPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const preselectedListingId = searchParams.get('listing_id');

  const { session, profile, user } = useAuth();
  const investigatorName = profile?.full_name || user?.email || 'Current User';

  // Form state
  const [listings, setListings] = useState([]);
  const [selectedListing, setSelectedListing] = useState(null);
  const [violationType, setViolationType] = useState('');
  const [dateOfViolation, setDateOfViolation] = useState(
    new Date().toISOString().split('T')[0],
  );
  const [notes, setNotes] = useState('');

  // UI state
  const [loadingListings, setLoadingListings] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

  // Load all listings for the picklist
  useEffect(() => {
    async function fetchListings() {
      try {
        const res = await apiFetch('/api/listings', session);
        if (!res.ok) throw new Error(await getApiErrorMessage(res));
        const data = await res.json();
        setListings(data);
        // Pre-select listing if passed via query param
        if (preselectedListingId) {
          const match = data.find(
            (l) => String(l.listing_id) === preselectedListingId,
          );
          if (match) setSelectedListing(match);
        }
      } catch (err) {
        setSubmitError('Failed to load listings: ' + err.message);
      } finally {
        setLoadingListings(false);
      }
    }
    fetchListings();
  }, [session, preselectedListingId]);

  function validate() {
    const errs = {};
    if (!selectedListing) errs.listing = 'Please select a listing';
    if (!violationType) errs.violationType = 'Please select a violation type';
    if (!dateOfViolation) {
      errs.date = 'Date of Violation is required';
    } else {
      const d = new Date(dateOfViolation);
      const today = new Date();
      today.setHours(23, 59, 59, 999);
      if (d > today) errs.date = 'Date of Violation cannot be in the future';
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0 && !selectedListing && !violationType && !dateOfViolation) {
      setSubmitError('Please complete all required fields.');
      return false;
    }
    if (Object.keys(errs).length > 0) {
      setSubmitError(null);
      return false;
    }
    setSubmitError(null);
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await apiFetch('/api/violations', session, {
        method: 'POST',
        body: JSON.stringify({
          listing_id: selectedListing.listing_id,
          violation_type: violationType,
          date_of_violation: dateOfViolation,
          recall_id: selectedListing.recall_id ?? null,
          notes: notes.trim() || null,
        }),
      });

      if (!res.ok) {
        const msg = await getApiErrorMessage(res, 'Failed to save violation');
        setSubmitError(msg);
        return;
      }

      const isUpdate = res.status === 200;
      setSnackbar({
        open: true,
        message: isUpdate
          ? 'Violation updated successfully'
          : 'Violation saved successfully',
        severity: 'success',
      });

      // Navigate back after short delay so user sees the snackbar
      setTimeout(() => navigate('/violations'), 1200);
    } catch (err) {
      setSubmitError(err.message || 'Failed to save violation');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Box>
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Back
      </Button>

      <Paper sx={{ p: 4, maxWidth: 800, mx: 'auto' }}>
        <Typography variant="h5" fontWeight={700} color="primary" gutterBottom>
          Create Violation Report
        </Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          File a new violation against a marketplace listing of a recalled
          product.
        </Typography>

        {submitError && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {submitError}
          </Alert>
        )}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Row 1: Listing + Violation Type */}
            <Grid item xs={12} md={6}>
              <Autocomplete
                options={listings}
                loading={loadingListings}
                value={selectedListing}
                onChange={(_, val) => {
                  setSelectedListing(val);
                  setErrors((prev) => ({ ...prev, listing: undefined }));
                }}
                getOptionLabel={(opt) =>
                  `${opt.title || 'Untitled'} — ${opt.marketplace || 'Unknown'}`
                }
                isOptionEqualToValue={(opt, val) =>
                  opt.listing_id === val.listing_id
                }
                renderOption={(props, opt) => (
                  <li {...props} key={opt.listing_id}>
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {opt.title || 'Untitled Listing'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {opt.marketplace || 'Unknown'} · ID: {opt.listing_id}
                      </Typography>
                    </Box>
                  </li>
                )}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Listing *"
                    error={!!errors.listing}
                    helperText={errors.listing}
                    InputProps={{
                      ...params.InputProps,
                      endAdornment: (
                        <>
                          {loadingListings ? (
                            <CircularProgress color="inherit" size={20} />
                          ) : null}
                          {params.InputProps.endAdornment}
                        </>
                      ),
                    }}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.violationType}>
                <InputLabel>Violation Type *</InputLabel>
                <Select
                  value={violationType}
                  label="Violation Type *"
                  onChange={(e) => {
                    setViolationType(e.target.value);
                    setErrors((prev) => ({
                      ...prev,
                      violationType: undefined,
                    }));
                  }}
                >
                  {VIOLATION_TYPES.map((vt) => (
                    <MenuItem key={vt} value={vt}>
                      {vt}
                    </MenuItem>
                  ))}
                </Select>
                {errors.violationType && (
                  <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                    {errors.violationType}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Row 2: Listing Preview (conditional) */}
            {selectedListing && (
              <Grid item xs={12}>
                <Paper
                  sx={{
                    p: 2,
                    bgcolor: '#f0f4ff',
                    borderColor: '#bbdefb',
                  }}
                >
                  <Typography
                    variant="caption"
                    fontWeight={700}
                    color="primary"
                    sx={{ mb: 1, display: 'block' }}
                  >
                    SELECTED LISTING PREVIEW
                  </Typography>
                  <Typography fontWeight={600}>
                    {selectedListing.title || 'Untitled Listing'}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                    {selectedListing.marketplace && (
                      <Chip
                        label={selectedListing.marketplace}
                        size="small"
                        sx={{
                          bgcolor:
                            MARKETPLACE_COLORS[selectedListing.marketplace]
                              ?.bg ?? '#f5f5f5',
                          color:
                            MARKETPLACE_COLORS[selectedListing.marketplace]
                              ?.text ?? '#616161',
                          fontWeight: 600,
                          fontSize: 11,
                        }}
                      />
                    )}
                    {selectedListing.seller_name && (
                      <Typography variant="caption" color="text.secondary">
                        Seller: {selectedListing.seller_name}
                      </Typography>
                    )}
                    {selectedListing.url && (
                      <Typography
                        variant="caption"
                        component="a"
                        href={selectedListing.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        color="primary"
                      >
                        View Listing
                      </Typography>
                    )}
                  </Box>
                </Paper>
              </Grid>
            )}

            {/* Row 3: Date + Investigator */}
            <Grid item xs={12} md={6}>
              <TextField
                label="Date of Violation *"
                type="date"
                fullWidth
                value={dateOfViolation}
                onChange={(e) => {
                  setDateOfViolation(e.target.value);
                  setErrors((prev) => ({ ...prev, date: undefined }));
                }}
                error={!!errors.date}
                helperText={errors.date}
                InputLabelProps={{ shrink: true }}
                inputProps={{
                  max: new Date().toISOString().split('T')[0],
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <TextField
                label="Investigator"
                fullWidth
                value={investigatorName}
                disabled
                InputProps={{
                  endAdornment: <LockIcon fontSize="small" color="action" />,
                }}
              />
            </Grid>

            {/* Row 4: Notes */}
            <Grid item xs={12}>
              <TextField
                label="Investigator Notes (optional)"
                fullWidth
                multiline
                minRows={3}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Describe why this listing is a violation..."
              />
            </Grid>

            {/* Row 5: Actions */}
            <Grid item xs={12}>
              <Box sx={{ display: 'flex', gap: 2, justifyContent: 'flex-end' }}>
                <Button variant="outlined" onClick={() => navigate(-1)}>
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="contained"
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Violation'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </Box>
      </Paper>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
      >
        <Alert severity={snackbar.severity} variant="filled">
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}

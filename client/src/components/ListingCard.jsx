import { useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
} from '@mui/material';
import { ExternalLink } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiFetch, getApiErrorMessage } from '../lib/api';
import { MARKETPLACE_COLORS, SOURCE_COLORS } from '../constants/violations';

export default function ListingCard({
  listing,
  showViolationButton = true,
  onCreateViolation,
  investigatorActions = false,
  onListingUpdated,
}) {
  const { session } = useAuth();
  const [annotateOpen, setAnnotateOpen] = useState(false);
  const [matchChoice, setMatchChoice] = useState('true');
  const [annotateNotes, setAnnotateNotes] = useState('');
  const [annotateSaving, setAnnotateSaving] = useState(false);
  const [annotateError, setAnnotateError] = useState(null);

  const mktColors = MARKETPLACE_COLORS[listing.marketplace] || MARKETPLACE_COLORS.Other || {};
  const srcColors = SOURCE_COLORS[listing.source] || {};

  async function submitAnnotation() {
    setAnnotateSaving(true);
    setAnnotateError(null);
    try {
      const res = await apiFetch(`/api/listings/${listing.listing_id}/annotate`, session, {
        method: 'PATCH',
        body: JSON.stringify({
          is_true_match: matchChoice === 'true',
          annotation_notes: annotateNotes.trim() || null,
        }),
      });
      if (!res.ok) throw new Error(await getApiErrorMessage(res));
      const updated = await res.json();
      onListingUpdated?.(updated);
      setAnnotateOpen(false);
      setAnnotateNotes('');
    } catch (e) {
      setAnnotateError(e.message);
    } finally {
      setAnnotateSaving(false);
    }
  }

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
          {listing.is_true_match === true && (
            <Chip label="Match" size="small" color="success" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
          {listing.is_true_match === false && (
            <Chip label="Not a match" size="small" color="default" sx={{ fontSize: '0.7rem', height: 20 }} />
          )}
        </Box>
        {listing.annotation_notes && (
          <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
            Note: {listing.annotation_notes}
          </Typography>
        )}
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
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, flexShrink: 0, mt: 0.5 }}>
        {investigatorActions && (
          <Button variant="outlined" size="small" onClick={() => setAnnotateOpen(true)}>
            Annotate
          </Button>
        )}
        {showViolationButton && onCreateViolation && (
          <Button
            variant="contained"
            size="small"
            color="error"
            onClick={() => onCreateViolation(listing)}
            sx={{ flexShrink: 0 }}
          >
            Create Violation
          </Button>
        )}
      </Box>

      <Dialog open={annotateOpen} onClose={() => !annotateSaving && setAnnotateOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>Listing annotation</DialogTitle>
        <DialogContent>
          {annotateError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {annotateError}
            </Alert>
          )}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Mark whether this listing is a true recall match or a false positive (CPSC workflow).
          </Typography>
          <FormControl component="fieldset" sx={{ mb: 2 }}>
            <FormLabel component="legend">Assessment</FormLabel>
            <RadioGroup value={matchChoice} onChange={(e) => setMatchChoice(e.target.value)}>
              <FormControlLabel value="true" control={<Radio />} label="True match (violation candidate)" />
              <FormControlLabel value="false" control={<Radio />} label="False positive / ruled out" />
            </RadioGroup>
          </FormControl>
          <TextField
            label="Commentary (optional)"
            multiline
            minRows={2}
            fullWidth
            value={annotateNotes}
            onChange={(e) => setAnnotateNotes(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAnnotateOpen(false)} disabled={annotateSaving}>
            Cancel
          </Button>
          <Button variant="contained" onClick={submitAnnotation} disabled={annotateSaving}>
            {annotateSaving ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
}

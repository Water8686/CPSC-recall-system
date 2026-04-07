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

import { Box, Paper, Typography, Chip, Button } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ReportProblemIcon from '@mui/icons-material/ReportProblem';
import { useNavigate } from 'react-router-dom';
import { MARKETPLACE_COLORS, SOURCE_COLORS } from '../constants/violations';

export default function ListingCard({ listing, showViolationButton = true }) {
  const navigate = useNavigate();
  const mktColors = MARKETPLACE_COLORS[listing.marketplace] ?? MARKETPLACE_COLORS.Other;
  const srcColors = SOURCE_COLORS[listing.source] ?? SOURCE_COLORS.Manual;

  return (
    <Paper sx={{ p: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography fontWeight={600} noWrap>
          {listing.title || 'Untitled Listing'}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mt: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip
            label={listing.marketplace || 'Unknown'}
            size="small"
            sx={{ bgcolor: mktColors.bg, color: mktColors.text, fontWeight: 600, fontSize: 11 }}
          />
          <Chip
            label={listing.source || 'Manual'}
            size="small"
            sx={{ bgcolor: srcColors.bg, color: srcColors.text, fontWeight: 600, fontSize: 11 }}
          />
          {listing.seller_name && (
            <Typography variant="caption" color="text.secondary">
              Seller: {listing.seller_name}
            </Typography>
          )}
          {listing.listed_at && (
            <Typography variant="caption" color="text.secondary">
              Listed: {new Date(listing.listed_at).toLocaleDateString()}
            </Typography>
          )}
        </Box>
        {listing.url && (
          <Typography
            variant="caption"
            component="a"
            href={listing.url}
            target="_blank"
            rel="noopener noreferrer"
            color="primary"
            sx={{ display: 'inline-flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}
          >
            {listing.url.length > 60
              ? listing.url.slice(0, 60) + '...'
              : listing.url}
            <OpenInNewIcon sx={{ fontSize: 12 }} />
          </Typography>
        )}
      </Box>
      {showViolationButton && (
        <Button
          variant="contained"
          color="error"
          size="small"
          startIcon={<ReportProblemIcon />}
          onClick={() =>
            navigate(`/violations/new?listing_id=${listing.listing_id}`)
          }
          sx={{ whiteSpace: 'nowrap' }}
        >
          Create Violation
        </Button>
      )}
    </Paper>
  );
}

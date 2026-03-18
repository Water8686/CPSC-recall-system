import { Typography, Paper, Box } from '@mui/material';

/**
 * Responses page — Sprint 3.
 * Seller responds to violation notices.
 */
export default function ResponsesPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Responses
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Sprint 3 — Seller violation responses will be built here.
        </Typography>
      </Paper>
    </Box>
  );
}

import { Typography, Paper, Box } from '@mui/material';

/**
 * Violations page — Sprint 2.
 * Investigator creates and annotates violations from listings.
 */
export default function ViolationsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Violations
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Sprint 2 — Violation creation and annotation will be built here.
        </Typography>
      </Paper>
    </Box>
  );
}

import { Typography, Paper, Box } from '@mui/material';

/**
 * Adjudications page — Sprint 3.
 * Investigator makes final decisions on violations.
 */
export default function AdjudicationsPage() {
  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Adjudications
      </Typography>
      <Paper sx={{ p: 3 }}>
        <Typography color="text.secondary">
          Sprint 3 — Violation adjudication will be built here.
        </Typography>
      </Paper>
    </Box>
  );
}

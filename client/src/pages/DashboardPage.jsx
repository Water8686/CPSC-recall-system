import { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  Grid,
  CircularProgress,
  Alert,
} from '@mui/material';
import { Chart } from 'react-google-charts';

/**
 * Dashboard — landing page after login.
 * Sprint 1: Recall priority bar chart and pie chart.
 */
export default function DashboardPage() {
  const [prioritizations, setPrioritizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/prioritizations');
        if (!res.ok) throw new Error('Failed to fetch prioritizations');
        const data = await res.json();
        setPrioritizations(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const counts = { High: 0, Medium: 0, Low: 0 };
  prioritizations.forEach((p) => {
    if (counts[p.priority] !== undefined) counts[p.priority]++;
  });

  const barChartData = [
    ['Priority', 'Count'],
    ['High', counts.High],
    ['Medium', counts.Medium],
    ['Low', counts.Low],
  ];

  const pieChartData = [
    ['Priority', 'Count'],
    ['High', counts.High],
    ['Medium', counts.Medium],
    ['Low', counts.Low],
  ];

  const barChartOptions = {
    title: 'Recalls by Priority',
    chartArea: { width: '60%' },
    hAxis: { title: 'Count', minValue: 0 },
    vAxis: { title: 'Priority' },
  };

  const pieChartOptions = {
    title: 'Percentage of Recalls by Priority',
    pieHole: 0.4,
    sliceVisibilityThreshold: 0,
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="40vh">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Typography variant="h4" fontWeight={700} gutterBottom>
          Dashboard
        </Typography>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  return (
    <Box>
      <Typography variant="h4" fontWeight={700} gutterBottom>
        Dashboard
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Recall priority overview — OKR 1.1 & 1.2
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Chart
              chartType="BarChart"
              width="100%"
              height="400px"
              data={barChartData}
              options={barChartOptions}
            />
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Chart
              chartType="PieChart"
              width="100%"
              height="400px"
              data={pieChartData}
              options={pieChartOptions}
            />
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

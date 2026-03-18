import { createTheme } from '@mui/material/styles';

/**
 * MUI theme for CPSC Recall Monitoring System.
 * Uses a professional blue palette that fits a government/regulatory context.
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1565C0', // Strong blue — authority, trust
      light: '#42A5F5',
      dark: '#0D47A1',
    },
    secondary: {
      main: '#FF8F00', // Amber accent — for warnings/priority indicators
      light: '#FFB300',
      dark: '#E65100',
    },
    background: {
      default: '#F5F5F5',
      paper: '#FFFFFF',
    },
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h4: {
      fontWeight: 700,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 8,
  },
});

import { createTheme } from '@mui/material/styles';

/**
 * CPSC-oriented palette: navy primary, white surfaces, red for danger/alerts.
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#003366',
      light: '#335c85',
      dark: '#001a33',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#b71c1c',
      light: '#f05545',
      dark: '#7f0000',
    },
    error: {
      main: '#c62828',
    },
    background: {
      default: '#f0f4f8',
      paper: '#ffffff',
    },
  },
  typography: {
    fontFamily: '"Source Sans 3", "Roboto", "Helvetica", "Arial", sans-serif',
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
  components: {
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#003366',
        },
      },
    },
  },
});

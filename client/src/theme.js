import { createTheme } from '@mui/material/styles';

/**
 * MUI theme — CPSC / regulatory: trustworthy blue, alert amber, Source Sans 3 (common on .gov-style sites).
 */
export const theme = createTheme({
  palette: {
    primary: {
      main: '#0D47A1',
      light: '#5472D3',
      dark: '#002171',
    },
    secondary: {
      main: '#E65100',
      light: '#FF833A',
      dark: '#AC1900',
    },
    background: {
      default: '#ECEFF1',
      paper: '#FFFFFF',
    },
    divider: 'rgba(13, 71, 161, 0.12)',
  },
  typography: {
    fontFamily: '"Source Sans 3", "Segoe UI", system-ui, sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '-0.02em',
    },
    h6: {
      fontWeight: 600,
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
    },
  },
  shape: {
    borderRadius: 10,
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          textRendering: 'optimizeLegibility',
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          border: '1px solid',
          borderColor: 'rgba(13, 71, 161, 0.12)',
          boxShadow: '0 1px 2px rgba(0, 0, 0, 0.06)',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundImage: 'linear-gradient(180deg, #1565C0 0%, #0D47A1 100%)',
        },
      },
    },
  },
});

import { createTheme } from '@mui/material/styles';

// Vision UI - inspired theme tokens
const palette = {
  primary: { main: '#5E72E4', contrastText: '#fff' }, // Indigo
  secondary: { main: '#825EE4', contrastText: '#fff' }, // Purple
  success: { main: '#2DCE89', contrastText: '#fff' },
  info: { main: '#11CDEF', contrastText: '#fff' },
  warning: { main: '#FB6340', contrastText: '#fff' },
  error: { main: '#F5365C', contrastText: '#fff' },
  text: { primary: '#2D3748', secondary: '#718096' },
  background: { default: '#f8f9fe', paper: '#ffffff' },
};

const shape = { borderRadius: 12 };

const shadows = [
  'none',
  '0px 2px 4px rgba(0,0,0,0.06)',
  '0px 4px 10px rgba(0,0,0,0.08)',
  '0px 8px 24px rgba(0,0,0,0.08)',
  ...Array(21).fill('0 8px 24px rgba(0,0,0,0.08)')
];

const typography = {
  fontFamily: 'Poppins, Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  h1: { fontWeight: 700 },
  h2: { fontWeight: 700 },
  h3: { fontWeight: 700 },
  h4: { fontWeight: 700 },
  h5: { fontWeight: 700 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 600 }
};

const components = {
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        boxShadow: shadows[2],
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 10 },
    },
    defaultProps: { disableElevation: true },
  },
  MuiPaper: {
    styleOverrides: {
      root: { borderRadius: shape.borderRadius },
    },
  },
  MuiTooltip: {
    styleOverrides: {
      tooltip: { fontSize: 12, borderRadius: 8 },
    },
  },
};

const visionTheme = createTheme({ palette, shape, shadows, typography, components });

export default visionTheme;

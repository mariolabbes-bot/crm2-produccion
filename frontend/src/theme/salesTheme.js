import { createTheme } from '@mui/material/styles';

const palette = {
  primary: { main: '#3A36DB', contrastText: '#fff' }, // blue
  secondary: { main: '#F7B731', contrastText: '#fff' }, // yellow
  success: { main: '#00B894', contrastText: '#fff' },
  info: { main: '#0984E3', contrastText: '#fff' },
  warning: { main: '#FDCB6E', contrastText: '#fff' },
  error: { main: '#E17055', contrastText: '#fff' },
  text: { primary: '#222B45', secondary: '#8F9BB3' },
  background: { default: '#F4F7FA', paper: '#fff' },
};

const shape = { borderRadius: 10 };

const typography = {
  fontFamily: 'Inter, Manrope, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  h1: { fontWeight: 700 },
  h2: { fontWeight: 700 },
  h3: { fontWeight: 700 },
  h4: { fontWeight: 700 },
  h5: { fontWeight: 600 },
  h6: { fontWeight: 600 },
  button: { textTransform: 'none', fontWeight: 600 },
  body1: { fontWeight: 400 },
  body2: { fontWeight: 400 },
};

const components = {
  MuiCard: {
    styleOverrides: {
      root: {
        borderRadius: shape.borderRadius,
        boxShadow: '0 2px 8px rgba(34,43,69,0.06)',
        border: '1px solid #E5E9F2',
      },
    },
  },
  MuiButton: {
    styleOverrides: {
      root: { borderRadius: 8 },
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
      tooltip: { fontSize: 13, borderRadius: 8 },
    },
  },
  MuiTableHead: {
    styleOverrides: {
      root: { background: '#F4F7FA' },
    },
  },
};

const salesTheme = createTheme({ palette, shape, typography, components });

export default salesTheme;

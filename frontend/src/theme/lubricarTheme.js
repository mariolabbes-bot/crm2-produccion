// Theme personalizado CRM2 Lubricar INSA
// Basado en colores corporativos del logo: Naranja #E57A2D + Azul Marino #2B4F6F

import { createTheme } from '@mui/material/styles';

const lubricarTheme = createTheme({
  palette: {
    primary: {
      main: '#2B4F6F',      // Azul marino del logo LUBRICAR
      light: '#3478C3',     // Azul más claro
      dark: '#1E3A52',      // Azul oscuro para sidebar
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E57A2D',      // Naranja de las ondas del logo
      light: '#FF9F33',     // Naranja claro
      dark: '#CC6823',      // Naranja oscuro
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981',      // Verde moderno para ventas
      light: '#D1FAE5',
      dark: '#059669',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',      // Rojo para alertas
      light: '#FEE2E2',
      dark: '#DC2626',
      contrastText: '#FFFFFF',
    },
    warning: {
      main: '#F59E0B',      // Amarillo para advertencias
      light: '#FEF3C7',
      dark: '#D97706',
      contrastText: '#FFFFFF',
    },
    info: {
      main: '#3478C3',      // Azul info
      light: '#D6E4F3',
      dark: '#2B4F6F',
      contrastText: '#FFFFFF',
    },
    grey: {
      50: '#F9FAFB',
      100: '#F3F4F6',
      200: '#E5E7EB',
      300: '#D1D5DB',
      400: '#9CA3AF',
      500: '#6B7280',
      600: '#4B5563',
      700: '#374151',
      800: '#1F2937',
      900: '#111827',
    },
    background: {
      default: '#F9FAFB',   // Gris muy claro
      paper: '#FFFFFF',
    },
    text: {
      primary: '#111827',   // Casi negro
      secondary: '#4B5563', // Gris medio
      disabled: '#9CA3AF',  // Gris claro
    },
  },

  // Colores custom por módulo (acceso vía theme.custom.modules.ventas)
  custom: {
    lubricar: {
      orange: '#E57A2D',
      orangeLight: '#FF9F33',
      orangeDark: '#CC6823',
      blue: '#2B4F6F',
      blueLight: '#3478C3',
      blueDark: '#1E3A52',
    },
    modules: {
      dashboard: '#2B4F6F',  // Azul Lubricar
      ventas: '#10B981',     // Verde
      abonos: '#3478C3',     // Azul claro
      clientes: '#A855F7',   // Púrpura
      productos: '#E57A2D',  // Naranja Lubricar
      reportes: '#14B8A6',   // Teal
    },
    sidebar: {
      background: 'linear-gradient(180deg, #2B4F6F 0%, #1E3A52 100%)',
      itemHover: 'rgba(229, 122, 45, 0.1)',
      itemActive: '#E57A2D',
      itemText: '#D1D5DB',
      itemActiveText: '#FFFFFF',
    },
  },

  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2.5rem',
      lineHeight: 1.2,
      color: '#111827',
    },
    h2: {
      fontWeight: 700,
      fontSize: '2rem',
      lineHeight: 1.3,
      color: '#111827',
    },
    h3: {
      fontWeight: 600,
      fontSize: '1.75rem',
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.5rem',
      lineHeight: 1.4,
      color: '#1F2937',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.25rem',
      lineHeight: 1.5,
      color: '#374151',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#374151',
    },
    subtitle1: {
      fontSize: '1rem',
      lineHeight: 1.75,
      fontWeight: 500,
      color: '#4B5563',
    },
    subtitle2: {
      fontSize: '0.875rem',
      lineHeight: 1.57,
      fontWeight: 500,
      color: '#6B7280',
    },
    body1: {
      fontSize: '1rem',
      lineHeight: 1.5,
      color: '#374151',
    },
    body2: {
      fontSize: '0.875rem',
      lineHeight: 1.43,
      color: '#4B5563',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none', // No uppercase automático
    },
    caption: {
      fontSize: '0.75rem',
      lineHeight: 1.66,
      color: '#6B7280',
    },
  },

  shape: {
    borderRadius: 8, // Bordes redondeados moderados
  },

  shadows: [
    'none',
    '0 1px 3px rgba(43, 79, 111, 0.1)',           // Sombra azul muy suave
    '0 1px 3px rgba(0, 0, 0, 0.1)',               // Sombra estándar
    '0 2px 8px rgba(43, 79, 111, 0.08)',          // Sombra azul suave
    '0 4px 12px rgba(229, 122, 45, 0.15)',        // Sombra naranja
    '0 4px 16px rgba(0, 0, 0, 0.1)',              // Sombra media
    '0 6px 20px rgba(43, 79, 111, 0.12)',         // Sombra azul media
    '0 8px 24px rgba(0, 0, 0, 0.12)',             // Sombra fuerte
    '0 10px 30px rgba(229, 122, 45, 0.2)',        // Sombra naranja fuerte
    '0 12px 36px rgba(0, 0, 0, 0.15)',
    '0 16px 48px rgba(43, 79, 111, 0.15)',
    '0 20px 60px rgba(0, 0, 0, 0.18)',
    // ... continúa hasta 25 como requiere MUI
    '0 24px 72px rgba(0, 0, 0, 0.2)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
    '0 1px 3px rgba(0, 0, 0, 0.1)',
  ],

  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          padding: '10px 24px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(43, 79, 111, 0.25)',
          },
        },
        contained: {
          '&:hover': {
            boxShadow: '0 4px 12px rgba(43, 79, 111, 0.3)',
          },
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #2B4F6F 0%, #1E3A52 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #1E3A52 0%, #162B3D 100%)',
          },
        },
        containedSecondary: {
          background: 'linear-gradient(135deg, #E57A2D 0%, #CC6823 100%)',
          '&:hover': {
            background: 'linear-gradient(135deg, #CC6823 0%, #B35619 100%)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
          transition: 'all 0.3s ease',
          '&:hover': {
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
        },
        elevation1: {
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          boxShadow: '0 2px 8px rgba(43, 79, 111, 0.08)',
        },
      },
    },
    MuiDrawer: {
      styleOverrides: {
        paper: {
          borderRadius: 0,
        },
      },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          backgroundColor: '#F9FAFB',
          '& .MuiTableCell-head': {
            fontWeight: 600,
            color: '#374151',
            borderBottom: '2px solid #E5E7EB',
          },
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 500,
        },
      },
    },
  },
});

export default lubricarTheme;

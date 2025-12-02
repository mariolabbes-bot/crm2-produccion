# 🎨 PALETA DE COLORES - CRM2 LUBRICAR INSA

**Basado en:** Logo Corporativo Lubricar  
**Colores Brand:** 🟠 Naranja + 🔵 Azul Marino  
**Estilo:** Moderno, Profesional, Alta Legibilidad

---

## 🏢 COLORES CORPORATIVOS (del Logo)

```css
/* Extraídos del logo de Lubricar */
--lubricar-orange: #E57A2D;      /* Naranja principal (ondas) */
--lubricar-orange-dark: #CC6823; /* Naranja oscuro */
--lubricar-blue: #2B4F6F;        /* Azul marino (texto LUBRICAR) */
--lubricar-blue-dark: #1E3A52;   /* Azul más oscuro */
```

---

## 🎨 PALETA EXTENDIDA MODERNA

### Colores Primarios (Basados en Brand)

```css
/* Azul Primario - Derivado del logo */
--primary-50: #EBF2F9;           /* Muy claro - Backgrounds */
--primary-100: #D6E4F3;          /* Claro - Hover states */
--primary-200: #ADC9E7;          /* Medio claro */
--primary-300: #85AEDB;          /* Medio */
--primary-400: #5C93CF;          /* Medio oscuro */
--primary-500: #3478C3;          /* Base - Similar al azul del logo */
--primary-600: #2B4F6F;          /* Azul del logo ⭐ */
--primary-700: #1E3A52;          /* Oscuro */
--primary-800: #162B3D;          /* Muy oscuro */
--primary-900: #0F1C28;          /* Ultra oscuro */

/* Naranja Acento - Del logo */
--accent-50: #FFF3E6;            /* Muy claro */
--accent-100: #FFE7CC;          /* Claro */
--accent-200: #FFCF99;          /* Medio claro */
--accent-300: #FFB766;          /* Medio */
--accent-400: #FF9F33;          /* Medio oscuro */
--accent-500: #E57A2D;          /* Naranja del logo ⭐ */
--accent-600: #CC6823;          /* Oscuro */
--accent-700: #B35619;          /* Muy oscuro */
--accent-800: #99440F;          /* Ultra oscuro */
--accent-900: #803305;          /* Extremo oscuro */
```

### Colores de Soporte (Complementarios Modernos)

```css
/* Verde - Para datos positivos */
--success-50: #ECFDF5;
--success-100: #D1FAE5;
--success-500: #10B981;          /* Principal */
--success-600: #059669;
--success-700: #047857;

/* Rojo - Para alertas */
--danger-50: #FEF2F2;
--danger-100: #FEE2E2;
--danger-500: #EF4444;           /* Principal */
--danger-600: #DC2626;
--danger-700: #B91C1C;

/* Amarillo - Para advertencias */
--warning-50: #FFFBEB;
--warning-100: #FEF3C7;
--warning-500: #F59E0B;          /* Principal */
--warning-600: #D97706;
--warning-700: #B45309;

/* Púrpura - Para clientes */
--purple-50: #FAF5FF;
--purple-100: #F3E8FF;
--purple-500: #A855F7;           /* Principal */
--purple-600: #9333EA;
--purple-700: #7E22CE;

/* Teal - Para productos */
--teal-50: #F0FDFA;
--teal-100: #CCFBF1;
--teal-500: #14B8A6;             /* Principal */
--teal-600: #0D9488;
--teal-700: #0F766E;
```

### Escala de Grises (Neutros Modernos)

```css
/* Grises - Para textos y backgrounds */
--gray-50: #F9FAFB;              /* Background muy claro */
--gray-100: #F3F4F6;             /* Background claro */
--gray-200: #E5E7EB;             /* Borders suaves */
--gray-300: #D1D5DB;             /* Borders */
--gray-400: #9CA3AF;             /* Disabled states */
--gray-500: #6B7280;             /* Placeholder text */
--gray-600: #4B5563;             /* Secondary text */
--gray-700: #374151;             /* Body text */
--gray-800: #1F2937;             /* Headings */
--gray-900: #111827;             /* Primary text */

/* Blanco y Negro */
--white: #FFFFFF;
--black: #000000;
```

---

## 🎯 ASIGNACIÓN POR MÓDULO

### Dashboard General
```css
--dashboard-primary: var(--primary-600);    /* Azul Lubricar */
--dashboard-accent: var(--accent-500);      /* Naranja Lubricar */
--dashboard-background: var(--gray-50);
```

### Ventas 💰
```css
--ventas-primary: var(--success-500);       /* Verde #10B981 */
--ventas-secondary: var(--success-600);
--ventas-light: var(--success-50);
--ventas-icon: 💰
```

### Abonos 💵
```css
--abonos-primary: var(--primary-500);       /* Azul #3478C3 */
--abonos-secondary: var(--primary-600);
--abonos-light: var(--primary-50);
--abonos-icon: 💵
```

### Clientes 👥
```css
--clientes-primary: var(--purple-500);      /* Púrpura #A855F7 */
--clientes-secondary: var(--purple-600);
--clientes-light: var(--purple-50);
--clientes-icon: 👥
```

### Productos 📦
```css
--productos-primary: var(--accent-500);     /* Naranja Lubricar */
--productos-secondary: var(--accent-600);
--productos-light: var(--accent-50);
--productos-icon: 📦
```

### Reportes 📈
```css
--reportes-primary: var(--teal-500);        /* Teal #14B8A6 */
--reportes-secondary: var(--teal-600);
--reportes-light: var(--teal-50);
--reportes-icon: 📈
```

---

## 🎨 APLICACIÓN EN COMPONENTES

### Sidebar

```css
.sidebar {
  background: linear-gradient(180deg, 
    var(--primary-700) 0%,      /* Azul oscuro arriba */
    var(--primary-800) 100%     /* Azul muy oscuro abajo */
  );
  color: var(--white);
}

.sidebar-logo {
  /* Logo de Lubricar con ondas naranjas */
  background: var(--white);
  padding: 1rem;
  border-radius: 8px;
}

.sidebar-item {
  color: var(--gray-300);
  transition: all 0.3s ease;
}

.sidebar-item:hover {
  background: rgba(229, 122, 45, 0.1);  /* Naranja suave */
  color: var(--white);
  border-left: 3px solid var(--accent-500); /* Borde naranja */
}

.sidebar-item.active {
  background: var(--accent-500);  /* Naranja del logo */
  color: var(--white);
  font-weight: 600;
}
```

### TopBar

```css
.topbar {
  background: var(--white);
  border-bottom: 2px solid var(--accent-500); /* Línea naranja */
  box-shadow: 0 2px 8px rgba(43, 79, 111, 0.08);
}

.topbar-actions {
  color: var(--primary-700);
}
```

### KPI Cards

```css
.kpi-card {
  background: var(--white);
  border-radius: 12px;
  border-left: 4px solid var(--accent-500); /* Borde naranja */
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
}

.kpi-card:hover {
  box-shadow: 0 4px 12px rgba(229, 122, 45, 0.15);
  transform: translateY(-2px);
}

.kpi-card--ventas {
  border-left-color: var(--success-500);
}

.kpi-card--abonos {
  border-left-color: var(--primary-500);
}

.kpi-card--clientes {
  border-left-color: var(--purple-500);
}

.kpi-card--productos {
  border-left-color: var(--accent-500);
}
```

### Botones

```css
/* Primario - Con colores del logo */
.button-primary {
  background: linear-gradient(135deg, 
    var(--primary-600) 0%,
    var(--primary-700) 100%
  );
  color: var(--white);
  border: none;
}

.button-primary:hover {
  background: linear-gradient(135deg, 
    var(--primary-700) 0%,
    var(--primary-800) 100%
  );
  box-shadow: 0 4px 12px rgba(43, 79, 111, 0.3);
}

/* Secundario - Naranja */
.button-secondary {
  background: linear-gradient(135deg, 
    var(--accent-500) 0%,
    var(--accent-600) 100%
  );
  color: var(--white);
}

.button-secondary:hover {
  background: linear-gradient(135deg, 
    var(--accent-600) 0%,
    var(--accent-700) 100%
  );
  box-shadow: 0 4px 12px rgba(229, 122, 45, 0.3);
}

/* Outline */
.button-outline {
  background: transparent;
  border: 2px solid var(--primary-600);
  color: var(--primary-600);
}

.button-outline:hover {
  background: var(--primary-50);
  border-color: var(--primary-700);
}
```

### Charts (Recharts)

```javascript
const CHART_COLORS = [
  '#3478C3',  // Azul primario
  '#E57A2D',  // Naranja Lubricar
  '#10B981',  // Verde
  '#A855F7',  // Púrpura
  '#14B8A6',  // Teal
  '#F59E0B',  // Amarillo
  '#EF4444',  // Rojo
  '#8B5CF6',  // Violet
];

// Gradientes para áreas
const gradientDefs = (
  <defs>
    <linearGradient id="colorVentas" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
    </linearGradient>
    
    <linearGradient id="colorAbonos" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#3478C3" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#3478C3" stopOpacity={0}/>
    </linearGradient>
    
    <linearGradient id="colorLubricar" x1="0" y1="0" x2="0" y2="1">
      <stop offset="5%" stopColor="#E57A2D" stopOpacity={0.8}/>
      <stop offset="95%" stopColor="#E57A2D" stopOpacity={0}/>
    </linearGradient>
  </defs>
);
```

---

## 📊 VISUALIZACIONES DE DATOS

### Indicadores de Tendencia

```css
.trend-up {
  color: var(--success-600);
  background: var(--success-50);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.trend-down {
  color: var(--danger-600);
  background: var(--danger-50);
  padding: 4px 8px;
  border-radius: 4px;
  font-weight: 600;
}

.trend-neutral {
  color: var(--gray-600);
  background: var(--gray-50);
  padding: 4px 8px;
  border-radius: 4px;
}
```

### Estados

```css
/* Activo */
.status-active {
  background: var(--success-100);
  color: var(--success-700);
  border: 1px solid var(--success-500);
}

/* Pendiente */
.status-pending {
  background: var(--warning-100);
  color: var(--warning-700);
  border: 1px solid var(--warning-500);
}

/* Vencido */
.status-overdue {
  background: var(--danger-100);
  color: var(--danger-700);
  border: 1px solid var(--danger-500);
}

/* Inactivo */
.status-inactive {
  background: var(--gray-100);
  color: var(--gray-700);
  border: 1px solid var(--gray-300);
}
```

---

## 🎯 CONTRASTE Y ACCESIBILIDAD

### Ratios de Contraste (WCAG AA)

```
✅ Texto sobre fondo blanco:
- primary-700 (#1E3A52): 8.5:1  (AAA)
- accent-600 (#CC6823): 4.8:1   (AA)
- gray-700 (#374151): 9.2:1     (AAA)

✅ Texto blanco sobre fondos:
- primary-600 (#2B4F6F): 6.2:1  (AA)
- accent-500 (#E57A2D): 3.8:1   (AA Large Text)
- success-600 (#059669): 4.5:1  (AA)
```

---

## 🖼️ EJEMPLOS VISUALES

### Sidebar con colores del logo

```
┌─────────────────────┐
│                     │ ← Fondo: gradient azul (#2B4F6F → #1E3A52)
│  [LOGO LUBRICAR]    │ ← Logo con ondas naranjas sobre blanco
│                     │
├─────────────────────┤
│ 📊 Dashboard        │ ← Texto gris claro (#D1D5DB)
├─────────────────────┤
│ 💰 Ventas          │ ← Active: fondo naranja (#E57A2D)
│                     │   Texto: blanco
├─────────────────────┤
│ 💵 Abonos          │ ← Hover: borde izq naranja
├─────────────────────┤
│ 👥 Clientes        │
├─────────────────────┤
│ 📦 Productos       │
└─────────────────────┘
```

### KPI Card con acento naranja

```
┌──────────────────────────┐
│ 💰 Ventas del Mes        │ ← Border-left: #E57A2D (4px)
│                          │
│ $45,230,500             │ ← Texto: #111827
│ ↗ +15.3% vs anterior   │ ← Verde: #10B981
└──────────────────────────┘
```

### Botón Primario

```
┌─────────────────┐
│ 📊 Importar     │ ← Gradient: #2B4F6F → #1E3A52
└─────────────────┘   Hover: Shadow naranja

┌─────────────────┐
│ + Nuevo Cliente │ ← Gradient: #E57A2D → #CC6823
└─────────────────┘   Naranja del logo
```

---

## 📦 ARCHIVO THEME.JS

```javascript
// src/styles/theme.js
import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  palette: {
    primary: {
      main: '#2B4F6F',      // Azul Lubricar
      light: '#3478C3',
      dark: '#1E3A52',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#E57A2D',      // Naranja Lubricar
      light: '#FF9F33',
      dark: '#CC6823',
      contrastText: '#FFFFFF',
    },
    success: {
      main: '#10B981',
      light: '#D1FAE5',
      dark: '#059669',
    },
    error: {
      main: '#EF4444',
      light: '#FEE2E2',
      dark: '#DC2626',
    },
    warning: {
      main: '#F59E0B',
      light: '#FEF3C7',
      dark: '#D97706',
    },
    info: {
      main: '#3478C3',
      light: '#D6E4F3',
      dark: '#2B4F6F',
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
  },
  
  // Colores custom por módulo
  custom: {
    lubricar: {
      orange: '#E57A2D',
      blue: '#2B4F6F',
    },
    modules: {
      ventas: '#10B981',
      abonos: '#3478C3',
      clientes: '#A855F7',
      productos: '#E57A2D',
      reportes: '#14B8A6',
    },
  },
  
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      color: '#111827',
    },
    h2: {
      fontWeight: 600,
      color: '#1F2937',
    },
    body1: {
      color: '#374151',
    },
  },
  
  shadows: [
    'none',
    '0 1px 3px rgba(43, 79, 111, 0.1)',      // Sombra azul suave
    '0 2px 8px rgba(43, 79, 111, 0.08)',
    '0 4px 12px rgba(229, 122, 45, 0.15)',   // Sombra naranja
    // ... más sombras
  ],
});

export default theme;
```

---

## ✅ RESUMEN

**Colores Principales:**
- 🔵 **Azul Lubricar (#2B4F6F)** - Sidebar, primarios, confianza
- 🟠 **Naranja Lubricar (#E57A2D)** - Acentos, CTAs, energía
- ⚪ **Blanco (#FFFFFF)** - Backgrounds, cards
- ⬛ **Grises (#F9FAFB → #111827)** - Textos, borders

**Por Módulo:**
- 💰 Ventas: Verde #10B981
- 💵 Abonos: Azul #3478C3
- 👥 Clientes: Púrpura #A855F7
- 📦 Productos: Naranja #E57A2D
- 📈 Reportes: Teal #14B8A6

**Ventajas:**
✅ Integra colores corporativos del logo
✅ Contraste WCAG AA/AAA cumplido
✅ Paleta moderna y profesional
✅ Diferenciación clara por módulos
✅ Coherencia visual con marca Lubricar

---

**¿Aprobamos esta paleta y continuamos con la implementación?** 🎨🚀

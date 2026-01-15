import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Divider,
  Avatar,
} from '@mui/material';
import {
  Dashboard as DashboardIcon,
  Chat as ChatIcon,
  ShoppingCart as VentasIcon,
  Payment as AbonosIcon,
  People as ClientesIcon,
  Inventory as ProductosIcon,
  Assessment as ReportesIcon,
  Settings as SettingsIcon,
  ExitToApp as LogoutIcon,
  UploadFile as ImportIcon,
  Security as AdminIcon,
} from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 72;

import { useUI } from '../contexts/UIContext';

const Sidebar = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const { sidebarCollapsed, toggleSidebar } = useUI();

  const menuItems = [
    {
      title: 'Asistente',
      icon: <ChatIcon />,
      path: '/assistant',
      color: '#E57A2D',
      highlighted: true
    },
    {
      title: 'Dashboard',
      icon: <DashboardIcon />,
      path: '/',
      color: '#2B4F6F' // Azul Lubricar
    },
    {
      title: 'Ventas',
      icon: <VentasIcon />,
      path: '/ventas',
      color: '#10B981' // Verde
    },
    {
      title: 'Abonos',
      icon: <AbonosIcon />,
      path: '/abonos',
      color: '#3478C3' // Azul claro
    },
    {
      title: 'Clientes',
      icon: <ClientesIcon />,
      path: '/clientes',
      color: '#A855F7' // Púrpura
    },
    {
      title: 'Productos',
      icon: <ProductosIcon />,
      path: '/productos',
      color: '#E57A2D' // Naranja Lubricar
    },
    {
      title: 'Reportes',
      icon: <ReportesIcon />,
      path: '/reportes',
      color: '#14B8A6', // Teal
      divider: true
    },
    {
      title: 'Importar Datos',
      icon: <ImportIcon />,
      path: '/import-data',
      color: '#F59E0B', // Amber
      managerOnly: true
    },
    {
      title: 'Administración',
      icon: <AdminIcon />, // Reusing SettingsIcon or could import AdminPanelSettings if available, but Settings is fine for now or I can add another icon import
      path: '/admin',
      color: '#EF4444', // Red for danger/admin
      managerOnly: true
    },
    {
      title: 'Configuración',
      icon: <SettingsIcon />,
      path: '/configuracion',
      color: '#6B7280' // Gris
    },
  ];

  const handleNavigation = (path) => {
    navigate(path);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isActive = (path) => {
    if (path === '/') {
      return location.pathname === '/';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
          boxSizing: 'border-box',
          background: 'linear-gradient(180deg, #2B4F6F 0%, #1E3A52 100%)',
          borderRight: 'none',
          color: '#D1D5DB',
          overflowX: 'hidden'
        },
      }}
    >
      {/* Logo y Título */}
      <Box sx={{ p: sidebarCollapsed ? 1.5 : 3, textAlign: 'center' }}>
        {/* Logo como texto estilizado */}
        {!sidebarCollapsed && (
          <>
            <Typography
              variant="h5"
              sx={{
                color: '#FFFFFF',
                fontWeight: 700,
                letterSpacing: '2px',
                mb: 1,
                textTransform: 'uppercase',
                fontSize: '1.3rem'
              }}
            >
              LUBRICAR
            </Typography>
            <Typography
              variant="subtitle2"
              sx={{
                color: '#E57A2D', // Naranja Lubricar
                fontWeight: 600,
                letterSpacing: '1.5px',
                mb: 2,
                fontSize: '0.9rem'
              }}
            >
              INSA
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#9CA3AF',
                fontWeight: 500,
                display: 'block',
                letterSpacing: '0.5px'
              }}
            >
              CRM Dashboard
            </Typography>
          </>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)' }} />

      {/* Usuario Actual */}
      <Box sx={{ p: sidebarCollapsed ? 1 : 2, display: 'flex', alignItems: 'center', gap: 1.5 }}>
        <Avatar
          sx={{
            bgcolor: '#E57A2D',
            width: 40,
            height: 40,
            fontWeight: 600,
          }}
        >
          {user?.nombre_completo?.charAt(0) || 'U'}
        </Avatar>
        {!sidebarCollapsed && (
          <Box sx={{ flex: 1, overflow: 'hidden' }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 600,
                color: '#FFFFFF',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap'
              }}
            >
              {user?.nombre_completo || 'Usuario'}
            </Typography>
            <Typography
              variant="caption"
              sx={{
                color: '#9CA3AF',
                textTransform: 'capitalize'
              }}
            >
              {user?.rol?.toLowerCase() || 'vendedor'}
            </Typography>
          </Box>
        )}
      </Box>

      <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 1 }} />

      {/* Menú Principal */}
      <List sx={{ px: sidebarCollapsed ? 0.5 : 1, flex: 1 }}>
        {menuItems.map((item) => {
          // Ocultar "Importar Datos" si no es manager
          if (item.managerOnly && user?.rol?.toUpperCase() !== 'MANAGER') {
            return null;
          }

          return (
            <React.Fragment key={item.title}>
              {item.divider && (
                <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', my: 1 }} />
              )}
              <ListItem disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => handleNavigation(item.path)}
                  sx={{
                    borderRadius: 2,
                    color: '#FFFFFF', // TEXTO BLANCO SIEMPRE
                    backgroundColor: isActive(item.path)
                      ? (item.highlighted ? 'rgba(229, 122, 45, 0.35)' : 'rgba(229, 122, 45, 0.15)')
                      : 'transparent',
                    borderLeft: isActive(item.path)
                      ? `4px solid ${item.highlighted ? '#F59E0B' : '#E57A2D'}`
                      : '4px solid transparent',
                    '&:hover': {
                      backgroundColor: 'rgba(229, 122, 45, 0.1)',
                      color: '#FFFFFF',
                    },
                    transition: 'all 0.2s ease',
                  }}
                >
                  <ListItemIcon
                    sx={{
                      color: '#FFFFFF', // ICONOS BLANCOS SIEMPRE para mejor contraste
                      minWidth: sidebarCollapsed ? 0 : 40,
                      transition: 'color 0.2s ease',
                      opacity: isActive(item.path) ? 1 : 0.85,
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  {!sidebarCollapsed && (
                    <ListItemText
                      primary={item.title}
                      primaryTypographyProps={{
                        fontSize: '0.9375rem',
                        fontWeight: isActive(item.path) ? 600 : 500,
                        color: '#FFFFFF', // TEXTO BLANCO
                      }}
                    />
                  )}
                </ListItemButton>
              </ListItem>
            </React.Fragment>
          );
        })}
      </List>

      {/* Logout */}
      <Box sx={{ p: 1 }}>
        <Divider sx={{ borderColor: 'rgba(255, 255, 255, 0.1)', mb: 1 }} />
        <ListItem disablePadding>
          <ListItemButton
            onClick={handleLogout}
            sx={{
              borderRadius: 2,
              color: '#FFFFFF', // TEXTO BLANCO
              '&:hover': {
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                color: '#FFFFFF',
                '& .MuiListItemIcon-root': {
                  color: '#EF4444',
                },
              },
              transition: 'all 0.2s ease',
            }}
          >
            <ListItemIcon
              sx={{
                color: '#FFFFFF', // ICONO BLANCO para mejor contraste
                minWidth: 40,
                transition: 'color 0.2s ease',
                opacity: 0.85,
              }}
            >
              <LogoutIcon />
            </ListItemIcon>
            <ListItemText
              primary="Cerrar Sesión"
              primaryTypographyProps={{
                fontSize: '0.9375rem',
                fontWeight: 500,
                color: '#FFFFFF', // TEXTO BLANCO
              }}
            />
          </ListItemButton>
        </ListItem>
      </Box>
    </Drawer>
  );
};

export default Sidebar;
export { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH };

import React from 'react';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Box, 
  IconButton,
  Badge,
  Avatar,
  Tooltip,
} from '@mui/material';
import { 
  Notifications as NotificationsIcon,
  Settings as SettingsIcon,
  HelpOutline as HelpIcon,
} from '@mui/icons-material';
import { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { useAuth } from '../contexts/AuthContext';
import { useUI } from '../contexts/UIContext';
import MenuIcon from '@mui/icons-material/Menu';

const TopBar = ({ title = 'Dashboard', subtitle = null }) => {
  const { user } = useAuth();

  const { sidebarCollapsed, toggleSidebar } = useUI();
  const currentSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <AppBar 
      position="fixed" 
      elevation={0}
      sx={{ 
        width: `calc(100% - ${currentSidebarWidth}px)`,
        ml: `${currentSidebarWidth}px`,
        backgroundColor: '#FFFFFF',
        borderBottom: '3px solid #E57A2D', // Borde naranja Lubricar
        color: '#111827',
      }}
    >
      <Toolbar sx={{ justifyContent: 'space-between', minHeight: 70 }}>
        {/* Título de la Página + toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={toggleSidebar} size="small">
            <MenuIcon />
          </IconButton>
        </Box>
        <Box>
          <Typography 
            variant="h5" 
            sx={{ 
              fontWeight: 700,
              color: '#2B4F6F', // Azul Lubricar
              mb: subtitle ? 0.5 : 0
            }}
          >
            {title}
          </Typography>
          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: '#6B7280',
                fontWeight: 500
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>

        {/* Acciones Rápidas */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {/* Ayuda */}
          <Tooltip title="Ayuda">
            <IconButton 
              sx={{ 
                color: '#6B7280',
                '&:hover': { 
                  backgroundColor: 'rgba(229, 122, 45, 0.1)',
                  color: '#E57A2D'
                }
              }}
            >
              <HelpIcon />
            </IconButton>
          </Tooltip>

          {/* Notificaciones */}
          <Tooltip title="Notificaciones">
            <IconButton 
              sx={{ 
                color: '#6B7280',
                '&:hover': { 
                  backgroundColor: 'rgba(229, 122, 45, 0.1)',
                  color: '#E57A2D'
                }
              }}
            >
              <Badge badgeContent={3} color="error">
                <NotificationsIcon />
              </Badge>
            </IconButton>
          </Tooltip>

          {/* Configuración */}
          <Tooltip title="Configuración">
            <IconButton 
              sx={{ 
                color: '#6B7280',
                '&:hover': { 
                  backgroundColor: 'rgba(229, 122, 45, 0.1)',
                  color: '#E57A2D'
                }
              }}
            >
              <SettingsIcon />
            </IconButton>
          </Tooltip>

          {/* Avatar del Usuario */}
          <Tooltip title={user?.nombre_completo || 'Usuario'}>
            <Avatar
              sx={{
                bgcolor: '#E57A2D',
                width: 40,
                height: 40,
                fontWeight: 600,
                ml: 1,
                cursor: 'pointer',
                border: '2px solid #F3F4F6',
                '&:hover': {
                  borderColor: '#E57A2D',
                }
              }}
            >
              {user?.nombre_completo?.charAt(0) || 'U'}
            </Avatar>
          </Tooltip>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default TopBar;

import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import BottomNav from './Mobile/BottomNav';
import { useUI } from '../contexts/UIContext';
import TopBar from './TopBar';
import useIsMobile from '../hooks/useIsMobile';

/**
 * MainLayout - Layout principal del dashboard
 * Adaptativo: Escritorio (Sidebar) vs Móvil (BottomNav)
 */
const MainLayout = ({ pageTitle = 'Dashboard', pageSubtitle = null }) => {
  const { sidebarCollapsed } = useUI();
  const isMobile = useIsMobile();

  const currentSidebarWidth = isMobile ? 0 : (sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB', flexDirection: 'column' }}>

      {/* Navegación: Sidebar (Desktop) o BottomNav (Mobile) */}
      {!isMobile && <Sidebar />}

      {/* Área Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: isMobile ? '100%' : `calc(100% - ${currentSidebarWidth}px)`,
          ml: isMobile ? 0 : `${currentSidebarWidth}px`, // Margen solo en escritorio
          mb: isMobile ? '65px' : 0, // Espacio para BottomNav en móvil
          transition: 'margin 0.3s ease, width 0.3s ease'
        }}
      >
        {/* TopBar - Fijo arriba */}
        <TopBar title={pageTitle} subtitle={pageSubtitle} isMobile={isMobile} />

        {/* Espaciador para compensar TopBar fijo */}
        <Toolbar sx={{ minHeight: isMobile ? 56 : 70 }} />

        {/* Contenido de la página */}
        <Box sx={{ p: isMobile ? 2 : 3 }}>
          <Outlet context={{ isMobile }} />
        </Box>
      </Box>

      {/* Navegación Inferior (Solo Móvil) */}
      {isMobile && <BottomNav />}
    </Box>
  );
};

export default MainLayout;

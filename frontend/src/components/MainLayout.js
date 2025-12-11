import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH, SIDEBAR_COLLAPSED_WIDTH } from './Sidebar';
import { useUI } from '../contexts/UIContext';
import TopBar from './TopBar';

/**
 * MainLayout - Layout principal del dashboard
 * Incluye Sidebar fijo + TopBar + Área de contenido
 */
const MainLayout = ({ pageTitle = 'Dashboard', pageSubtitle = null }) => {
  const { sidebarCollapsed } = useUI();

  const currentSidebarWidth = sidebarCollapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH;

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      {/* Sidebar - Fijo a la izquierda */}
      <Sidebar />

      {/* Área Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${currentSidebarWidth}px)`,
          ml: `${currentSidebarWidth}px`,
        }}
      >
        {/* TopBar - Fijo arriba */}
        <TopBar title={pageTitle} subtitle={pageSubtitle} />

        {/* Espaciador para compensar TopBar fijo */}
        <Toolbar sx={{ minHeight: 70 }} />

        {/* Contenido de la página */}
        <Box sx={{ p: 3 }}>
          <Outlet />
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;

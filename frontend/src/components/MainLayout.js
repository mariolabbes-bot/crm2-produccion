import React from 'react';
import { Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import Sidebar, { SIDEBAR_WIDTH } from './Sidebar';
import TopBar from './TopBar';

/**
 * MainLayout - Layout principal del dashboard
 * Incluye Sidebar fijo + TopBar + Área de contenido
 */
const MainLayout = ({ pageTitle = 'Dashboard', pageSubtitle = null }) => {
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', backgroundColor: '#F9FAFB' }}>
      {/* Sidebar - Fijo a la izquierda */}
      <Sidebar />

      {/* Área Principal */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: `calc(100% - ${SIDEBAR_WIDTH}px)`,
          ml: `${SIDEBAR_WIDTH}px`,
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

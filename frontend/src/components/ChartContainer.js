import React from 'react';
import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';

/**
 * ChartContainer - Contenedor reutilizable para gráficos Recharts
 * 
 * @param {string} title - Título del gráfico
 * @param {string} subtitle - Subtítulo opcional
 * @param {React.ReactNode} children - Componente de gráfico (Recharts)
 * @param {React.ReactNode} actions - Acciones opcionales (filtros, exportar, etc.)
 * @param {boolean} loading - Estado de carga
 * @param {number} height - Altura del contenedor (default: 350px)
 */
const ChartContainer = ({ 
  title, 
  subtitle = null,
  children, 
  actions = null,
  loading = false,
  height = 350
}) => {
  return (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 3 }}>
        {/* Header: Título + Acciones */}
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'flex-start',
          mb: 3
        }}>
          <Box>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: '#111827',
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
                  fontSize: '0.875rem'
                }}
              >
                {subtitle}
              </Typography>
            )}
          </Box>

          {actions && (
            <Box sx={{ display: 'flex', gap: 1 }}>
              {actions}
            </Box>
          )}
        </Box>

        {/* Contenido del Gráfico */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height }}>
            <Skeleton variant="rectangular" width="100%" height={height} />
          </Box>
        ) : (
          <Box sx={{ 
            width: '100%', 
            height,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center'
          }}>
            {children}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ChartContainer;

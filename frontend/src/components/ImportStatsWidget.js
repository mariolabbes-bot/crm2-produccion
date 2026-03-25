import React, { useState, useEffect } from 'react';
import { Card, CardContent, Box, Typography, Grid, CircularProgress, Alert } from '@mui/material';
import { getImportStats } from '../api';
import UpdateIcon from '@mui/icons-material/Update';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';

const ImportStatsWidget = () => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadStats();
    // Actualizar cada 5 minutos
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const loadStats = async () => {
    try {
      setLoading(true);
      const result = await getImportStats();
      if (result.success) {
        setStats(result.data);
        setError(null);
      } else {
        setError('No se pudieron cargar las estadísticas');
      }
    } catch (err) {
      console.error('Error loading import stats:', err);
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (date) => {
    if (!date) return 'Sin datos';
    const d = new Date(date);
    if (isNaN(d)) return 'Fecha inválida';
    return d.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric'
    });
  };

  const formatDateTime = (date) => {
    if (!date) return 'Sin datos';
    const d = new Date(date);
    if (isNaN(d)) return 'Fecha inválida';
    return d.toLocaleDateString('es-CL', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const StatItem = ({ label, date, registros, icon = null }) => (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: 1.5,
      padding: '8px 12px',
      backgroundColor: '#f5f5f5',
      borderRadius: '6px',
      flex: 1,
      minWidth: '200px'
    }}>
      {icon || <UpdateIcon sx={{ fontSize: 20, color: '#1976d2' }} />}
      <Box sx={{ flex: 1, minWidth: 0 }}>
        <Typography 
          variant="caption" 
          sx={{ 
            display: 'block', 
            color: '#666',
            fontWeight: 500,
            textTransform: 'uppercase',
            fontSize: '11px',
            letterSpacing: '0.5px'
          }}
        >
          {label}
        </Typography>
        <Typography 
          variant="body2" 
          sx={{ 
            color: '#333',
            fontWeight: 600,
            fontSize: '13px',
            marginTop: '2px'
          }}
          title={formatDateTime(date)}
        >
          {formatDate(date)}
        </Typography>
        {registros > 0 && (
          <Typography 
            variant="caption" 
            sx={{ 
              display: 'block',
              color: '#999',
              fontSize: '11px',
              marginTop: '2px'
            }}
          >
            {registros.toLocaleString('es-CL')} registros
          </Typography>
        )}
      </Box>
    </Box>
  );

  if (error && !stats) {
    return (
      <Box sx={{ width: '100%', bgcolor: '#fff3e0', color: '#e65100', px: 2, py: 0.5, fontSize: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 2, borderRadius: 1 }}>
        <ErrorIcon sx={{ fontSize: 14, mr: 1 }} />
        {error}
      </Box>
    );
  }

  return (
    <Box sx={{ 
      display: 'flex', 
      alignItems: 'center', 
      justifyContent: 'space-between',
      bgcolor: '#e3f2fd', 
      color: '#1565c0', 
      px: 2, 
      py: 0.5, 
      mb: 2, 
      borderRadius: 1,
      fontSize: '0.75rem',
      fontWeight: 600,
      width: '100%',
      boxSizing: 'border-box',
      overflowX: 'auto',
      whiteSpace: 'nowrap'
    }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 2 }}>
        {loading ? <CircularProgress size={12} color="inherit" /> : <CheckCircleIcon sx={{ fontSize: 14, color: '#2e7d32' }} />}
        <Typography variant="caption" sx={{ fontWeight: 700, textTransform: 'uppercase', mr: 2, color: '#1976d2' }}>
          ÚLTIMA SINCRONIZACIÓN:
        </Typography>
      </Box>

      {stats ? (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 3, flexGrow: 1 }}>
          <Box>
            <span style={{ color: '#555' }}>Ventas:</span> <strong>{formatDateTime(stats.ventas?.ultima_fecha)}</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>({(stats.ventas?.total_registros || 0).toLocaleString('es-CL')})</span>
          </Box>
          <Box>
            <span style={{ color: '#555' }}>Abonos:</span> <strong>{formatDateTime(stats.abonos?.ultima_fecha)}</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>({(stats.abonos?.total_registros || 0).toLocaleString('es-CL')})</span>
          </Box>
          <Box>
            <span style={{ color: '#555' }}>Clientes:</span> <strong>{formatDateTime(stats.clientes?.ultima_fecha)}</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>({(stats.clientes?.total_registros || 0).toLocaleString('es-CL')})</span>
          </Box>
          <Box>
            <span style={{ color: '#555' }}>Saldos:</span> <strong>{formatDateTime(stats.credito?.ultima_fecha)}</strong> <span style={{ color: '#888', fontWeight: 'normal' }}>({(stats.credito?.total_registros || 0).toLocaleString('es-CL')})</span>
          </Box>
        </Box>
      ) : (
        <Typography variant="caption" sx={{ color: '#555' }}>Cargando datos de sincronización...</Typography>
      )}
    </Box>
  );
};

export default ImportStatsWidget;

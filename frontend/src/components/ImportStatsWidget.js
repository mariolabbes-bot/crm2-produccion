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
      <Card sx={{ mb: 2, backgroundColor: '#fff3e0' }}>
        <CardContent>
          <Alert severity="warning" sx={{ margin: 0 }}>
            {error}
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card sx={{ 
      mb: 2, 
      backgroundColor: '#fafafa',
      borderLeft: '4px solid #1976d2'
    }}>
      <CardContent sx={{ pb: 1.5 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
          <Typography 
            variant="subtitle2" 
            sx={{ 
              fontWeight: 700,
              textTransform: 'uppercase',
              fontSize: '12px',
              letterSpacing: '0.5px',
              color: '#1976d2'
            }}
          >
            📊 Última Importación de Datos
          </Typography>
          {loading ? (
            <CircularProgress size={20} />
          ) : (
            <CheckCircleIcon sx={{ fontSize: 18, color: '#4caf50' }} />
          )}
        </Box>

        {stats ? (
          <Grid container spacing={1.5} sx={{ mt: 0 }}>
            {/* Ventas */}
            <Grid item xs={12} sm={6} md={3}>
              <StatItem 
                label="Ventas" 
                date={stats.ventas?.ultima_fecha}
                registros={stats.ventas?.total_registros}
              />
            </Grid>

            {/* Abonos */}
            <Grid item xs={12} sm={6} md={3}>
              <StatItem 
                label="Abonos" 
                date={stats.abonos?.ultima_fecha}
                registros={stats.abonos?.total_registros}
              />
            </Grid>

            {/* Clientes */}
            <Grid item xs={12} sm={6} md={3}>
              <StatItem 
                label="Clientes" 
                date={stats.clientes?.ultima_fecha}
                registros={stats.clientes?.total_registros}
              />
            </Grid>

            {/* Saldo Crédito */}
            <Grid item xs={12} sm={6} md={3}>
              <StatItem 
                label="Saldo Crédito" 
                date={stats.credito?.ultima_fecha}
                registros={stats.credito?.total_registros}
              />
            </Grid>
          </Grid>
        ) : (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={30} />
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export default ImportStatsWidget;

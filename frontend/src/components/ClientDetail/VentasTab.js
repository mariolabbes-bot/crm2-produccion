import React from 'react';
import {
  Box,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Card,
  Grid,
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * VentasTab
 * Muestra ventas mensuales comparativas (últimos 4 meses)
 */
function VentasTab({ data, loading, error }) {
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) {
    return <Alert severity="info">Sin información de ventas</Alert>;
  }

  const { meses, promedio_trimestre_anterior, mes_actual, variacion_porcentaje, trending } = data;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getTrendingIcon = () => {
    if (trending === 'UP') {
      return <TrendingUpIcon sx={{ color: '#4caf50', ml: 1 }} />;
    } else if (trending === 'DOWN') {
      return <TrendingDownIcon sx={{ color: '#f44336', ml: 1 }} />;
    }
    return null;
  };

  const getTrendingColor = () => {
    if (trending === 'UP') return '#4caf50';
    if (trending === 'DOWN') return '#f44336';
    return '#ff9800';
  };

  return (
    <Box>
      {/* KPIs Comparativos */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Promedio Trimestre Anterior */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Promedio Trimestre Anterior
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {formatCurrency(promedio_trimestre_anterior)}
            </Typography>
          </Card>
        </Grid>

        {/* Mes Actual */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Mes Actual
            </Typography>
            <Typography variant="h6" sx={{ fontWeight: 'bold', mt: 1 }}>
              {formatCurrency(mes_actual)}
            </Typography>
          </Card>
        </Grid>

        {/* Variación */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Variación
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mt: 1 }}>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  color: getTrendingColor(),
                }}
              >
                {variacion_porcentaje > 0 ? '+' : ''}
                {(variacion_porcentaje || 0).toFixed(1)}%
              </Typography>
              {getTrendingIcon()}
            </Box>
          </Card>
        </Grid>

        {/* Trending */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Tendencia
            </Typography>
            <Chip
              label={
                trending === 'UP'
                  ? '📈 Crecimiento'
                  : trending === 'DOWN'
                  ? '📉 Decrecimiento'
                  : '➡️ Estable'
              }
              color={
                trending === 'UP'
                  ? 'success'
                  : trending === 'DOWN'
                  ? 'error'
                  : 'warning'
              }
              sx={{ mt: 1 }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Tabla de Meses */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        📊 Ventas Mensuales
      </Typography>

      <TableContainer sx={{ boxShadow: 1, borderRadius: 1 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold' }}>Mes</TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Monto
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                # Ventas
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Variación
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {meses &&
              meses.map((mes, idx) => {
                // Calcular variación solo para meses que no son el promedio
                let variacion = null;
                let variacionColor = '#999';

                if (idx > 0 && meses[idx - 1]) {
                  const anterior = parseFloat(meses[idx - 1].monto || 0);
                  const actual = parseFloat(mes.monto || 0);
                  if (anterior > 0) {
                    variacion = (((actual - anterior) / anterior) * 100).toFixed(1);
                    variacionColor = variacion > 0 ? '#4caf50' : '#f44336';
                  }
                }

                return (
                  <TableRow
                    key={idx}
                    sx={{
                      '&:hover': { backgroundColor: '#f9f9f9' },
                      borderBottom: '1px solid #e0e0e0',
                    }}
                  >
                    <TableCell sx={{ fontWeight: 500 }}>
                      {mes.mes_nombre}
                    </TableCell>
                    <TableCell align="right" sx={{ fontWeight: 500 }}>
                      {formatCurrency(mes.monto)}
                    </TableCell>
                    <TableCell align="right">{mes.num_ventas}</TableCell>
                    <TableCell
                      align="center"
                      sx={{
                        color: variacionColor,
                        fontWeight: variacion ? 'bold' : 'normal',
                      }}
                    >
                      {variacion !== null
                        ? `${variacion > 0 ? '+' : ''}${variacion}%`
                        : '-'}
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Insight */}
      {trending === 'UP' && (
        <Alert severity="success" sx={{ mt: 2 }}>
          ✅ Las ventas con este cliente están en tendencia de crecimiento.
        </Alert>
      )}
      {trending === 'DOWN' && (
        <Alert severity="warning" sx={{ mt: 2 }}>
          ⚠️ Las ventas con este cliente han disminuido. Considere contactar para reforzar relación.
        </Alert>
      )}
    </Box>
  );
}

export default VentasTab;

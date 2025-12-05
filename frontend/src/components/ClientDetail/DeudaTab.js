import React from 'react';
import {
  Box,
  Card,
  CircularProgress,
  Alert,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  LinearProgress,
} from '@mui/material';
import CreditCardIcon from '@mui/icons-material/CreditCard';
import WarningIcon from '@mui/icons-material/Warning';

/**
 * DeudaTab
 * Muestra deuda pendiente y documentos con deuda
 */
function DeudaTab({ data, loading, error }) {
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
    return <Alert severity="info">Sin información de deuda</Alert>;
  }

  const { resumen, documentos } = data;
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getUtilizationColor = (percentage) => {
    if (percentage < 50) return '#4caf50'; // Green
    if (percentage < 80) return '#ff9800'; // Orange
    return '#f44336'; // Red
  };

  return (
    <Box>
      {/* Resumen KPIs */}
      <Grid container spacing={2} sx={{ mb: 4 }}>
        {/* Deuda Total */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Deuda Total
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: resumen.deuda > 0 ? '#f44336' : '#4caf50',
                mt: 1,
              }}
            >
              {formatCurrency(resumen.deuda)}
            </Typography>
          </Card>
        </Grid>

        {/* Límite Crédito */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Límite Crédito
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', mt: 1 }}>
              {formatCurrency(resumen.limite_credito)}
            </Typography>
          </Card>
        </Grid>

        {/* Disponible */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Disponible
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: resumen.disponible > 0 ? '#4caf50' : '#f44336',
                mt: 1,
              }}
            >
              {formatCurrency(resumen.disponible)}
            </Typography>
          </Card>
        </Grid>

        {/* % Utilización */}
        <Grid item xs={12} sm={6} md={3}>
          <Card sx={{ p: 2 }}>
            <Typography variant="caption" sx={{ color: '#666' }}>
              % Utilización
            </Typography>
            <Typography
              variant="h5"
              sx={{
                fontWeight: 'bold',
                color: getUtilizationColor(resumen.porcentaje_utilizacion),
                mt: 1,
              }}
            >
              {resumen.porcentaje_utilizacion.toFixed(1)}%
            </Typography>
            <LinearProgress
              variant="determinate"
              value={Math.min(resumen.porcentaje_utilizacion, 100)}
              sx={{
                mt: 1,
                backgroundColor: '#e0e0e0',
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getUtilizationColor(
                    resumen.porcentaje_utilizacion
                  ),
                },
              }}
            />
          </Card>
        </Grid>
      </Grid>

      {/* Alerta si está sobre límite */}
      {resumen.porcentaje_utilizacion > 100 && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            ⚠️ Cliente ha excedido su límite de crédito
          </Typography>
          <Typography variant="caption">
            No se recomienda realizar crédito adicional hasta que pague deuda pendiente.
          </Typography>
        </Alert>
      )}

      {resumen.porcentaje_utilizacion > 80 && resumen.porcentaje_utilizacion <= 100 && (
        <Alert severity="warning" sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
            ⚠️ Cliente está cerca de su límite de crédito
          </Typography>
          <Typography variant="caption">
            Capacidad disponible: {formatCurrency(resumen.disponible)}
          </Typography>
        </Alert>
      )}

      {/* Tabla de documentos */}
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        📄 Documentos con Deuda
      </Typography>

      {documentos && documentos.length > 0 ? (
        <TableContainer sx={{ boxShadow: 1, borderRadius: 1 }}>
          <Table>
            <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
              <TableRow>
                <TableCell sx={{ fontWeight: 'bold' }}>Folio</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Fecha Emisión</TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  Monto
                </TableCell>
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  Deuda
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {documentos.map((doc, idx) => (
                <TableRow
                  key={idx}
                  sx={{
                    '&:hover': { backgroundColor: '#f9f9f9' },
                    borderBottom: '1px solid #e0e0e0',
                  }}
                >
                  <TableCell sx={{ fontWeight: 500 }}>{doc.folio}</TableCell>
                  <TableCell>{doc.tipo_documento}</TableCell>
                  <TableCell>
                    {new Date(doc.fecha_emision).toLocaleDateString('es-CL')}
                  </TableCell>
                  <TableCell align="right">
                    {formatCurrency(doc.valor_total)}
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      color: doc.deuda_documento > 0 ? '#f44336' : '#4caf50',
                      fontWeight: 'bold',
                    }}
                  >
                    {formatCurrency(doc.deuda_documento)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Alert severity="success">✅ Cliente sin deuda pendiente</Alert>
      )}
    </Box>
  );
}

export default DeudaTab;

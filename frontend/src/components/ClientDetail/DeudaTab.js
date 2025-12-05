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
} from '@mui/material';
import WarningIcon from '@mui/icons-material/Warning';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

function DeudaTab({ data, loading, error }) {
  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>;
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!data) {
    return <Alert severity="info">Sin información de deuda</Alert>;
  }

  const { deuda, documentos } = data;
  
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('es-CL');
  };

  return (
    <Box>
      <Grid container spacing={2} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: deuda.total_deuda > 0 ? '#ffebee' : '#e8f5e9' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>Deuda Total</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: deuda.total_deuda > 0 ? '#f44336' : '#4caf50', mt: 1 }}>
              {formatCurrency(deuda.total_deuda)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 1 }}>
              {deuda.cantidad_facturas} documento(s)
            </Typography>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={6}>
          <Card sx={{ p: 2, textAlign: 'center', bgcolor: deuda.saldo_favor > 0 ? '#e8f5e9' : '#f5f5f5' }}>
            <Typography variant="caption" sx={{ color: '#666' }}>Saldo a Favor</Typography>
            <Typography variant="h5" sx={{ fontWeight: 'bold', color: deuda.saldo_favor > 0 ? '#4caf50' : '#999', mt: 1 }}>
              {formatCurrency(deuda.saldo_favor)}
            </Typography>
            <Typography variant="caption" sx={{ color: '#999', display: 'block', mt: 1 }}>
              Disponible para usar
            </Typography>
          </Card>
        </Grid>
      </Grid>

      {deuda.total_deuda === 0 && (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>✅ Cliente sin deuda pendiente</Typography>
        </Alert>
      )}

      {deuda.total_deuda > 0 && (
        <Alert severity="warning" icon={<WarningIcon />} sx={{ mb: 2 }}>
          <Typography variant="body2" sx={{ fontWeight: 'bold' }}>⚠️ Cliente con deuda pendiente: {formatCurrency(deuda.total_deuda)}</Typography>
        </Alert>
      )}

      {documentos && documentos.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mt: 3, mb: 2, fontWeight: 'bold' }}>📋 Documentos Pendientes ({documentos.length})</Typography>
          <TableContainer sx={{ border: '1px solid #e0e0e0', borderRadius: 1 }}>
            <Table>
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell sx={{ fontWeight: 'bold' }}>Folio</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Fecha</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Monto Factura</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 'bold' }}>Deuda</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {documentos.map((doc, idx) => (
                  <TableRow key={idx} hover>
                    <TableCell>{doc.folio}</TableCell>
                    <TableCell>{doc.tipo_documento}</TableCell>
                    <TableCell>{formatDate(doc.fecha_emision)}</TableCell>
                    <TableCell align="right" sx={{ color: '#666' }}>{formatCurrency(doc.total_factura)}</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: doc.deuda_documento > 0 ? '#f44336' : '#4caf50' }}>
                      {formatCurrency(doc.deuda_documento)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      )}

      {(!documentos || documentos.length === 0) && deuda.total_deuda === 0 && (
        <Box sx={{ mt: 3, p: 2, bgcolor: '#f9f9f9', borderRadius: 1, textAlign: 'center' }}>
          <Typography variant="body2" sx={{ color: '#999' }}>No hay documentos con deuda</Typography>
        </Box>
      )}
    </Box>
  );
}

export default DeudaTab;

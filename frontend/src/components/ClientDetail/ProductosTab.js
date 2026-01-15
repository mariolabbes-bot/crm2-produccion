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
} from '@mui/material';

/**
 * ProductosTab
 * Muestra productos comprados en últimos 12 meses
 */
function ProductosTab({ data, loading, error }) {
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

  if (!data || !data.productos || data.productos.length === 0) {
    return <Alert severity="info">Sin productos comprados en los últimos 12 meses</Alert>;
  }

  const { productos } = data;

  // Helpers
  const toNum = (v) => {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  return (
    <Box className="card-unified">
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        🛍️ Productos (Últimos 12 Meses)
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Se muestran los productos comprados en los últimos 12 meses. Las columnas indican: venta del mes en curso, promedio mensual últimos 12 meses, relación entre ambos, precio promedio de compra y fecha de última factura emitida.
        </Typography>
      </Alert>

      <TableContainer className="table-unified" sx={{ boxShadow: 1, borderRadius: 1 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>
                Producto
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Venta Mes Actual
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Promedio 12M
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Relación
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Precio Promedio
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Última Factura
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productos.map((producto, idx) => (
              <TableRow
                key={idx}
                sx={{
                  '&:hover': { backgroundColor: '#f9f9f9' },
                  borderBottom: '1px solid #e0e0e0',
                }}
              >
                {/* Producto */}
                <TableCell sx={{ fontWeight: 500 }}>
                  <Box>
                    <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                      {producto.descripcion || 'Sin descripción'}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#999' }}>
                      SKU: {producto.sku}
                    </Typography>
                  </Box>
                </TableCell>

                {/* Venta Mes Actual */}
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {toNum(producto.venta_mes_actual).toFixed(0)} un.
                </TableCell>

                {/* Promedio 12M */}
                <TableCell align="right">
                  {toNum(producto.venta_promedio_12m).toFixed(1)} un.
                </TableCell>

                {/* Relación */}
                <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                  {toNum(producto.venta_promedio_12m) > 0
                    ? toNum(producto.relacion_venta).toFixed(2)
                    : '-'}
                </TableCell>

                {/* Precio Promedio */}
                <TableCell align="right">
                  {formatCurrency(producto.precio_promedio)}
                </TableCell>

                {/* Última Factura */}
                <TableCell align="center">
                  <Chip
                    label={formatDate(producto.ultima_compra)}
                    size="small"
                    variant="outlined"
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      {/* Resumen */}
      <Alert severity="success" sx={{ mt: 2 }}>
        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
          📌 Total de productos comprados: {productos.length}
        </Typography>
      </Alert>
    </Box>
  );
}

export default ProductosTab;

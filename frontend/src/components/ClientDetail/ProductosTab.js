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
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';

/**
 * ProductosTab
 * Muestra productos comprados en últimos 6 meses
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
    return <Alert severity="info">Sin productos comprados en los últimos 6 meses</Alert>;
  }

  const { productos } = data;

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
    }).format(value || 0);
  };

  const getTrendingIcon = (variacion) => {
    if (variacion > 0) {
      return <TrendingUpIcon sx={{ color: '#4caf50', fontSize: '1.2rem' }} />;
    } else if (variacion < 0) {
      return <TrendingDownIcon sx={{ color: '#f44336', fontSize: '1.2rem' }} />;
    }
    return null;
  };

  const getTrendingColor = (variacion) => {
    if (variacion > 0) return '#4caf50';
    if (variacion < 0) return '#f44336';
    return '#ff9800';
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  return (
    <Box>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold' }}>
        🛍️ Productos (Últimos 6 Meses)
      </Typography>

      <Alert severity="info" sx={{ mb: 2 }}>
        <Typography variant="body2">
          Se muestran los productos comprados en los últimos 6 meses, comparados con el promedio del período anterior (6-12 meses atrás).
        </Typography>
      </Alert>

      <TableContainer sx={{ boxShadow: 1, borderRadius: 1 }}>
        <Table>
          <TableHead sx={{ backgroundColor: '#f5f5f5' }}>
            <TableRow>
              <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>
                Producto
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Cantidad (6m)
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Promedio (anterior)
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Variación
              </TableCell>
              <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                Valor Total
              </TableCell>
              <TableCell align="center" sx={{ fontWeight: 'bold' }}>
                Última Compra
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

                {/* Cantidad (6m) */}
                <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                  {producto.cantidad_total} un.
                </TableCell>

                {/* Promedio anterior */}
                <TableCell align="right">
                  {(producto.cantidad_promedio_anterior || 0).toFixed(0)} un.
                </TableCell>

                {/* Variación */}
                <TableCell
                  align="center"
                  sx={{
                    color: getTrendingColor(producto.variacion_porcentaje || 0),
                    fontWeight: 'bold',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                    {getTrendingIcon(producto.variacion_porcentaje || 0)}
                    <Typography variant="body2">
                      {(producto.variacion_porcentaje || 0) > 0 ? '+' : ''}
                      {(producto.variacion_porcentaje || 0).toFixed(1)}%
                    </Typography>
                  </Box>
                </TableCell>

                {/* Valor Total */}
                <TableCell align="right">
                  {formatCurrency(producto.valor_total)}
                </TableCell>

                {/* Última Compra */}
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
        <Typography variant="caption">
          Valor total de compras en 6 meses: {formatCurrency(
            productos.reduce((sum, p) => sum + (p.valor_total || 0), 0)
          )}
        </Typography>
      </Alert>

      {/* Insight de productos con crecimiento */}
      {productos.some(p => p.variacion_porcentaje > 20) && (
        <Alert severity="info" sx={{ mt: 1 }}>
          <Typography variant="caption">
            ✅ Este cliente aumentó la compra de {productos.filter(p => p.variacion_porcentaje > 20).length} productos respecto al período anterior.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default ProductosTab;

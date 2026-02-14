import React from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Chip,
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import PersonNameIcon from '@mui/icons-material/Badge';

/**
 * ClientHeader
 * Muestra información básica del cliente
 */
function ClientHeader({ cliente }) {
  if (!cliente) return null;

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  return (
    <Card sx={{ p: 3, backgroundColor: '#f5f5f5' }}>
      <Grid container spacing={3} alignItems="center">
        {/* Nombre y RUT */}
        <Grid item xs={12} sm={6}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', mb: 1 }}>
            {cliente.nombre}
          </Typography>
          <Chip
            label={`RUT: ${cliente.rut}`}
            variant="outlined"
            size="small"
          />
        </Grid>

        {/* Vendedor */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PersonNameIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Vendedor Asignado
              </Typography>
              <Typography variant="body2" sx={{ fontWeight: 500 }}>
                {cliente.vendedor_nombre || cliente.vendedor_alias || '-'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Email */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <EmailIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Email
              </Typography>
              <Typography variant="body2">
                {cliente.email || '-'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Teléfono */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <PhoneIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Teléfono
              </Typography>
              <Typography variant="body2">
                {cliente.telefono || '-'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Ubicación */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOnIcon color="primary" />
            <Box>
              <Typography variant="caption" sx={{ color: '#666' }}>
                Ubicación
              </Typography>
              <Typography variant="body2">
                {cliente.ciudad && cliente.comuna
                  ? `${cliente.ciudad}, ${cliente.comuna}`
                  : '-'}
              </Typography>
            </Box>
          </Box>
        </Grid>

        {/* Fecha última actualización */}
        <Grid item xs={12} sm={6}>
          <Box>
            <Typography variant="caption" sx={{ color: '#666' }}>
              Última Actualización
            </Typography>
            <Typography variant="body2">
              {formatDate(cliente.updated_at)}
            </Typography>
          </Box>
        </Grid>

        {/* Cupo y Crédito */}
        <Grid item xs={12}>
          <Card variant="outlined" sx={{ p: 2, mt: 1, backgroundColor: '#fff' }}>
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Cupo Total
                </Typography>
                <Typography variant="h6" sx={{ color: '#1976d2' }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(cliente.cupo || 0)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Cupo Utilizado
                </Typography>
                <Typography variant="h6" sx={{ color: '#d32f2f' }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(cliente.cupo_utilizado || 0)}
                </Typography>
              </Grid>
              <Grid item xs={12} md={4}>
                <Typography variant="caption" sx={{ color: '#666' }}>
                  Cupo Disponible
                </Typography>
                <Typography variant="h6" sx={{ color: (cliente.cupo - cliente.cupo_utilizado) < 0 ? '#d32f2f' : '#2e7d32' }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format((cliente.cupo || 0) - (cliente.cupo_utilizado || 0))}
                </Typography>
              </Grid>
            </Grid>
          </Card>
        </Grid>
      </Grid>
    </Card>
  );
}

export default ClientHeader;

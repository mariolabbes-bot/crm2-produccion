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
import DirectionsIcon from '@mui/icons-material/Directions';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AddTaskIcon from '@mui/icons-material/AddTask';
import ReceiptIcon from '@mui/icons-material/Receipt';
import AssignmentIcon from '@mui/icons-material/Assignment';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import { Button } from '@mui/material';
import * as api from '../../api';

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


  const [visitaActiva, setVisitaActiva] = React.useState(null);
  const [loadingAction, setLoadingAction] = React.useState(false);

  React.useEffect(() => {
    checkActiveVisit();
  }, [cliente.rut]);

  const checkActiveVisit = async () => {
    try {
      const res = await api.getActiveVisit();
      if (res && res.cliente_rut === cliente.rut) {
        setVisitaActiva(res);
      } else {
        setVisitaActiva(null);
      }
    } catch (err) {
      console.error('Error checking active visit:', err);
    }
  };

  const handleAction = async (type) => {
    try {
      setLoadingAction(true);
      if (type === 'CHECK_IN') {
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: { latitude: 0, longitude: 0 } }));
        });
        await api.checkIn(cliente.rut, pos.coords.latitude, pos.coords.longitude);
        await checkActiveVisit();
      } else if (type === 'CHECK_OUT') {
        const resultado = window.prompt('Resultado de la visita (ej: Venta Realizada, Cliente no estaba):');
        if (resultado === null) return;
        const pos = await new Promise((resolve) => {
          navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: { latitude: 0, longitude: 0 } }));
        });
        await api.checkOut(visitaActiva.id, pos.coords.latitude, pos.coords.longitude, resultado, '');
        setVisitaActiva(null);
      } else {
        const note = window.prompt(`Registrar nota para ${type.toLowerCase()}:`);
        if (note === null) return;
        await api.createClientActividad(cliente.rut, note, type);
        alert(`${type} registrado en el historial.`);
      }
    } catch (err) {
      alert(err.response?.data?.msg || 'Error al ejecutar acción');
    } finally {
      setLoadingAction(false);
    }
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

        {/* Acciones Rápidas */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
            <Button
              variant="contained"
              color={visitaActiva ? "secondary" : "primary"}
              startIcon={visitaActiva ? <LogoutIcon /> : <LoginIcon />}
              onClick={() => handleAction(visitaActiva ? 'CHECK_OUT' : 'CHECK_IN')}
              disabled={loadingAction}
              sx={{ borderRadius: '20px', fontWeight: 'bold' }}
            >
              {visitaActiva ? 'CHECK OUT' : 'CHECK IN'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<PhoneIcon />}
              onClick={() => {
                window.location.href = `tel:${cliente.telefono}`;
                handleAction('LLAMADA');
              }}
              sx={{ borderRadius: '20px' }}
            >
              LLAMAR
            </Button>
            <Button
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              onClick={() => {
                window.open(`https://wa.me/${cliente.telefono?.replace(/[^0-9]/g, '')}`, '_blank');
                handleAction('MENSAJE');
              }}
              sx={{ borderRadius: '20px', color: '#25D366', borderColor: '#25D366' }}
            >
              WHATSAPP
            </Button>
            <Button
              variant="outlined"
              startIcon={<ReceiptIcon />}
              onClick={() => handleAction('COTIZACION')}
              sx={{ borderRadius: '20px' }}
            >
              COTIZAR
            </Button>
          </Box>
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
                {cliente.direccion || `${cliente.ciudad}, ${cliente.comuna}`}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DirectionsIcon />}
                  onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${cliente.latitud},${cliente.longitud}`, '_blank')}
                >
                  MAPS
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<DirectionsIcon />}
                  onClick={() => window.open(`https://waze.com/ul?ll=${cliente.latitud},${cliente.longitud}&navigate=yes`, '_blank')}
                >
                  WAZE
                </Button>
              </Box>
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

import React from 'react';
import {
  Box,
  Card,
  Grid,
  Typography,
  Chip,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  TextField,
  MenuItem as MuiMenuItem
} from '@mui/material';
import PersonNameIcon from '@mui/icons-material/Badge';
import EmailIcon from '@mui/icons-material/Email';
import PhoneIcon from '@mui/icons-material/Phone';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import DirectionsIcon from '@mui/icons-material/Directions';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import GpsFixedIcon from '@mui/icons-material/GpsFixed';
import ContactPageIcon from '@mui/icons-material/ContactPage';
import * as api from '../../api';

// Helper: Calcular distancia Haversine en metros
const getDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

function ClientHeader({ cliente, onUpdate }) {
  const [visitaActiva, setVisitaActiva] = React.useState(null);
  const [loadingAction, setLoadingAction] = React.useState(false);
  const [openGPSDialog, setOpenGPSDialog] = React.useState(false);
  const [openCheckOutDialog, setOpenCheckOutDialog] = React.useState(false);
  const [checkOutResultado, setCheckOutResultado] = React.useState('');
  const [pendingCoords, setPendingCoords] = React.useState(null);
  const [snackbar, setSnackbar] = React.useState({ open: false, message: '', severity: 'success' });

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

  const handleUpdateCoordinates = async (coords) => {
    try {
      setLoadingAction(true);
      await api.patchClientCoordinates(cliente.rut, coords.latitude, coords.longitude);
      setSnackbar({ open: true, message: 'Ubicación actualizada correctamente y cliente activado para el mapa.', severity: 'success' });
      if (onUpdate) onUpdate(); // Refrescar datos del padre si existe la función
    } catch (err) {
      setSnackbar({ open: true, message: 'Error al actualizar ubicación', severity: 'error' });
    } finally {
      setLoadingAction(false);
      setOpenGPSDialog(false);
    }
  };

  const handleAction = async (type) => {
    try {
      setLoadingAction(true);
      if (type === 'CHECK_IN') {
        const pos = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject);
        });

        const currentLat = pos.coords.latitude;
        const currentLng = pos.coords.longitude;

        // Validar distancia si el cliente ya tiene coordenadas
        if (cliente.latitud && cliente.longitud) {
          const dist = getDistance(currentLat, currentLng, parseFloat(cliente.latitud), parseFloat(cliente.longitud));
          if (dist > 100) {
            setPendingCoords(pos.coords);
            setOpenGPSDialog(true);
            // No retornamos aquí, el check-in procede, pero abrimos el diálogo paralelo o esperamos?
            // Procede el check-in, pero sugerimos cambio
          }
        } else {
          // Si no tiene coordenadas, sugerimos registro inmediato
          setPendingCoords(pos.coords);
          setOpenGPSDialog(true);
        }

        await api.checkIn(cliente.rut, currentLat, currentLng);
        await checkActiveVisit();
        setSnackbar({ open: true, message: 'Check-in realizado con éxito', severity: 'success' });
      } else if (type === 'CHECK_OUT') {
        setOpenCheckOutDialog(true);
        return; // El envío real se hace desde handleConfirmCheckOut
      } else {
        const note = window.prompt(`Registrar nota para ${type.toLowerCase()}:`);
        if (note === null) return;
        await api.createClientActividad(cliente.rut, note, type);
        setSnackbar({ open: true, message: `${type} registrado en el historial.`, severity: 'info' });
      }
    } catch (err) {
      setSnackbar({ open: true, message: err.response?.data?.msg || 'Error al ejecutar acción', severity: 'error' });
    } finally {
      setLoadingAction(false);
    }
  };

  const handleContactPicker = async () => {
    try {
      if ('contacts' in navigator && 'ContactsManager' in window) {
        const props = ['name', 'tel'];
        const opts = { multiple: false };
        const contacts = await navigator.contacts.select(props, opts);
        if (contacts.length > 0 && contacts[0].tel?.[0]) {
          const newTel = contacts[0].tel[0].replace(/\s/g, '');
          if (window.confirm(`¿Deseas actualizar el teléfono a ${newTel}?`)) {
            await api.updateClient(cliente.id, { ...cliente, telefono: newTel });
            setSnackbar({ open: true, message: 'Teléfono actualizado desde agenda', severity: 'success' });
            if (onUpdate) onUpdate();
          }
        }
      } else {
        alert('Tu navegador no soporta la selección de contactos directamente. Por favor actualiza el teléfono manualmente.');
      }
    } catch (err) {
      console.error('Contact picker error:', err);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('es-CL');
  };

  const hasCoords = cliente.latitud && cliente.longitud;

  return (
    <Card sx={{
      p: 3,
      borderRadius: '16px',
      background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.05)',
      border: '1px solid rgba(0,0,0,0.05)'
    }}>
      <Grid container spacing={3} alignItems="center">
        {/* Nombre y RUT con badge de Terreno */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
            <Typography variant="h4" sx={{ fontWeight: 800, color: '#1a237e', letterSpacing: '-0.5px' }}>
              {cliente.nombre}
            </Typography>
            {cliente.es_terreno && (
              <Chip
                label="EN TERRENO"
                size="small"
                sx={{ bgcolor: '#e8f5e9', color: '#2e7d32', fontWeight: 'bold' }}
              />
            )}
          </Box>
          <Chip
            label={`RUT: ${cliente.rut}`}
            variant="outlined"
            size="small"
            sx={{ fontWeight: 500, borderColor: '#cad1d7' }}
          />
        </Grid>

        {/* Panel de Acciones Premium */}
        <Grid item xs={12} sm={6}>
          <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', justifyContent: { xs: 'center', sm: 'flex-end' } }}>
            <Button
              variant="contained"
              color={visitaActiva ? "secondary" : "primary"}
              startIcon={loadingAction ? <CircularProgress size={20} color="inherit" /> : (visitaActiva ? <LogoutIcon /> : <LoginIcon />)}
              onClick={() => handleAction(visitaActiva ? 'CHECK_OUT' : 'CHECK_IN')}
              disabled={loadingAction}
              sx={{
                borderRadius: '12px',
                fontWeight: 700,
                px: 3,
                py: 1,
                boxShadow: visitaActiva ? '0 4px 14px rgba(156, 39, 176, 0.39)' : '0 4px 14px rgba(25, 118, 210, 0.39)'
              }}
            >
              {visitaActiva ? 'CHECK OUT' : 'CHECK IN'}
            </Button>

            {!hasCoords && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<GpsFixedIcon />}
                onClick={() => {
                  navigator.geolocation.getCurrentPosition((pos) => {
                    setPendingCoords(pos.coords);
                    setOpenGPSDialog(true);
                  });
                }}
                disabled={loadingAction}
                sx={{ borderRadius: '12px', fontWeight: 700 }}
              >
                REGISTRAR UBICACIÓN
              </Button>
            )}

            <Button
              variant="outlined"
              startIcon={<PhoneIcon />}
              onClick={() => {
                window.location.href = `tel:${cliente.telefono}`;
                handleAction('LLAMADA');
              }}
              sx={{ borderRadius: '12px', borderWeight: 2 }}
            >
              LLAMAR
            </Button>

            <Button
              variant="outlined"
              startIcon={<WhatsAppIcon />}
              onClick={() => {
                if (!cliente.telefono) {
                  alert('El cliente no tiene teléfono registrado.');
                  return;
                }
                window.open(`https://wa.me/${cliente.telefono.replace(/[^0-9]/g, '')}`, '_blank');
                handleAction('MENSAJE');
              }}
              sx={{ borderRadius: '12px', color: '#25D366', borderColor: '#25D366', '&:hover': { borderColor: '#128C7E', bgcolor: 'rgba(37, 211, 102, 0.04)' } }}
            >
              WHATSAPP
            </Button>

            <Button
              variant="outlined"
              startIcon={<ContactPageIcon />}
              onClick={handleContactPicker}
              sx={{ borderRadius: '12px' }}
              title="Importar desde Agenda"
            >
              AGENDA
            </Button>
          </Box>
        </Grid>

        {/* Info Cards Row */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            {[
              { label: 'Vendedor', value: cliente.vendedor_nombre || 'No asignado', icon: <PersonNameIcon color="primary" /> },
              { label: 'Email', value: cliente.email || 'Sin correo', icon: <EmailIcon color="primary" /> },
              { label: 'Teléfono', value: cliente.telefono || 'Sin teléfono', icon: <PhoneIcon color="primary" /> },
              { label: 'Dirección', value: cliente.direccion || 'Sin dirección', icon: <LocationOnIcon color="primary" /> },
            ].map((item, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', display: 'flex', gap: 2, alignItems: 'center' }}>
                  <Box sx={{ bgcolor: '#e3f2fd', p: 1, borderRadius: '8px', display: 'flex' }}>
                    {item.icon}
                  </Box>
                  <Box>
                    <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600, display: 'block', mb: 0.5 }}>
                      {item.label}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600, color: '#2d3748' }}>
                      {item.value}
                    </Typography>
                  </Box>
                </Box>
              </Grid>
            ))}
          </Grid>
        </Grid>

        {/* Map Links */}
        <Grid item xs={12} md={6}>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DirectionsIcon />}
              disabled={!hasCoords}
              onClick={() => window.open(`https://www.google.com/maps/dir/?api=1&destination=${cliente.latitud},${cliente.longitud}`, '_blank')}
              sx={{ borderRadius: '8px' }}
            >
              GOOGLE MAPS
            </Button>
            <Button
              size="small"
              variant="outlined"
              startIcon={<DirectionsIcon />}
              disabled={!hasCoords}
              onClick={() => window.open(`https://waze.com/ul?ll=${cliente.latitud},${cliente.longitud}&navigate=yes`, '_blank')}
              sx={{ borderRadius: '8px' }}
            >
              WAZE
            </Button>
          </Box>
        </Grid>

        {/* Stats Summary */}
        <Grid item xs={12}>
          <Grid container spacing={2}>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600 }}>Cupo Total</Typography>
                <Typography variant="h5" sx={{ color: '#1976d2', fontWeight: 800 }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(cliente.cupo || 0)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: '#fff', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600 }}>Cupo Utilizado</Typography>
                <Typography variant="h5" sx={{ color: '#d32f2f', fontWeight: 800 }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(cliente.cupo_utilizado || 0)}
                </Typography>
              </Box>
            </Grid>
            <Grid item xs={12} md={4}>
              <Box sx={{ p: 2, bgcolor: (cliente.cupo - cliente.cupo_utilizado) < 0 ? '#fff5f5' : '#f0fff4', borderRadius: '12px', border: '1px solid #edf2f7', textAlign: 'center' }}>
                <Typography variant="caption" sx={{ color: '#718096', fontWeight: 600 }}>Disponible</Typography>
                <Typography variant="h5" sx={{ color: (cliente.cupo - cliente.cupo_utilizado) < 0 ? '#e53e3e' : '#38a169', fontWeight: 800 }}>
                  {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format((cliente.cupo || 0) - (cliente.cupo_utilizado || 0))}
                </Typography>
              </Box>
            </Grid>
          </Grid>
        </Grid>
      </Grid>

      {/* Check-Out Dialog */}
      <Dialog open={openCheckOutDialog} onClose={() => setOpenCheckOutDialog(false)} PaperProps={{ sx: { borderRadius: '16px', minWidth: 320 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>🏁 Finalizar Visita</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Selecciona o escribe el resultado de la visita a <strong>{cliente.nombre}</strong>.
          </Typography>
          <TextField
            select
            fullWidth
            label="Resultado"
            value={checkOutResultado}
            onChange={e => setCheckOutResultado(e.target.value)}
            size="small"
          >
            {['Venta realizada', 'Cliente no estaba', 'Sin pedido', 'Cobranza realizada', 'Solo visita', 'Otro'].map(opt => (
              <MuiMenuItem key={opt} value={opt}>{opt}</MuiMenuItem>
            ))}
          </TextField>
          <TextField
            fullWidth
            label="Notas adicionales (opcional)"
            multiline
            rows={2}
            placeholder="Ej: Dejé muestra, acordamos llamar la próxima semana..."
            sx={{ mt: 2 }}
            onChange={e => setCheckOutResultado(prev => prev.split('|')[0] + '|' + e.target.value)}
            size="small"
          />
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => { setOpenCheckOutDialog(false); setCheckOutResultado(''); }} color="inherit">Cancelar</Button>
          <Button
            variant="contained"
            color="secondary"
            disabled={!checkOutResultado || loadingAction}
            startIcon={loadingAction ? <CircularProgress size={16} color="inherit" /> : <LogoutIcon />}
            onClick={async () => {
              try {
                setLoadingAction(true);
                const [resultado, notas = ''] = checkOutResultado.split('|');
                const pos = await new Promise(resolve => {
                  navigator.geolocation.getCurrentPosition(resolve, () => resolve({ coords: { latitude: 0, longitude: 0 } }));
                });
                await api.checkOut(visitaActiva.id, pos.coords.latitude, pos.coords.longitude, resultado, notas);
                setVisitaActiva(null);
                setOpenCheckOutDialog(false);
                setCheckOutResultado('');
                setSnackbar({ open: true, message: 'Visita finalizada correctamente', severity: 'success' });
              } catch (err) {
                setSnackbar({ open: true, message: 'Error al finalizar la visita', severity: 'error' });
              } finally {
                setLoadingAction(false);
              }
            }}
          >
            Confirmar y Finalizar
          </Button>
        </DialogActions>
      </Dialog>

      {/* GPS Dialog */}
      <Dialog open={openGPSDialog} onClose={() => setOpenGPSDialog(false)} PaperProps={{ sx: { borderRadius: '16px' } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>📍 ¿Actualizar Ubicación?</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            {!hasCoords
              ? `Este cliente no tiene ubicación registrada. ¿Deseas guardar tu posición actual para que aparezca en el mapa?`
              : `Parece que la ubicación guardada no es exacta (estás a más de 100m). ¿Deseas actualizar la posición del cliente con tu GPS actual?`
            }
          </Typography>
          {pendingCoords && (
            <Box sx={{ mt: 2, p: 1, bgcolor: '#f7fafc', borderRadius: '8px' }}>
              <Typography variant="caption" sx={{ display: 'block' }}>Lat: {pendingCoords.latitude.toFixed(6)}</Typography>
              <Typography variant="caption" sx={{ display: 'block' }}>Lng: {pendingCoords.longitude.toFixed(6)}</Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 3 }}>
          <Button onClick={() => setOpenGPSDialog(false)} color="inherit">Cancelar</Button>
          <Button
            onClick={() => handleUpdateCoordinates(pendingCoords)}
            variant="contained"
            startIcon={<GpsFixedIcon />}
            sx={{ borderRadius: '10px' }}
          >
            Actualizar y Activar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Feedback Snackbars */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={() => setSnackbar({ ...snackbar, open: false })}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={snackbar.severity} variant="filled" sx={{ borderRadius: '12px' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Card>
  );
}

export default ClientHeader;

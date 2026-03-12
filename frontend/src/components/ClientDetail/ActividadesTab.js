import React, { useState } from 'react';
import {
  Box,
  Button,
  CircularProgress,
  Alert,
  TextField,
  Typography,
  Card,
  Avatar,
  Stack,
  Divider,
  Paper,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import MessageIcon from '@mui/icons-material/Message';
import * as api from '../../api';

/**
 * ActividadesTab
 * Muestra block de notas + últimas 3 actividades
 */
function ActividadesTab({ rut, data, loading, error, onActivityAdded }) {
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const formatDateTime = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleString('es-CL', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getActivityIcon = (tipo) => {
    switch (tipo?.toUpperCase()) {
      case 'VISITA': return <DirectionsWalkIcon color="primary" />;
      case 'LLAMADA': return <PhoneIcon sx={{ color: '#2196f3' }} />;
      case 'MENSAJE': return <WhatsAppIcon sx={{ color: '#25D366' }} />;
      case 'COTIZACION': return <ReceiptIcon sx={{ color: '#ff9800' }} />;
      default: return <MessageIcon color="disabled" />;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!comentario.trim()) {
      setSubmitError('El comentario no puede estar vacío');
      return;
    }

    try {
      setSubmitting(true);
      setSubmitError(null);
      setSubmitSuccess(false);

      await api.createClientActividad(rut, comentario, 'MENSAJE');

      setComentario('');
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

      // Notificar al padre para recargar actividades
      if (onActivityAdded) {
        onActivityAdded();
      }
    } catch (err) {
      console.error('Error registrando actividad:', err);
      setSubmitError(err.message || 'Error al registrar la actividad');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      {/* Formulario para agregar actividad */}
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f9f9f9' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
          <EditNoteIcon color="primary" />
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
            Registrar Actividad / Observación
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="Escribe tu observación, nota o actividad aquí..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            variant="outlined"
            sx={{ mb: 2 }}
            disabled={submitting}
          />

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {submitSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Actividad registrada correctamente
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            startIcon={<SendIcon />}
            disabled={submitting || !comentario.trim()}
            sx={{ mt: 1 }}
          >
            {submitting ? 'Guardando...' : 'Registrar Actividad'}
          </Button>
        </form>
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* Historial de actividades */}
      <Typography variant="h6" sx={{ fontWeight: 'bold', mb: 2 }}>
        📋 Últimas Actividades
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : !data || !data.actividades || data.actividades.length === 0 ? (
        <Alert severity="info">
          No hay actividades registradas aún. ¡Sé el primero en registrar una!
        </Alert>
      ) : (
        <Stack spacing={2}>
          {data.actividades.map((actividad, idx) => (
            <Card
              key={idx}
              sx={{
                p: 2,
                borderLeft: `4px solid ${actividad.tipo_actividad === 'VISITA' ? '#4caf50' :
                    actividad.tipo_actividad === 'LLAMADA' ? '#2196f3' :
                      actividad.tipo_actividad === 'MENSAJE' ? '#25D366' :
                        actividad.tipo_actividad === 'COTIZACION' ? '#ff9800' :
                          '#9e9e9e'
                  }`,
                '&:hover': { boxShadow: 2 },
              }}
            >
              {/* Header de la actividad */}
              <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
                <Avatar
                  sx={{
                    width: 40,
                    height: 40,
                    backgroundColor:
                      actividad.nombre_vendedor_oficial?.toUpperCase().includes('MANAGER')
                        ? '#FF6B6B'
                        : '#eceff1',
                    color: '#444'
                  }}
                >
                  {getActivityIcon(actividad.tipo_actividad)}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                      flexWrap: 'wrap'
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {actividad.usuario_nombre || 'Usuario'}
                    </Typography>

                    {actividad.tipo_actividad && (
                      <Chip
                        label={actividad.tipo_actividad}
                        size="small"
                        variant="outlined"
                        sx={{ fontSize: '0.7rem', height: '18px' }}
                      />
                    )}

                    {actividad.nombre_vendedor_oficial?.toUpperCase().includes('MANAGER') && (
                      <Chip
                        label="GERENTE"
                        size="small"
                        sx={{
                          backgroundColor: '#FF6B6B',
                          color: 'white',
                          fontWeight: 'bold',
                          fontSize: '0.7rem',
                          height: '18px'
                        }}
                      />
                    )}
                  </Box>

                  <Typography variant="caption" sx={{ color: '#999' }}>
                    {formatDateTime(actividad.created_at)}
                  </Typography>
                </Box>
              </Box>

              {/* Comentario */}
              <Typography
                variant="body2"
                sx={{
                  mt: 1,
                  lineHeight: 1.6,
                  color: '#333',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  fontWeight: actividad.tipo_actividad === 'VISITA' ? 'medium' : 'normal'
                }}
              >
                {actividad.comentario}
              </Typography>
            </Card>
          ))}
        </Stack>
      )}
      {data && data.total > 10 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Mostrando últimas 10 actividades de {data.total} totales.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default ActividadesTab;

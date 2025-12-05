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

      await api.createClientActividad(rut, comentario);

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
                borderLeft: '4px solid #2196F3',
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
                      actividad.usuario_rol === 'manager'
                        ? '#FF6B6B'
                        : '#4ECDC4',
                  }}
                >
                  {actividad.usuario_nombre?.charAt(0).toUpperCase() || 'U'}
                </Avatar>

                <Box sx={{ flex: 1 }}>
                  <Box
                    sx={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 1,
                      mb: 0.5,
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 'bold' }}>
                      {actividad.usuario_nombre || 'Usuario'}
                    </Typography>
                    {actividad.usuario_rol === 'manager' && (
                      <Typography
                        variant="caption"
                        sx={{
                          backgroundColor: '#FF6B6B',
                          color: 'white',
                          px: 1,
                          borderRadius: 1,
                          fontWeight: 'bold',
                        }}
                      >
                        GERENTE
                      </Typography>
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
                }}
              >
                {actividad.comentario}
              </Typography>
            </Card>
          ))}
        </Stack>
      )}

      {data && data.total && data.total > 3 && (
        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="caption">
            Mostrando últimas 3 actividades de {data.total} totales.
          </Typography>
        </Alert>
      )}
    </Box>
  );
}

export default ActividadesTab;

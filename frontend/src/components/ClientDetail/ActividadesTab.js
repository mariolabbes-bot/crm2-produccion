import React, { useState, useEffect } from 'react';
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
  Chip,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
} from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import EditNoteIcon from '@mui/icons-material/EditNote';
import PhoneIcon from '@mui/icons-material/Phone';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import ReceiptIcon from '@mui/icons-material/Receipt';
import DirectionsWalkIcon from '@mui/icons-material/DirectionsWalk';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import MessageIcon from '@mui/icons-material/Message';
import * as api from '../../api';

/**
 * ActividadesTab
 */
function ActividadesTab({ rut, data, loading, error, onActivityAdded }) {
  const [comentario, setComentario] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  // --- Estado para Planificación Futura ---
  const [programarAccion, setProgramarAccion] = useState(false);
  const [planAccion, setPlanAccion] = useState('');
  const [planObjetivo, setPlanObjetivo] = useState('');
  const [planFecha, setPlanFecha] = useState(new Date().toISOString().split('T')[0]);
  const [planComentario, setPlanComentario] = useState('');

  // Catálogos de tipos
  const [activityTypes, setActivityTypes] = useState([]);
  const [goalTypes, setGoalTypes] = useState([]);

  React.useEffect(() => {
    const fetchTypes = async () => {
      try {
        const [aTypes, gTypes] = await Promise.all([
          api.getActivityTypes(),
          api.getGoalTypes()
        ]);
        setActivityTypes(aTypes || []);
        setGoalTypes(gTypes || []);
      } catch (err) {
        console.error('Error cargando catálogos:', err);
      }
    };
    fetchTypes();
  }, []);

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
    const t = tipo?.toUpperCase();
    if (t?.includes('VISITA')) return <DirectionsWalkIcon color="primary" />;
    if (t?.includes('LLAMADA')) return <PhoneIcon sx={{ color: '#2196f3' }} />;
    if (t?.includes('CONTACTO')) return <WhatsAppIcon sx={{ color: '#25D366' }} />;
    return <MessageIcon color="disabled" />;
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

      // 1. Registrar actividad inmediata (ahora como 'CONTACTO' por defecto)
      await api.createClientActividad(rut, comentario, 'CONTACTO');

      // 2. Programar acción futura si está activo
      if (programarAccion) {
        if (!planAccion || !planObjetivo || !planFecha) {
          throw new Error('Debes completar la acción, el objetivo y la fecha para programar');
        }
        await api.submitVisitPlan([rut], {
          fecha: planFecha,
          activity_type_id: planAccion,
          goal_type_id: planObjetivo,
          comentario_plan: planComentario
        });
      }

      setComentario('');
      setPlanComentario('');
      setProgramarAccion(false);
      setSubmitSuccess(true);
      setTimeout(() => setSubmitSuccess(false), 3000);

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
      <Paper sx={{ p: 3, mb: 3, backgroundColor: '#f9f9f9', borderRadius: 3, border: '1px solid #eee' }}>
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
            rows={2}
            placeholder="Escribe tu observación, nota o actividad aquí..."
            value={comentario}
            onChange={(e) => setComentario(e.target.value)}
            variant="outlined"
            sx={{ mb: 2, bgcolor: 'white' }}
            disabled={submitting}
          />

          {/* Toggle para Programar Acción Futura */}
          <FormControlLabel
            control={
              <Switch
                checked={programarAccion}
                onChange={(e) => setProgramarAccion(e.target.checked)}
                color="primary"
              />
            }
            label={
              <Typography variant="body2" sx={{ fontWeight: 'bold', color: programarAccion ? 'primary.main' : 'text.secondary' }}>
                Programar Próxima Acción (Seguimiento)
              </Typography>
            }
            sx={{ mb: programarAccion ? 1 : 2 }}
          />

          {programarAccion && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: '#ffffff', border: '1px solid #e3f2fd', borderRadius: 2 }}>
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Acción (Tarea)</InputLabel>
                    <Select
                      value={planAccion}
                      label="Acción (Tarea)"
                      onChange={(e) => setPlanAccion(e.target.value)}
                    >
                      {activityTypes.map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <FormControl fullWidth size="small">
                    <InputLabel>Objetivo</InputLabel>
                    <Select
                      value={planObjetivo}
                      label="Objetivo"
                      onChange={(e) => setPlanObjetivo(e.target.value)}
                    >
                      {goalTypes.map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    type="date"
                    fullWidth
                    size="small"
                    label="Fecha Programada"
                    value={planFecha}
                    onChange={(e) => setPlanFecha(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                  />
                </Grid>
                <Grid item xs={12}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Nota específica para la próxima tarea..."
                    label="Comentario de Planificación"
                    value={planComentario}
                    onChange={(e) => setPlanComentario(e.target.value)}
                  />
                </Grid>
              </Grid>
            </Paper>
          )}

          {submitError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {submitError}
            </Alert>
          )}

          {submitSuccess && (
            <Alert severity="success" sx={{ mb: 2 }}>
              ✅ Actividad {programarAccion ? 'y Plan' : ''} registrados correctamente
            </Alert>
          )}

          <Button
            type="submit"
            variant="contained"
            fullWidth={programarAccion}
            startIcon={submitting ? <CircularProgress size={20} color="inherit" /> : <SendIcon />}
            disabled={submitting || !comentario.trim()}
            sx={{ 
                borderRadius: 2,
                py: 1,
                fontWeight: 'bold',
                boxShadow: 'none'
            }}
          >
            {submitting ? 'Guardando...' : programarAccion ? 'Registrar y Programar' : 'Registrar Actividad'}
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
                borderLeft: `4px solid ${actividad.tipo_actividad?.toUpperCase()?.includes('VISITA') ? '#4caf50' :
                    actividad.tipo_actividad?.toUpperCase()?.includes('LLAMADA') ? '#2196f3' :
                    actividad.tipo_actividad?.toUpperCase()?.includes('CONTACTO') ? '#25D366' :
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

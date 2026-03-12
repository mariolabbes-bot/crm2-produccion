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

... (rest logic stays same, let's jump to map section) ...

  {
    data.actividades.map((actividad, idx) => (
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
    ))
  }
        </Stack >
      )
}

{
  data && data.total && data.total > 3 && (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="caption">
        Mostrando últimas 3 actividades de {data.total} totales.
      </Typography>
    </Alert>
  )
}
    </Box >
  );
}

export default ActividadesTab;

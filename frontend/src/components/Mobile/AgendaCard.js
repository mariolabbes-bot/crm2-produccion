import React from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Button, 
  Stack, 
  Chip, 
  IconButton,
  Box
} from '@mui/material';
import {
  LocationOn as LocationIcon,
  PlayArrow as CheckInIcon,
  Stop as CheckOutIcon,
  Person as ClientIcon,
  Directions as MapsIcon,
  ChevronRight as ArrowIcon,
  DeleteOutline as DeleteIcon
} from '@mui/icons-material';
import './AgendaCard.css';

const AgendaCard = ({ 
  visit, 
  onCheckIn, 
  onCheckOut, 
  onViewClient, 
  onDelete,
  isAnyActive 
}) => {
  const {
    id,
    cliente_nombre,
    cliente_direccion,
    estado,
    hora_inicio,
    distancia_checkin,
    accion_nombre,
    objetivo_nombre,
    titulo,
    tipo_evento,
    hora_inicio_plan,
    hora_fin_plan,
    cliente_rut,
    nombres_participantes,
    notas
  } = visit;

  const isPending = estado === 'pendiente';
  const isInProgress = estado === 'en_progreso';
  const isCompleted = estado === 'completada';
  const isManualEvent = tipo_evento && tipo_evento !== 'ruta';

  const getStatusColor = () => {
    if (isCompleted) return 'success';
    if (isInProgress) return 'warning';
    return isManualEvent ? 'info' : 'default';
  };

  const formattedTime = (hora_inicio_plan && hora_fin_plan) 
    ? `${hora_inicio_plan.substring(0,5)} - ${hora_fin_plan.substring(0,5)}` 
    : (hora_inicio_plan ? `Desde ${hora_inicio_plan.substring(0,5)}` : null);

  return (
    <Card className={`agenda-card ${estado} ${tipo_evento}`} elevation={0} sx={{ borderLeft: isManualEvent ? '6px solid #6366f1' : 'none' }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box className="card-header" display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" className="client-name" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {isManualEvent ? titulo : (cliente_nombre || 'Sin nombre')}
            </Typography>
            {isManualEvent ? (
              <Chip 
                label={tipo_evento.toUpperCase()} 
                size="small" 
                variant="outlined" 
                sx={{ mt: 1, height: 20, fontSize: '0.6rem', fontWeight: 700 }} 
              />
            ) : (
              <Typography variant="body2" color="text.secondary" className="client-address" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
                {cliente_direccion}
              </Typography>
            )}
            {formattedTime && (
              <Typography variant="caption" sx={{ display: 'block', mt: 1, fontWeight: 800, color: '#6366f1' }}>
                ⏰ {formattedTime}
              </Typography>
            )}
          </Box>
          <Chip 
            label={estado.toUpperCase()} 
            size="small" 
            color={getStatusColor()} 
            sx={{ fontWeight: 600, fontSize: '0.65rem' }} 
          />
        </Box>

        {!isManualEvent && (accion_nombre || objetivo_nombre) && (
          <Box className="objective-box" sx={{ mt: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
              OBJETIVO
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {accion_nombre} - {objetivo_nombre}
            </Typography>
          </Box>
        )}
        
        {isManualEvent && (nombres_participantes || notas) && (
          <Box className="event-details-box" sx={{ mt: 1.5, p: 1.5, bgcolor: '#f5f7ff', borderRadius: 2, border: '1px solid #e0e7ff' }}>
            {nombres_participantes && (
              <Box sx={{ mb: notas ? 1.5 : 0 }}>
                <Typography variant="caption" color="primary" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                  PARTICIPANTES
                </Typography>
                <Typography variant="body2" color="text.primary" sx={{ fontSize: '0.8rem', lineHeight: 1.4 }}>
                  {nombres_participantes}
                </Typography>
              </Box>
            )}
            {notas && (
              <Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 700, mb: 0.5 }}>
                  OBSERVACIONES
                </Typography>
                <Typography variant="body2" sx={{ fontStyle: 'italic', color: 'text.secondary', fontSize: '0.85rem' }}>
                  "{notas}"
                </Typography>
              </Box>
            )}
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {!isManualEvent && isPending && (
            <Button
              variant="contained"
              startIcon={<CheckInIcon />}
              fullWidth
              onClick={() => onCheckIn(visit)}
              disabled={isAnyActive}
              sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, py: 1 }}
            >
              Check-in
            </Button>
          )}

          {!isManualEvent && isInProgress && (
            <Button
              variant="contained"
              color="warning"
              startIcon={<CheckOutIcon />}
              fullWidth
              onClick={() => onCheckOut(visit)}
              sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, py: 1 }}
            >
              Check-out
            </Button>
          )}

          {isManualEvent && (
             <Button
                variant="contained"
                color="primary"
                fullWidth
                disabled={isCompleted}
                onClick={() => onCheckOut(visit, 'Completado')}
                sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, py: 1 }}
             >
                {isCompleted ? 'Finalizado' : 'Marcar como Listo'}
             </Button>
          )}

          {cliente_rut && (
            <Button
              variant="outlined"
              startIcon={<ClientIcon />}
              onClick={() => onViewClient(cliente_rut)}
              sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, minWidth: 'fit-content' }}
            >
              Ficha
            </Button>
          )}

          {!isManualEvent && (
            <IconButton 
              color="primary" 
              sx={{ border: '1px solid #e2e8f0', p: 1 }}
              onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente_direccion)}`, '_blank')}
            >
              <MapsIcon />
            </IconButton>
          )}
          
          {isPending && (
            <IconButton 
              color="error" 
              sx={{ border: '1px solid #fee2e2', p: 1 }}
              onClick={() => onDelete(id)}
            >
              <DeleteIcon />
            </IconButton>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default AgendaCard;

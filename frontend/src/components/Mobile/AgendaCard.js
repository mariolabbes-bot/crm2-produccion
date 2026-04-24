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
    objetivo_nombre
  } = visit;

  const isPending = estado === 'pendiente';
  const isInProgress = estado === 'en_progreso';
  const isCompleted = estado === 'completada';

  const getStatusColor = () => {
    if (isCompleted) return 'success';
    if (isInProgress) return 'warning';
    return 'default';
  };

  return (
    <Card className={`agenda-card ${estado}`} elevation={0}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box className="card-header" display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box flex={1}>
            <Typography variant="h6" className="client-name" sx={{ fontWeight: 700, fontSize: '1rem', lineHeight: 1.2 }}>
              {cliente_nombre}
            </Typography>
            <Typography variant="body2" color="text.secondary" className="client-address" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
              <LocationIcon sx={{ fontSize: 16, mr: 0.5 }} />
              {cliente_direccion}
            </Typography>
          </Box>
          <Chip 
            label={estado.toUpperCase()} 
            size="small" 
            color={getStatusColor()} 
            sx={{ fontWeight: 600, fontSize: '0.65rem' }} 
          />
        </Box>

        {(accion_nombre || objetivo_nombre) && (
          <Box className="objective-box" sx={{ mt: 1.5, p: 1, bgcolor: '#f8fafc', borderRadius: 2 }}>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontWeight: 600 }}>
              OBJETIVO
            </Typography>
            <Typography variant="body2" sx={{ fontWeight: 500 }}>
              {accion_nombre} - {objetivo_nombre}
            </Typography>
          </Box>
        )}

        <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
          {isPending && (
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

          {isInProgress && (
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

          <Button
            variant="outlined"
            startIcon={<ClientIcon />}
            onClick={() => onViewClient(visit.cliente_rut)}
            sx={{ borderRadius: 12, textTransform: 'none', fontWeight: 600, minWidth: 'fit-content' }}
          >
            Ficha
          </Button>

          <IconButton 
            color="primary" 
            sx={{ border: '1px solid #e2e8f0', p: 1 }}
            onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(cliente_direccion)}`, '_blank')}
          >
            <MapsIcon />
          </IconButton>
          
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

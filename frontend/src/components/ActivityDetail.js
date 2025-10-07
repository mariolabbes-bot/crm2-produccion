import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { getActivity, closeActivity, updateGoal } from '../api';
import { 
  Container, Typography, Box, Button, Paper, Grid, Chip, TextField, Divider, List, ListItem, ListItemText, Select, MenuItem, FormControl, InputLabel
} from '@mui/material';

const ActivityDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [activity, setActivity] = useState(null);
  const [error, setError] = useState('');
  const [closureNotes, setClosureNotes] = useState({ resultado_objetivos: '', tareas_seguimiento: '' });

  const fetchActivity = () => {
    getActivity(id)
      .then(setActivity)
      .catch(err => setError(err.message));
  };

  useEffect(() => {
    fetchActivity();
  }, [id]);

  const handleCloseActivity = async (e) => {
    e.preventDefault();
    try {
      await closeActivity(id, closureNotes);
      navigate('/activities');
    } catch (err) {
      setError(err.message);
    }
  };

  const handleGoalStatusChange = async (goalId, newStatus) => {
    try {
      // Find the goal to get its description
      const goal = activity.goals.find(g => g.id === goalId);
      if (goal) {
        await updateGoal(goalId, { ...goal, estado: newStatus });
        fetchActivity(); // Refetch to show updated status
      }
    } catch (err) {
      setError(err.message);
    }
  };

  if (error) return <Typography color="error">{error}</Typography>;
  if (!activity) return <Typography>Loading...</Typography>;

  const isOpen = activity.estado === 'abierto';

  return (
    <Container maxWidth="md">
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Detalle de la Actividad
        </Typography>

        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} sm={6}><Typography><b>Cliente:</b> {activity.client_name || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Tipo:</b> {activity.activity_type_name || 'N/A'}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Fecha:</b> {new Date(activity.fecha).toLocaleString()}</Typography></Grid>
          <Grid item xs={12} sm={6}><Typography><b>Vendedor:</b> {activity.user_name || 'N/A'}</Typography></Grid>
          <Grid item xs={12}><Typography><b>Estado:</b> <Chip label={activity.estado} color={isOpen ? 'primary' : 'success'} /></Typography></Grid>
          <Grid item xs={12}><Typography><b>Notas iniciales:</b> {activity.notas || '-'}</Typography></Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h5" gutterBottom>Objetivos</Typography>
        <List>
          {activity.goals && activity.goals.map(goal => (
            <ListItem key={goal.id} divider>
              <ListItemText primary={goal.descripcion} secondary={`Tipo: ${goal.goal_type_id}`} />
              {isOpen ? (
                <FormControl size="small" sx={{ minWidth: 120 }}>
                  <InputLabel>Estado</InputLabel>
                  <Select 
                    value={goal.estado}
                    onChange={(e) => handleGoalStatusChange(goal.id, e.target.value)}
                  >
                    <MenuItem value="pendiente">Pendiente</MenuItem>
                    <MenuItem value="cumplido">Cumplido</MenuItem>
                    <MenuItem value="no cumplido">No Cumplido</MenuItem>
                  </Select>
                </FormControl>
              ) : (
                <Chip label={goal.estado} size="small" />
              )}
            </ListItem>
          ))}
        </List>

        {!isOpen && (
          <Box sx={{ mt: 3 }}>
            <Typography variant="h6">Resultados del Cierre</Typography>
            <Typography><b>Resultado de Objetivos:</b> {activity.resultado_objetivos || '-'}</Typography>
            <Typography><b>Tareas de Seguimiento:</b> {activity.tareas_seguimiento || '-'}</Typography>
            {activity.siguiente_actividad_id && 
              <Typography><b>Siguiente Actividad:</b> <Link to={`/activities/${activity.siguiente_actividad_id}`}>Ver actividad</Link></Typography>}
          </Box>
        )}

        {isOpen && (
          <Box component="form" onSubmit={handleCloseActivity} sx={{ mt: 4 }}>
            <Divider sx={{ my: 3 }} />
            <Typography variant="h5" gutterBottom>Cerrar Actividad</Typography>
            <TextField
              label="Resultado de los Objetivos"
              multiline
              rows={3}
              fullWidth
              value={closureNotes.resultado_objetivos}
              onChange={(e) => setClosureNotes({ ...closureNotes, resultado_objetivos: e.target.value })}
              sx={{ mb: 2 }}
            />
            <TextField
              label="Tareas de Seguimiento"
              multiline
              rows={3}
              fullWidth
              value={closureNotes.tareas_seguimiento}
              onChange={(e) => setClosureNotes({ ...closureNotes, tareas_seguimiento: e.target.value })}
              sx={{ mb: 2 }}
            />
            <Button type="submit" variant="contained" color="primary">Confirmar Cierre</Button>
          </Box>
        )}

        <Button onClick={() => navigate('/activities')} sx={{ mt: 3 }}>Volver a la lista</Button>

      </Paper>
    </Container>
  );
};

export default ActivityDetail;
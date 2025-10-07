import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { getActivity, createActivity, updateActivity, getClients, getActivityTypes, getGoalTypes } from '../api';
import { 
  Container, Typography, Box, Button, TextField, Paper, Grid, Select, MenuItem, InputLabel, FormControl 
} from '@mui/material';

const ActivityEditor = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEditMode = Boolean(id);

  const [activity, setActivity] = useState({ cliente_id: '', activity_type_id: '', fecha: '', notas: '' });
  const [goals, setGoals] = useState([]);
  const [clients, setClients] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [goalTypes, setGoalTypes] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    // Fetch data for dropdowns
    getClients().then(setClients).catch(err => setError(err.message));
    getActivityTypes().then(setActivityTypes).catch(err => setError(err.message));
    getGoalTypes().then(setGoalTypes).catch(err => setError(err.message));

    if (isEditMode) {
      getActivity(id)
        .then(data => {
          setActivity({
            cliente_id: data.cliente_id,
            activity_type_id: data.activity_type_id,
            fecha: new Date(data.fecha).toISOString().slice(0, 16), // Format for datetime-local input
            notas: data.notas
          });
          setGoals(data.goals || []);
        })
        .catch(err => setError(err.message));
    }
  }, [id, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setActivity(prev => ({ ...prev, [name]: value }));
  };

  const handleGoalChange = (index, field, value) => {
    const newGoals = [...goals];
    newGoals[index][field] = value;
    setGoals(newGoals);
  };

  const addGoal = () => {
    setGoals([...goals, { goal_type_id: '', descripcion: '' }]);
  };

  const removeGoal = (index) => {
    const newGoals = goals.filter((_, i) => i !== index);
    setGoals(newGoals);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const activityData = { ...activity, goals };
      if (isEditMode) {
        await updateActivity(id, activityData);
      } else {
        await createActivity(activityData);
      }
      navigate('/activities');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="md">
      <Paper sx={{ mt: 4, p: 3 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          {isEditMode ? 'Editar Actividad' : 'Nueva Actividad'}
        </Typography>
        
        {error && <Typography color="error" sx={{ mb: 2 }}>{error}</Typography>}

        <Box component="form" onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Cliente</InputLabel>
                <Select name="cliente_id" value={activity.cliente_id} onChange={handleChange}>
                  {clients.map(c => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Actividad</InputLabel>
                <Select name="activity_type_id" value={activity.activity_type_id} onChange={handleChange}>
                  {activityTypes.map(at => <MenuItem key={at.id} value={at.id}>{at.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                name="fecha"
                label="Fecha y Hora"
                type="datetime-local"
                value={activity.fecha}
                onChange={handleChange}
                fullWidth
                required
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                name="notas"
                label="Notas / Comentarios iniciales"
                multiline
                rows={4}
                value={activity.notas}
                onChange={handleChange}
                fullWidth
              />
            </Grid>

            {/* Goal Management */}
            <Grid item xs={12}>
              <Typography variant="h6">Objetivos de la Actividad</Typography>
              {goals.map((goal, index) => (
                <Paper key={index} sx={{ p: 2, mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                  <FormControl sx={{ flex: 1 }}>
                    <InputLabel>Tipo de Objetivo</InputLabel>
                    <Select 
                      value={goal.goal_type_id} 
                      onChange={(e) => handleGoalChange(index, 'goal_type_id', e.target.value)}
                    >
                      {goalTypes.map(gt => <MenuItem key={gt.id} value={gt.id}>{gt.nombre}</MenuItem>)}
                    </Select>
                  </FormControl>
                  <TextField
                    label="Descripción del Objetivo"
                    value={goal.descripcion}
                    onChange={(e) => handleGoalChange(index, 'descripcion', e.target.value)}
                    sx={{ flex: 2 }}
                  />
                  <Button onClick={() => removeGoal(index)} color="error">Quitar</Button>
                </Paper>
              ))}
              <Button onClick={addGoal} sx={{ mt: 2 }}>Añadir Objetivo</Button>
            </Grid>

            <Grid item xs={12} sx={{ mt: 3 }}>
              <Button type="submit" variant="contained" color="primary">
                {isEditMode ? 'Guardar Cambios' : 'Crear Actividad'}
              </Button>
              <Button onClick={() => navigate('/activities')} sx={{ ml: 2 }}>
                Cancelar
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Paper>
    </Container>
  );
};

export default ActivityEditor;
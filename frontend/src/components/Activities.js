import React, { useState, useEffect } from 'react';
import { 
  getActivities, 
  getActivityTypes, 
  getGoalTypes,
  getClients,
  addVisit,
  addActivity,
  addGoal,
  deleteActivity
} from '../api';
import { 
  Container, Typography, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton, Grid, Alert
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';

const Activities = () => {
  // Data for dropdowns
  const [clients, setClients] = useState([]);
  const [activityTypes, setActivityTypes] = useState([]);
  const [goalTypes, setGoalTypes] = useState([]);
  
  // List of past activities
  const [activities, setActivities] = useState([]);

  // Form state
  const [formState, setFormState] = useState({
    cliente_id: '',
    activity_type_id: '',
    activity_description: '',
    goal_type_id: '',
    goal_description: '',
    goal_status: 'Pendiente'
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      const [clientsData, activityTypesData, goalTypesData, activitiesData] = await Promise.all([
        getClients(),
        getActivityTypes(),
        getGoalTypes(),
        getActivities()
      ]);
      setClients(clientsData);
      setActivityTypes(activityTypesData);
      setGoalTypes(goalTypesData);
      setActivities(activitiesData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormState(prevState => ({ ...prevState, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formState.cliente_id || !formState.activity_type_id) {
      setError('Cliente y Tipo de Actividad son requeridos.');
      return;
    }

    try {
      // 1. Create the "Visit" or "Interaction" container
      const visit = await addVisit({ 
        cliente_id: formState.cliente_id, 
        fecha: new Date().toISOString(),
        notas: formState.activity_description // Use description as visit notes
      });

      // 2. Create the Activity linked to the new visit
      await addActivity({
        visita_id: visit.id,
        activity_type_id: formState.activity_type_id,
        descripcion: formState.activity_description
      });

      // 3. Optionally, create the Goal linked to the client
      if (formState.goal_type_id) {
        await addGoal({
          cliente_id: formState.cliente_id,
          goal_type_id: formState.goal_type_id,
          descripcion: formState.goal_description,
          estado: formState.goal_status
        });
      }

      setSuccess('Interacción registrada con éxito!');
      // Reset form
      setFormState({ cliente_id: '', activity_type_id: '', activity_description: '', goal_type_id: '', goal_description: '', goal_status: 'Pendiente' });
      // Refresh activity list
      const activitiesData = await getActivities();
      setActivities(activitiesData);

    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleDelete = async (id) => {
    try {
      // Note: This only deletes the activity, not the parent visit or associated goal.
      // This might be desired, or we might need a more complex delete logic later.
      await deleteActivity(id);
      fetchInitialData(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Registrar Interacción con Cliente
        </Typography>

  <Paper className="card-unified" component="form" onSubmit={handleSubmit} sx={{ mb: 4, p: 3 }}>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
          
          <Grid container spacing={2}>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Cliente</InputLabel>
                <Select name="cliente_id" value={formState.cliente_id} label="Cliente" onChange={handleInputChange}>
                  {clients.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth required>
                <InputLabel>Tipo de Actividad</InputLabel>
                <Select name="activity_type_id" value={formState.activity_type_id} label="Tipo de Actividad" onChange={handleInputChange}>
                  {activityTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <TextField fullWidth label="Descripción de la Actividad" name="activity_description" value={formState.activity_description} onChange={handleInputChange} multiline rows={3} />
            </Grid>
            <Grid item xs={12}><Typography variant="h6" sx={{ color: 'grey.700' }}>Objetivo Propuesto (Opcional)</Typography></Grid>
            <Grid item xs={12} sm={6}>
              <FormControl fullWidth>
                <InputLabel>Tipo de Objetivo</InputLabel>
                <Select name="goal_type_id" value={formState.goal_type_id} label="Tipo de Objetivo" onChange={handleInputChange}>
                   <MenuItem value=""><em>Ninguno</em></MenuItem>
                  {goalTypes.map((t) => <MenuItem key={t.id} value={t.id}>{t.nombre}</MenuItem>)}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={6}>
               <TextField fullWidth label="Descripción del Objetivo" name="goal_description" value={formState.goal_description} onChange={handleInputChange} />
            </Grid>
          </Grid>
          <Button type="submit" variant="contained" sx={{ mt: 3 }}>Guardar Interacción</Button>
        </Paper>

        <Typography variant="h5" component="h2" gutterBottom>Actividades Recientes</Typography>
  <TableContainer component={Paper} className="table-unified">
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Tipo Actividad</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {activities.map((activity) => (
                <TableRow key={activity.id}>
                  <TableCell>{activity.client_name}</TableCell>
                  <TableCell>{new Date(activity.visit_date).toLocaleDateString()}</TableCell>
                  <TableCell>{activity.type_name}</TableCell>
                  <TableCell>{activity.descripcion}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleDelete(activity.id)} color="error" title="Eliminar actividad">
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </Box>
    </Container>
  );
};

export default Activities;
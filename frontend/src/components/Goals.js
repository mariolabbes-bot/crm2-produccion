import React, { useState, useEffect } from 'react';
import { 
  getGoals, 
  getGoalTypes, 
  getClients, // Goals are linked to clients
  addGoal,
  deleteGoal,
  updateGoal
} from '../api';
import { 
  Container, Typography, Box, Button, TextField, Select, MenuItem, FormControl, InputLabel,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, IconButton
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit'; // To edit state

const Goals = () => {
  const [goals, setGoals] = useState([]);
  const [goalTypes, setGoalTypes] = useState([]);
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');

  // Form state
  const [newGoal, setNewGoal] = useState({
    cliente_id: '',
    goal_type_id: '',
    descripcion: '',
    estado: 'Pendiente' // Default state
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [goalsData, typesData, clientsData] = await Promise.all([
        getGoals(),
        getGoalTypes(),
        getClients()
      ]);
      setGoals(goalsData);
      setGoalTypes(typesData);
      setClients(clientsData);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewGoal(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!newGoal.cliente_id || !newGoal.goal_type_id) {
      setError('Por favor, seleccione cliente y tipo de objetivo.');
      return;
    }
    try {
      await addGoal(newGoal);
      setNewGoal({ cliente_id: '', goal_type_id: '', descripcion: '', estado: 'Pendiente' }); // Reset form
      fetchData(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteGoal(id);
      fetchData(); // Refresh list
    } catch (err) {
      setError(err.message);
    }
  };
  
  const handleUpdateState = async (id, currentState) => {
    const newStatus = currentState === 'Pendiente' ? 'Completado' : 'Pendiente';
    try {
        await updateGoal(id, { estado: newStatus });
        fetchData();
    } catch (err) {
        setError(err.message);
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Gestión de Objetivos
        </Typography>

        {/* Form to Add New Goal */}
        <Box component="form" onSubmit={handleSubmit} sx={{ mb: 4, p: 2, border: '1px solid grey', borderRadius: 1 }}>
          <Typography variant="h6">Añadir Nuevo Objetivo</Typography>
          {error && <Typography color="error">{error}</Typography>}
          <FormControl fullWidth margin="normal">
            <InputLabel id="client-select-label">Cliente</InputLabel>
            <Select
              labelId="client-select-label"
              id="cliente_id"
              name="cliente_id"
              value={newGoal.cliente_id}
              label="Cliente"
              onChange={handleInputChange}
            >
              {clients.map((client) => (
                <MenuItem key={client.id} value={client.id}>{client.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="normal">
            <InputLabel id="type-select-label">Tipo de Objetivo</InputLabel>
            <Select
              labelId="type-select-label"
              id="goal_type_id"
              name="goal_type_id"
              value={newGoal.goal_type_id}
              label="Tipo de Objetivo"
              onChange={handleInputChange}
            >
              {goalTypes.map((type) => (
                <MenuItem key={type.id} value={type.id}>{type.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            margin="normal"
            id="descripcion"
            name="descripcion"
            label="Descripción Adicional"
            value={newGoal.descripcion}
            onChange={handleInputChange}
            multiline
            rows={2}
          />
           <FormControl fullWidth margin="normal">
            <InputLabel id="status-select-label">Estado</InputLabel>
            <Select
              labelId="status-select-label"
              id="estado"
              name="estado"
              value={newGoal.estado}
              label="Estado"
              onChange={handleInputChange}
            >
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="Completado">Completado</MenuItem>
              <MenuItem value="Cancelado">Cancelado</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" sx={{ mt: 2 }}>
            Guardar Objetivo
          </Button>
        </Box>

        {/* Table of Existing Goals */}
        <Typography variant="h6">Objetivos Registrados</Typography>
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Cliente</TableCell>
                <TableCell>Tipo Objetivo</TableCell>
                <TableCell>Descripción</TableCell>
                <TableCell>Vendedor</TableCell>
                <TableCell>Estado</TableCell>
                <TableCell>Acciones</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {goals.map((goal) => (
                <TableRow key={goal.id}>
                  <TableCell>{goal.client_name}</TableCell>
                  <TableCell>{goal.type_name}</TableCell>
                  <TableCell>{goal.descripcion}</TableCell>
                  <TableCell>{goal.user_name}</TableCell>
                  <TableCell>{goal.estado}</TableCell>
                  <TableCell>
                    <IconButton onClick={() => handleUpdateState(goal.id, goal.estado)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton onClick={() => handleDelete(goal.id)} color="error">
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

export default Goals;

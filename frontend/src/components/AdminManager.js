import React, { useState, useEffect } from 'react';
import { 
  getActivityTypes, addActivityType, updateActivityType, deleteActivityType,
  getGoalTypes, addGoalType, updateGoalType, deleteGoalType
} from '../api';
import { 
  Container, Typography, Box, Button, TextField, List, ListItem, ListItemText, IconButton, Paper, Grid
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';

import SalesUploader from './SalesUploader';
import SalesJsonImporter from './SalesJsonImporter';

// A generic component for managing a type (either activity or goal)
const TypeManager = ({ title, getTypes, addType, updateType, deleteType }) => {
  const [types, setTypes] = useState([]);
  const [error, setError] = useState('');
  const [newTypeName, setNewTypeName] = useState('');
  const [editState, setEditState] = useState({ id: null, name: '' });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getTypes();
      setTypes(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    try {
      await addType({ nombre: newTypeName });
      setNewTypeName('');
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteType(id);
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdate = async (id) => {
    try {
      await updateType(id, { nombre: editState.name });
      setEditState({ id: null, name: '' });
      fetchData();
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6">{title}</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label={`Nuevo tipo de ${title.toLowerCase().slice(0, -1)}`}
          value={newTypeName}
          onChange={(e) => setNewTypeName(e.target.value)}
          required
          fullWidth
        />
        <Button type="submit" variant="contained">Añadir</Button>
      </Box>
      <List>
        {types.map((type) => (
          <ListItem key={type.id} divider>
            {editState.id === type.id ? (
              <TextField
                size="small"
                value={editState.name}
                onChange={(e) => setEditState({ ...editState, name: e.target.value })}
                fullWidth
              />
            ) : (
              <ListItemText primary={type.nombre} />
            )}
            
            {editState.id === type.id ? (
              <IconButton onClick={() => handleUpdate(type.id)} color="primary">
                <SaveIcon />
              </IconButton>
            ) : (
              <IconButton onClick={() => setEditState({ id: type.id, name: type.nombre })} color="default">
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={() => handleDelete(type.id)} color="error">
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
    </Paper>
  );
};


const AdminManager = () => {
  return (
    <Container maxWidth="md">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Mantenedor de Parámetros
        </Typography>
        <Grid container spacing={4}>
          <Grid item xs={12} md={6}>
            <TypeManager
              title="Tipos de Actividad"
              getTypes={getActivityTypes}
              addType={addActivityType}
              updateType={updateActivityType}
              deleteType={deleteActivityType}
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TypeManager
              title="Tipos de Objetivo"
              getTypes={getGoalTypes}
              addType={addGoalType}
              updateType={updateGoalType}
              deleteType={deleteGoalType}
            />
          </Grid>
          <Grid item xs={12}>
            <Paper sx={{ p: 2, mb: 3 }}>
              <SalesUploader />
              <SalesJsonImporter />
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Container>
  );
};

export default AdminManager;

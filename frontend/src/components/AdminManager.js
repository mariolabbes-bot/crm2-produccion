import React, { useState, useEffect } from 'react';
import {
  getActivityTypes, addActivityType, updateActivityType, deleteActivityType,
  getGoalTypes, addGoalType, updateGoalType, deleteGoalType,
  resetDatabase
} from '../api';
import {
  Container, Typography, Box, Button, TextField, List, ListItem, ListItemText, IconButton, Paper, Grid, Tabs, Tab
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import SaveIcon from '@mui/icons-material/Save';


import DataManagement from './admin/DataManagement';
import UniversalImporter from './admin/UniversalImporter';

// ... (TypeManager component remains same)

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
    <Paper className="card-unified" sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6">{title}</Typography>
      {error && <Typography color="error">{error}</Typography>}
      <Box component="form" onSubmit={handleAdd} sx={{ display: 'flex', gap: 1, mb: 2 }}>
        <TextField
          size="small"
          label={`Nuevo tipo de ${title.toLowerCase().slice(0, -1)} `}
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
  const [tabIndex, setTabIndex] = useState(0);

  const handleTabChange = (event, newValue) => {
    setTabIndex(newValue);
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom sx={{ mb: 4 }}>
          Panel de Administración
        </Typography>

        <Paper sx={{ mb: 3 }}>
          <Tabs
            value={tabIndex}
            onChange={handleTabChange}
            variant="fullWidth"
            indicatorColor="primary"
            textColor="primary"
          >
            <Tab label="Dashboard & Carga" />
            <Tab label="Gestión de Datos (Limpieza)" />
            <Tab label="Configuración" />
            <Tab label="Zona de Peligro" sx={{ color: 'error.main' }} />
          </Tabs>
        </Paper>

        {/* TAB 0: DASHBOARD & CARGA */}
        <Box role="tabpanel" hidden={tabIndex !== 0}>
          {tabIndex === 0 && (
            <Grid container spacing={3}>
              <Grid item xs={12}>
                <UniversalImporter />
              </Grid>
              {/* Add more dashboard widgets here later if needed */}
            </Grid>
          )}
        </Box>

        {/* TAB 1: GESTIÓN DE DATOS */}
        <Box role="tabpanel" hidden={tabIndex !== 1}>
          {tabIndex === 1 && (
            <DataManagement />
          )}
        </Box>

        {/* TAB 2: CONFIGURACIÓN (Tipos) */}
        <Box role="tabpanel" hidden={tabIndex !== 2}>
          {tabIndex === 2 && (
            <Grid container spacing={3}>
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
            </Grid>
          )}
        </Box>

        {/* TAB 3: ZONA DE PELIGRO */}
        <Box role="tabpanel" hidden={tabIndex !== 3}>
          {tabIndex === 3 && (
            <Paper className="card-unified" sx={{ p: 3, border: '2px solid #ef5350', bgcolor: '#ffebee' }}>
              <Typography variant="h5" color="error" gutterBottom sx={{ display: 'flex', alignItems: 'center' }}>
                ⚠️ Zona de Peligro
              </Typography>
              <Typography variant="body1" paragraph>
                Esta acción eliminará permanentemente todos los datos de <strong>Clientes, Ventas, Abonos, Saldo Crédito y Productos</strong>.
                Los usuarios (vendedores) y la configuración de tipos se mantendrán.
              </Typography>
              <Button
                variant="contained"
                color="error"
                size="large"
                onClick={async () => {
                  const confirm = prompt("⚠️ ESTA ACCIÓN ES IRREVERSIBLE ⚠️\n\nPara confirmar el borrado TOTAL de la base de datos, escribe: CONFIRMO_BORRAR_TODO");
                  if (confirm === 'CONFIRMO_BORRAR_TODO') {
                    try {
                      await resetDatabase(confirm);
                      alert("✅ Base de datos reiniciada correctamente.");
                      window.location.reload();
                    } catch (err) {
                      alert("❌ Error: " + err.message);
                    }
                  } else if (confirm) {
                    alert("❌ Código de confirmación incorrecto.");
                  }
                }}
              >
                🗑️ BORRAR BASE DE DATOS (RESET COMPLETO)
              </Button>
            </Paper>
          )}
        </Box>

      </Box>
    </Container >
  );
};

export default AdminManager;

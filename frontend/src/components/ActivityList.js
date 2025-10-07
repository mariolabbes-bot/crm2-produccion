import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { getActivities } from '../api';
import { 
  Container, Typography, Box, Button, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Chip 
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';

const ActivityList = () => {
  const [activities, setActivities] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const data = await getActivities();
      setActivities(data);
    } catch (err) {
      setError(err.message);
    }
  };

  const getStatusChipColor = (status) => {
    switch (status) {
      case 'abierto':
        return 'primary';
      case 'cerrado':
        return 'success';
      default:
        return 'default';
    }
  };

  return (
    <Container maxWidth="lg">
      <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">
          Actividades
        </Typography>
        <Button 
          variant="contained"
          component={Link} 
          to="/activities/new"
          startIcon={<AddIcon />}
        >
          Nueva Actividad
        </Button>
      </Box>
      
      {error && <Typography color="error" sx={{ mt: 2 }}>{error}</Typography>}

      <TableContainer component={Paper} sx={{ mt: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Tipo</TableCell>
              <TableCell>Cliente</TableCell>
              <TableCell>Vendedor</TableCell>
              <TableCell>Estado</TableCell>
              <TableCell>Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {activities.map((activity) => (
              <TableRow key={activity.id}>
                <TableCell>{new Date(activity.fecha).toLocaleString()}</TableCell>
                <TableCell>{activity.activity_type_name}</TableCell>
                <TableCell>{activity.client_name}</TableCell>
                <TableCell>{activity.user_name}</TableCell>
                <TableCell>
                  <Chip label={activity.estado} color={getStatusChipColor(activity.estado)} size="small" />
                </TableCell>
                <TableCell>
                  <Button component={Link} to={`/activities/${activity.id}`} size="small">
                    Ver Detalles
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </Container>
  );
};

export default ActivityList;

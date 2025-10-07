import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { getActivities, getOverdueActivities, getTopClients, getSalesSummary } from '../api';
import { 
  Container, Typography, Box, Grid, Paper, Card, CardContent, List, ListItem, ListItemText, Divider, Button 
} from '@mui/material';

const localizer = momentLocalizer(moment);

const Dashboard = () => {
  const [events, setEvents] = useState([]);
  const [overdueActivities, setOverdueActivities] = useState([]);
  const [topClients, setTopClients] = useState([]);
  const [salesSummary, setSalesSummary] = useState({ total_sales: 0 });
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [activities, overdue, clients, summary] = await Promise.all([
        getActivities(),
        getOverdueActivities(),
        getTopClients(),
        getSalesSummary()
      ]);

      const calendarEvents = activities.map(activity => ({
        id: activity.id,
        title: `${activity.activity_type_name} - ${activity.client_name}`,
        start: new Date(activity.fecha),
        end: moment(activity.fecha).add(1, 'hours').toDate(),
        resource: activity,
      }));
      
      setEvents(calendarEvents);
      setOverdueActivities(overdue);
      setTopClients(clients);
      setSalesSummary(summary);

    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Container maxWidth="xl">
      <Box sx={{ mt: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          Dashboard
        </Typography>
        
        {error && <Typography color="error">{error}</Typography>}

        {/* KPI Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Ventas (Últimos 3 meses)</Typography>
                <Typography variant="h5">${new Intl.NumberFormat('es-CL').format(salesSummary.total_sales || 0)}</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Actividades Completadas (Mes)</Typography>
                <Typography variant="h5">--</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Typography color="textSecondary" gutterBottom>Tasa de Cumplimiento</Typography>
                <Typography variant="h5">--%</Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>Top 5 Clientes</Typography>
              <List dense>
                {topClients.map(client => (
                  <ListItem key={client.nombre} disableGutters>
                    <ListItemText primary={client.nombre} secondary={`$${new Intl.NumberFormat('es-CL').format(client.total_sales)}`} />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

        <Grid container spacing={4}>
          {/* Calendar */}
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 2, height: '70vh' }}>
              <Calendar
                localizer={localizer}
                events={events}
                startAccessor="start"
                endAccessor="end"
                style={{ height: '100%' }}
                views={['month', 'week', 'day']}
                defaultView="week"
                messages={{
                    next: "Siguiente",
                    previous: "Anterior",
                    today: "Hoy",
                    month: "Mes",
                    week: "Semana",
                    day: "Día"
                }}
              />
            </Paper>
          </Grid>

          {/* Overdue Activities */}
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 2, height: '70vh', overflowY: 'auto' }}>
              <Typography variant="h6" gutterBottom>Actividades Vencidas</Typography>
              <List>
                {overdueActivities.map(activity => (
                  <React.Fragment key={activity.id}>
                    <ListItem alignItems="flex-start">
                      <ListItemText
                        primary={`${activity.activity_type_name} con ${activity.client_name}`}
                        secondary={`Venció: ${new Date(activity.fecha).toLocaleDateString()}`}
                      />
                      <Button component={Link} to={`/activities/${activity.id}`} size="small">Ver</Button>
                    </ListItem>
                    <Divider variant="inset" component="li" />
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
        </Grid>

      </Box>
    </Container>
  );
};

export default Dashboard;
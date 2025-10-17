import React, { useState, useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, Link as RouterLink } from 'react-router-dom';
import { getClients, addClient, bulkAddClients, getVendedores } from './api';
import { getToken, removeToken, getUser } from './utils/auth';
import Login from './components/Login';
import Register from './components/Register';
import ActivityList from './components/ActivityList';
import ActivityDetail from './components/ActivityDetail';
import ActivityEditor from './components/ActivityEditor';
import Goals from './components/Goals';
import AdminManager from './components/AdminManager';
import Dashboard from './components/Dashboard';
import DashboardNuevo from './components/DashboardNuevo';
import Abonos from './components/Abonos';
import ComparativoVentasAbonos from './components/ComparativoVentasAbonos';
import Papa from 'papaparse';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import { Container, Box, Typography, TextField, Button, List, ListItem, ListItemText, Alert, Link, AppBar, Toolbar, IconButton } from '@mui/material';
import LogoutIcon from '@mui/icons-material/Logout';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    background: { default: '#f4f6f8' },
  },
});

const PrivateRoute = ({ children }) => {
  return getToken() ? children : <Navigate to="/login" />;
};

const ManagerRoute = ({ children }) => {
    const user = getUser();
    return user && user.rol === 'manager' ? children : <Navigate to="/" />;
}

const ClientManager = () => {
  const [clients, setClients] = useState([]);
  const [error, setError] = useState('');
  const [nuevoCliente, setNuevoCliente] = useState({ rut: '', nombre: '', direccion: '', ciudad: '', estado: '', codigo_postal: '', pais: '', telefono: '', email: '' });
  const [csvFile, setCsvFile] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const navigate = useNavigate();
  const user = getUser();

  const fetchClients = async () => {
    setError('');
    try {
      const data = await getClients();
      setClients(data);
    } catch (err) {
      console.error(err);
      setError(err.message);
      if (err.message.includes('401')) {
        removeToken();
        navigate('/login');
      }
    }
  };

  useEffect(() => {
    fetchClients();
    // Cargar vendedores para el select
    getVendedores().then(setVendedores).catch(() => setVendedores([]));
  }, []);

  const handleAddClient = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await addClient(nuevoCliente);
      setNuevoCliente({ rut: '', nombre: '', direccion: '', ciudad: '', estado: '', codigo_postal: '', pais: '', telefono: '', email: '', vendedor_id: '' });
      fetchClients();
    } catch (err) {
      console.error(err);
      setError(err.message);
    }
  };

  const handleFileChange = (e) => {
    setError('');
    setCsvFile(e.target.files[0]);
  };

  const handleBulkAdd = () => {
    if (!csvFile) {
      setError('Por favor, selecciona un archivo CSV.');
      return;
    }

    Papa.parse(csvFile, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          await bulkAddClients(results.data);
          setCsvFile(null);
          fetchClients();
        } catch (err) {
          console.error(err);
          setError(err.message);
        }
      },
      error: (err) => {
        console.error(err);
        setError('Error al procesar el archivo CSV.');
      }
    });
  };

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
            <Link component={RouterLink} to="/" sx={{ color: 'white', textDecoration: 'none' }}>
              CRM
            </Link>
          </Typography>
          <Button color="inherit" component={RouterLink} to="/clients">
            Clientes
          </Button>
          <Button color="inherit" component={RouterLink} to="/activities">
            Interacciones
          </Button>
          <Button color="inherit" component={RouterLink} to="/goals">
            Objetivos
          </Button>
          {user && user.rol === 'manager' && (
            <>
              <Button color="inherit" component={RouterLink} to="/admin">
                Administrar
              </Button>
              <Button color="inherit" component={RouterLink} to="/register">
                Crear Usuario
              </Button>
            </>
          )}
          <IconButton color="inherit" onClick={handleLogout}>
            <LogoutIcon />
          </IconButton>
        </Toolbar>
      </AppBar>
      <Container maxWidth="md">
        <Box sx={{ mt: 4, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
          <Typography variant="h5" gutterBottom>Gestión de Clientes</Typography>
          
          {error && <Alert severity="error" sx={{ my: 2 }}>{error}</Alert>}

          <Typography variant="h6" sx={{ mt: 3 }}>Lista de Clientes</Typography>
          {clients && clients.length > 0 ? (
            <List>
              {clients.map(c => (
                <ListItem key={c.id} divider>
                  <ListItemText 
                    primary={`${c.nombre} (${c.rut})`}
                    secondary={
                      <React.Fragment>
                        <Typography component="span" variant="body2" color="text.primary">
                          {c.direccion}, {c.ciudad}, {c.pais}
                        </Typography>
                        <br />
                        {user.rol === 'manager' ? `Vendedor: ${c.vendedor_nombre}` : c.email}
                      </React.Fragment>
                    }
                  />
                </ListItem>
              ))}
            </List>
          ) : (
            <Typography sx={{ mt: 2 }}>No hay clientes para mostrar.</Typography>
          )}

          <Typography variant="h6" sx={{ mt: 3 }}>Carga masiva de clientes</Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <Link href="/plantilla_clientes.csv" download>Descargar plantilla CSV</Link>
            <input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
            />
            <Button variant="contained" onClick={handleBulkAdd} disabled={!csvFile}>Cargar Clientes</Button>
          </Box>

          <Typography variant="h6" sx={{ mt: 3 }}>Agregar cliente</Typography>
          <Box component="form" onSubmit={handleAddClient} sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
            <TextField label="RUT" value={nuevoCliente.rut} onChange={e => setNuevoCliente({ ...nuevoCliente, rut: e.target.value })} required />
            <TextField label="Nombre" value={nuevoCliente.nombre} onChange={e => setNuevoCliente({ ...nuevoCliente, nombre: e.target.value })} required />
            <TextField label="Dirección (Calle y Nro)" value={nuevoCliente.direccion} onChange={e => setNuevoCliente({ ...nuevoCliente, direccion: e.target.value })} />
            <TextField label="Ciudad" value={nuevoCliente.ciudad} onChange={e => setNuevoCliente({ ...nuevoCliente, ciudad: e.target.value })} />
            <TextField label="Estado/Región" value={nuevoCliente.estado} onChange={e => setNuevoCliente({ ...nuevoCliente, estado: e.target.value })} />
            <TextField label="Código Postal" value={nuevoCliente.codigo_postal} onChange={e => setNuevoCliente({ ...nuevoCliente, codigo_postal: e.target.value })} />
            <TextField label="País" value={nuevoCliente.pais} onChange={e => setNuevoCliente({ ...nuevoCliente, pais: e.target.value })} />
            <TextField label="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({ ...nuevoCliente, telefono: e.target.value })} />
            <TextField label="Email" type="email" value={nuevoCliente.email} onChange={e => setNuevoCliente({ ...nuevoCliente, email: e.target.value })} />
            {/* Selector de vendedor */}
            <TextField
              select
              label="Vendedor asignado"
              value={nuevoCliente.vendedor_id || ''}
              onChange={e => setNuevoCliente({ ...nuevoCliente, vendedor_id: e.target.value })}
              required
            >
              <option value="" disabled>Seleccione un vendedor</option>
              {vendedores.map(v => (
                <option key={v.id} value={v.id}>{v.nombre} ({v.email})</option>
              ))}
            </TextField>
            <Button type="submit" variant="contained">Agregar</Button>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<ManagerRoute><Register /></ManagerRoute>} />
          <Route path="/" element={<PrivateRoute><DashboardNuevo /></PrivateRoute>} />
          <Route path="/clients" element={<PrivateRoute><ClientManager /></PrivateRoute>} />
          <Route path="/activities" element={<PrivateRoute><ActivityList /></PrivateRoute>} />
          <Route path="/activities/new" element={<PrivateRoute><ActivityEditor /></PrivateRoute>} />
          <Route path="/activities/:id" element={<PrivateRoute><ActivityDetail /></PrivateRoute>} />
          <Route path="/goals" element={<PrivateRoute><Goals /></PrivateRoute>} />
          <Route path="/admin" element={<ManagerRoute><AdminManager /></ManagerRoute>} />
          <Route path="/abonos" element={<PrivateRoute><Abonos /></PrivateRoute>} />
          <Route path="/comparativo" element={<PrivateRoute><ComparativoVentasAbonos /></PrivateRoute>} />
          <Route path="/dashboard-nuevo" element={<DashboardNuevo />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
};

const root = createRoot(document.getElementById('root'));
root.render(<App />);
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  Box, 
  Typography, 
  CircularProgress, 
  IconButton, 
  Fab, 
  Dialog,
  Slide,
  AppBar,
  Toolbar,
  Button,
  ListItemButton,
  ListItemText,
  ListItemSecondaryAction,
  TextField,
  InputAdornment,
  List,
  ListItem,
  MenuItem,
  Menu,
  Select,
  FormControl,
  InputLabel,
  Stack,
  Chip
} from '@mui/material';
import { 
  Close as CloseIcon,
  Map as MapIcon,
  List as ListIcon,
  Add as AddIcon,
  Search as SearchIcon,
  Event as EventIcon,
  Business as OfficeIcon,
  Person as PersonIcon,
  Group as GroupIcon
} from '@mui/icons-material';
import { 
  GoogleMap, 
  useJsApiLoader, 
  Marker 
} from '@react-google-maps/api';
import moment from 'moment';
import WeekStrip from '../components/Mobile/WeekStrip';
import AgendaCard from '../components/Mobile/AgendaCard';
import ClientDetailPage from './ClientDetailPage';
import { 
  getVisitsByDate, 
  getVisitWorkload, 
  checkIn, 
  checkOut, 
  getActiveVisit,
  deleteVisit,
  searchClientes,
  submitVisitPlan,
  createEvent,
  createGroupEvent,
  apiFetch,
  API_URL
} from '../api';
import './MobileAgenda.css';

const Transition = React.forwardRef(function Transition(props, ref) {
  return <Slide direction="up" ref={ref} {...props} />;
});

const containerStyle = {
  width: '100%',
  height: 'calc(100vh - 160px)',
  margin: '8px',
  borderRadius: '16px',
};

const defaultCenter = { lat: -33.4489, lng: -70.6693 };

const MobileVisitsPage = () => {
  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
  });

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [visits, setVisits] = useState([]);
  const [workload, setWorkload] = useState({});
  const [loading, setLoading] = useState(true);
  const [activeVisit, setActiveVisit] = useState(null);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [clientDetailRut, setClientDetailRut] = useState(null);
  
  // Estado para añadir clientes/eventos
  const [addMenuAnchor, setAddMenuAnchor] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [eventOpen, setEventOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);

  // Formulario de evento
  const [eventForm, setEventForm] = useState({
    titulo: '',
    tipo_evento: 'oficina',
    hora_inicio_plan: '',
    hora_fin_plan: '',
    notas: '',
    participantes: []
  });
  const [vendedores, setVendedores] = useState([]);
  const { isManager, user: currentUser } = useAuth();
  const managerMode = isManager();

  // Cargar visitas y carga de trabajo
  const loadData = useCallback(async (date) => {
    try {
      setLoading(true);
      const formattedDate = moment(date).format('YYYY-MM-DD');
      const start = moment(date).subtract(15, 'days').format('YYYY-MM-DD');
      const end = moment(date).add(15, 'days').format('YYYY-MM-DD');

      const [visitsRes, workloadRes, activeRes] = await Promise.all([
        getVisitsByDate(formattedDate),
        getVisitWorkload(start, end),
        getActiveVisit()
      ]);

      setVisits(visitsRes || []);
      setWorkload(workloadRes || {});
      setActiveVisit(activeRes);
    } catch (err) {
      console.error('Error loading agenda data:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData(selectedDate);
    if (managerMode) {
      loadVendedores();
    }
  }, [selectedDate, loadData, managerMode]);

  const loadVendedores = async () => {
    try {
      const res = await apiFetch(`${API_URL}/users/vendedores`);
      setVendedores(res.data || []);
    } catch (err) {
      console.error('Error cargando vendedores:', err);
    }
  };

  // Debounce para búsqueda dinámica
  useEffect(() => {
    const term = searchTerm.trim();
    if (term.length < 3) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(() => {
      performSearch(term);
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  const performSearch = async (term) => {
    try {
      setSearching(true);
      const results = await searchClientes(term);
      setSearchResults(results || []);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setSearching(false);
    }
  };

  const handleCheckIn = async (visit) => {
    try {
      setLoading(true);
      // Obtener posición real
      const getPos = () => new Promise((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true });
      });

      let lat = 0, lng = 0;
      try {
        const pos = await getPos();
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (gpsErr) {
        console.warn('GPS failed, using 0,0', gpsErr);
        if (!window.confirm('No pudimos obtener tu ubicación GPS. ¿Deseas continuar con el check-in de todas formas?')) {
          setLoading(false);
          return;
        }
      }

      const res = await checkIn(visit.cliente_rut, lat, lng);
      if (res.warning) alert(res.warning);
      
      setActiveVisit(res);
      await loadData(selectedDate);
    } catch (err) {
      alert('Error en Check-in: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteVisit = async (id) => {
    if (!window.confirm('¿Estás seguro de eliminar esta visita de tu ruta?')) return;
    try {
      await deleteVisit(id);
      loadData(selectedDate);
    } catch (err) {
      alert('Error al eliminar visita');
    }
  };

  const handleSearch = () => {
    performSearch(searchTerm.trim());
  };

  const handleAddClientToRoute = async (rut) => {
    try {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      await submitVisitPlan([rut], { fecha: formattedDate });
      setSearchOpen(false);
      setSearchTerm('');
      setSearchResults([]);
      loadData(selectedDate);
    } catch (err) {
      alert('Error al añadir cliente: ' + (err.response?.data?.msg || err.message));
    }
  };

  const handleCheckOut = async (visit, manualResult = null) => {
    const res = manualResult || prompt('Resultado (venta/no_venta/cobranza):', 'venta');
    if (!res) return;
    const notas = manualResult ? '' : prompt('Notas de la visita:');
    try {
      await checkOut(visit.id, 0, 0, res, notas);
      setActiveVisit(null);
      loadData(selectedDate);
    } catch (err) {
      alert('Error en Check-out');
    }
  };

  const handleCreateEvent = async () => {
    try {
      const formattedDate = moment(selectedDate).format('YYYY-MM-DD');
      
      if (eventForm.participantes.length > 0) {
        // Modo Grupal
        await createGroupEvent({
          ...eventForm,
          fecha: formattedDate
        });
      } else {
        // Individual
        await createEvent({
          ...eventForm,
          fecha: formattedDate
        });
      }
      
      setEventOpen(false);
      setEventForm({ titulo: '', tipo_evento: 'oficina', hora_inicio_plan: '', hora_fin_plan: '', notas: '', participantes: [] });
      loadData(selectedDate);
    } catch (err) {
      alert('Error al crear evento');
    }
  };

  const handleOpenClient = (rut) => {
    setClientDetailRut(rut);
  };

  const handleCloseClient = () => {
    setClientDetailRut(null);
  };

  const center = useMemo(() => {
    const firstWithPos = visits.find(v => v.latitud && v.longitud);
    if (firstWithPos) {
      return { lat: parseFloat(firstWithPos.latitud), lng: parseFloat(firstWithPos.longitud) };
    }
    return defaultCenter;
  }, [visits]);

  return (
    <Box className="mobile-agenda-container">
      {/* Header Fijo */}
      <Box className="agenda-header-sticky">
        <Typography variant="h6" sx={{ px: 2, pt: 2, fontWeight: 800, color: '#0f172a' }}>
          Agenda Inteligente
        </Typography>
          <WeekStrip 
          selectedDate={selectedDate} 
          onDateSelect={setSelectedDate} 
          workload={workload} 
        />
        <Box sx={{ px: 2, pb: 1, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="caption" sx={{ fontWeight: 700, color: 'text.secondary' }}>
            {visits.length} VISITAS PLANIFICADAS
          </Typography>
          <Button 
            size="small" 
            startIcon={<AddIcon />} 
            onClick={(e) => setAddMenuAnchor(e.currentTarget)}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            Añadir
          </Button>

          <Menu
            anchorEl={addMenuAnchor}
            open={Boolean(addMenuAnchor)}
            onClose={() => setAddMenuAnchor(null)}
          >
            <MenuItem onClick={() => { setAddMenuAnchor(null); setSearchOpen(true); }}>
              <PersonIcon sx={{ mr: 1 }} /> Ruta a Cliente
            </MenuItem>
            <MenuItem onClick={() => { setAddMenuAnchor(null); setEventOpen(true); setEventForm({...eventForm, participantes: []}); }}>
              <EventIcon sx={{ mr: 1 }} /> Actividad Mi Agenda
            </MenuItem>
              <MenuItem onClick={() => { 
                setAddMenuAnchor(null); 
                setEventOpen(true); 
                setEventForm({...eventForm, tipo_evento: 'reunion', participantes: [currentUser.id]}); 
              }}>
                <GroupIcon sx={{ mr: 1 }} /> Agendar para Equipo
              </MenuItem>
          </Menu>
        </Box>
      </Box>

      {/* Contenido Condicional */}
      <Box className="agenda-content" sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        {loading ? (
          <Box display="flex" justifyContent="center" py={5}>
            <CircularProgress />
          </Box>
        ) : viewMode === 'list' ? (
          <Box sx={{ overflowY: 'auto', p: 2, pb: 10 }}>
            {visits.length > 0 ? (
              visits.map((visit) => (
                <AgendaCard 
                  key={visit.id} 
                  visit={visit} 
                  onCheckIn={handleCheckIn}
                  onCheckOut={handleCheckOut}
                  onViewClient={handleOpenClient}
                  onDelete={handleDeleteVisit}
                  isAnyActive={!!activeVisit}
                />
              ))
            ) : (
              <Box textAlign="center" py={10} color="text.secondary">
                <Typography variant="body1">No hay visitas planificadas</Typography>
                <Typography variant="caption">Para este día.</Typography>
              </Box>
            )}
          </Box>
        ) : (
          <Box sx={{ flex: 1, p: 1 }}>
            {isLoaded ? (
              <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={14}
                options={{ disableDefaultUI: true, zoomControl: true }}
              >
                {visits.map((visit, idx) => {
                  const lat = parseFloat(visit.latitud);
                  const lng = parseFloat(visit.longitud);
                  if (isNaN(lat) || isNaN(lng)) return null;
                  return (
                    <Marker
                      key={visit.id}
                      position={{ lat, lng }}
                      label={(idx + 1).toString()}
                      onClick={() => handleOpenClient(visit.cliente_rut)}
                    />
                  );
                })}
              </GoogleMap>
            ) : (
              <Typography>Cargando Mapa...</Typography>
            )}
          </Box>
        )}
      </Box>

      {/* Botón Flotante Mapa/Lista */}
      <Fab 
        color="primary" 
        className="fab-view-toggle"
        onClick={() => setViewMode(viewMode === 'list' ? 'map' : 'list')}
      >
        {viewMode === 'list' ? <MapIcon /> : <ListIcon />}
      </Fab>

      {/* MODAL FICHA DE CLIENTE */}
      <Dialog
        fullScreen
        open={!!clientDetailRut}
        onClose={handleCloseClient}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative', bgcolor: '#ffffff', color: '#000', elevation: 0, borderBottom: '1px solid #e2e8f0' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={handleCloseClient} aria-label="close">
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1, fontWeight: 700 }} variant="h6">
              Ficha de Cliente
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 0 }}>
          {/* Aquí inyectamos el componente de detalle, pasándole el rut */}
          {clientDetailRut && <ClientDetailPage rutForced={clientDetailRut} isModal={true} />}
        </Box>
      </Dialog>

      {/* MODAL AÑADIR CLIENTE */}
      <Dialog
        fullScreen
        open={searchOpen}
        onClose={() => setSearchOpen(false)}
        TransitionComponent={Transition}
      >
        <AppBar sx={{ position: 'relative', bgcolor: '#ffffff', color: '#000', elevation: 0, borderBottom: '1px solid #e2e8f0' }}>
          <Toolbar>
            <IconButton edge="start" color="inherit" onClick={() => setSearchOpen(false)}>
              <CloseIcon />
            </IconButton>
            <Typography sx={{ ml: 2, flex: 1, fontWeight: 700 }} variant="h6">
              Añadir a Ruta
            </Typography>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            placeholder="Buscar por Nombre o RUT..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton onClick={handleSearch} disabled={searching}>
                    {searching ? <CircularProgress size={24} /> : <SearchIcon />}
                  </IconButton>
                </InputAdornment>
              ),
              sx: { borderRadius: 3 }
            }}
          />
          
          <List sx={{ mt: 2 }}>
            {searchResults.map((client) => (
              <ListItemButton 
                key={client.rut} 
                onClick={() => handleAddClientToRoute(client.rut)}
                sx={{ 
                  borderRadius: 2, 
                  mb: 1, 
                  border: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  p: 2
                }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">{client.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {client.rut} • {client.direccion || 'Sin dirección'}
                  </Typography>
                </Box>
                <IconButton edge="end" color="primary">
                  <AddIcon />
                </IconButton>
              </ListItemButton>
            ))}
            {searchTerm && !searching && searchResults.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 4 }}>
                No se encontraron clientes.
              </Typography>
            )}
          </List>
        </Box>
      </Dialog>

      {/* Diálogo de Nuevo Evento */}
      <Dialog open={eventOpen} onClose={() => setEventOpen(false)} fullWidth maxWidth="xs">
        <Box sx={{ p: 3 }}>
          <Typography variant="h6" fontWeight="bold" gutterBottom>Nuevo Evento / Actividad</Typography>
          <Stack spacing={2} sx={{ mt: 2 }}>
            <TextField 
              label="Título / Asunto" 
              fullWidth 
              value={eventForm.titulo}
              onChange={(e) => setEventForm({...eventForm, titulo: e.target.value})}
              placeholder="Ej: Reunión de ventas, Almuerzo..."
            />
            <FormControl fullWidth>
              <InputLabel>Tipo de Actividad</InputLabel>
              <Select
                value={eventForm.tipo_evento}
                label="Tipo de Actividad"
                onChange={(e) => setEventForm({...eventForm, tipo_evento: e.target.value})}
              >
                <MenuItem value="oficina">Oficina / Administrativo</MenuItem>
                <MenuItem value="personal">Personal / Almuerzo</MenuItem>
                <MenuItem value="reunion">Reunión de Equipo</MenuItem>
              </Select>
            </FormControl>

            {managerMode && (
              <FormControl fullWidth>
                <InputLabel>Participantes (Equipo)</InputLabel>
                <Select
                  multiple
                  value={eventForm.participantes}
                  label="Participantes (Equipo)"
                  onChange={(e) => setEventForm({...eventForm, participantes: e.target.value})}
                  renderValue={(selected) => (
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {selected.map((value) => {
                         const v = vendedores.find(v => v.id === value);
                         return <Chip key={value} label={v?.nombre || value} size="small" />;
                      })}
                    </Box>
                  )}
                >
                  {vendedores.map((v) => (
                    <MenuItem key={v.id} value={v.id}>
                      {v.nombre} ({v.rol})
                    </MenuItem>
                  ))}
                </Select>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5 }}>
                  Si dejas vacío, solo aparecerá en tu agenda personal.
                </Typography>
              </FormControl>
            )}

            <Box display="flex" gap={2}>
              <TextField
                label="Hora Inicio"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventForm.hora_inicio_plan}
                onChange={(e) => setEventForm({...eventForm, hora_inicio_plan: e.target.value})}
              />
              <TextField
                label="Hora Fin"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={eventForm.hora_fin_plan}
                onChange={(e) => setEventForm({...eventForm, hora_fin_plan: e.target.value})}
              />
            </Box>
            <TextField 
              label="Notas adicionales" 
              multiline 
              rows={2} 
              fullWidth
              value={eventForm.notas}
              onChange={(e) => setEventForm({...eventForm, notas: e.target.value})}
            />
            <Button 
              variant="contained" 
              fullWidth 
              onClick={handleCreateEvent}
              disabled={!eventForm.titulo}
              sx={{ py: 1.5, borderRadius: 3, fontWeight: 'bold' }}
            >
              Agendar Actividad
            </Button>
          </Stack>
        </Box>
      </Dialog>
    </Box>
  );
};

export default MobileVisitsPage;

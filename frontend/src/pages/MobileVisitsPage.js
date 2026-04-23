import React, { useState, useEffect, useCallback, useMemo } from 'react';
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
  Button
} from '@mui/material';
import { 
  Close as CloseIcon,
  Map as MapIcon,
  List as ListIcon
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
  getActiveVisit 
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
  }, [selectedDate, loadData]);

  const handleCheckIn = async (visit) => {
    try {
      // Geolocalización básica (simplificada para el PoC)
      const res = await checkIn(visit.cliente_rut, 0, 0);
      setActiveVisit(res);
      loadData(selectedDate);
    } catch (err) {
      alert('Error en Check-in');
    }
  };

  const handleCheckOut = async (visit) => {
    const notas = prompt('Notas de la visita:');
    const resultado = prompt('Resultado (venta/no_venta/cobranza):', 'venta');
    try {
      await checkOut(visit.id, 0, 0, resultado, notas);
      setActiveVisit(null);
      loadData(selectedDate);
    } catch (err) {
      alert('Error en Check-out');
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
    </Box>
  );
};

export default MobileVisitsPage;

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { GoogleMap, useJsApiLoader, Marker } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Chip, Stack, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions, IconButton, Divider, Badge, FormControl, InputLabel, Select, MenuItem } from '@mui/material';
import { LocationOn, CheckCircle, DirectionsCar, Schedule, Flag, FilterList, Close } from '@mui/icons-material';
import AltRouteIcon from '@mui/icons-material/AltRoute';
import MapIcon from '@mui/icons-material/Map';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import { getHeatmapData, checkIn, checkOut, getCircuits, getVendedores, submitVisitPlan, getMyVisitsToday } from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getEnv } from '../utils/env';
import { getDistance, formatDistance } from '../utils/geoUtils';

const containerStyle = {
    width: '100%',
    height: '45vh', // Altura mapa en móvil
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
};

const defaultCenter = { lat: -33.4489, lng: -70.6693 };
const defaultCircuitColors = { 'General': '#95a5a6' };

const getStatusColor = (estado) => {
    if (estado === 'completada') return '#10b981';
    if (estado === 'en_progreso') return '#3b82f6';
    return '#94a3b8';
};
const getStatusLabel = (estado) => {
    if (estado === 'completada') return 'Completada';
    if (estado === 'en_progreso') return 'En curso';
    return 'Pendiente';
};
const getHeatColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
};

const MobileVisitsPage = () => {
    const apiKey = getEnv('REACT_APP_GOOGLE_MAPS_API_KEY');
    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    });

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [activeVisit, setActiveVisit] = useState(null); // ID de la visita activa
    const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
    const [checkOutData, setCheckOutData] = useState({ resultado: 'venta', notas: '' });
    const [userLocation, setUserLocation] = useState(null);
    const [circuits, setCircuits] = useState([]);

    // Nuevas funcionalidades de planificación para móvil
    const [planHoy, setPlanHoy] = useState([]);
    const [planRuts, setPlanRuts] = useState(new Set());
    const [viewMode, setViewMode] = useState('ruta'); // 'ruta' | 'general'
    const [filterCircuit, setFilterCircuit] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');

    // Memoized Map Options
    const mapOptions = useMemo(() => ({
        disableDefaultUI: true,
        zoomControl: true,
        styles: [
            { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "transit", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "administrative", elementType: "labels", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "labels.icon", stylers: [{ visibility: "off" }] },
            { featureType: "water", elementType: "labels.text", stylers: [{ visibility: "off" }] }
        ]
    }), []);

    const { user } = useAuth();
    const isManager = user?.rol?.toUpperCase() === 'MANAGER';

    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedor, setSelectedVendedor] = useState('');

    const center = useMemo(() => userLocation || defaultCenter, [userLocation]);

    const fetchTodayPlan = useCallback(async () => {
        try {
            const res = await getMyVisitsToday();
            const visitas = Array.isArray(res) ? res : [];
            setPlanHoy(visitas);
            setPlanRuts(new Set(visitas.map(v => v.cliente_rut)));
            
            // Re-vincular visita en curso automáticamente si venimos de recargar
            const enProgreso = visitas.find(v => v.estado === 'en_progreso');
            if (enProgreso) {
                setActiveVisit(enProgreso);
            }
        } catch (err) {
            console.error('Error cargando plan del día:', err);
        }
    }, []);

    const fetchData = useCallback(async (vId) => {
        try {
            setLoading(true);
            const [heatmapData, circuitsData, vendedoresRes] = await Promise.all([
                getHeatmapData(vId),
                getCircuits().catch(() => []),
                isManager ? getVendedores().catch(() => []) : Promise.resolve([])
            ]);

            setClients(Array.isArray(heatmapData) ? heatmapData : (heatmapData?.data || []));
            setCircuits(Array.isArray(circuitsData) ? circuitsData : (circuitsData?.data || []));

            if (vendedoresRes?.success) {
                setVendedores(vendedoresRes.data || []);
            }
            // Al cargar datos generales, cargar también plan de hoy
            await fetchTodayPlan();
        } catch (err) {
            console.error('Error heatmap:', err);
        } finally {
            setLoading(false);
        }
    }, [isManager, fetchTodayPlan]);

    useEffect(() => {
        fetchData(selectedVendedor);
    }, [selectedVendedor, fetchData]);

    useEffect(() => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({ lat: position.coords.latitude, lng: position.coords.longitude });
                },
                (err) => console.log('Ubicación no disponible:', err)
            );

            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLoc = { lat: position.coords.latitude, lng: position.coords.longitude };
                    setUserLocation(prev => {
                        if (!prev || Math.abs(prev.lat - newLoc.lat) > 0.0001 || Math.abs(prev.lng - newLoc.lng) > 0.0001) return newLoc;
                        return prev;
                    });
                },
                (err) => console.log('Error monitoreo:', err),
                { enableHighAccuracy: true, distanceFilter: 10 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    // Clientes que deben ser dibujados en el mapa de acuerdo con modo activo
    const filteredClients = useMemo(() => {
        if (viewMode === 'ruta') {
            return clients.filter(c => planRuts.has(c.rut));
        }
        return clients.filter(c => {
            if (filterCircuit !== 'ALL' && c.circuito !== filterCircuit) return false;
            if (filterPriority === 'HIGH' && c.heatScore < 70) return false;
            if (filterPriority === 'MEDIUM' && (c.heatScore < 40 || c.heatScore >= 70)) return false;
            if (filterPriority === 'LOW' && c.heatScore >= 40) return false;
            return true;
        });
    }, [clients, viewMode, planRuts, filterCircuit, filterPriority]);

    // Dinámico: ordena por distancia (solo lo dibuja en lista)
    const sortedClients = useMemo(() => {
        if (!userLocation || filteredClients.length === 0) return filteredClients;
        return filteredClients.map(c => ({
            ...c, distance: (c.latitud && c.longitud) ? getDistance(userLocation.lat, userLocation.lng, parseFloat(c.latitud), parseFloat(c.longitud)) : Infinity
        })).sort((a, b) => a.distance - b.distance);
    }, [filteredClients, userLocation]);

    const handleCheckIn = async (clientArg) => {
        const client = clientArg || selectedClient;
        if (!client) return;

        if (client.distance > 0.5) {
            const currentDist = formatDistance(client.distance);
            if (!window.confirm(`Estás a ${currentDist} del cliente. La ubicación sugerida es mayor a 500 metros. ¿Deseas iniciar la visita de todas formas?`)) return;
        }

        try {
            const loc = userLocation || { lat: 0, lng: 0 };
            const res = await checkIn(client.rut, loc.lat, loc.lng);
            setActiveVisit(res);
            setSelectedClient(null);
            alert(`✅ Visita iniciada con ${client.nombre}`);
            fetchTodayPlan();
        } catch (error) {
            console.error('Error check-in:', error);
            alert('Error al iniciar visita');
        }
    };

    const handleCheckOut = async () => {
        if (!activeVisit) return;
        try {
            const loc = userLocation || { lat: 0, lng: 0 };
            await checkOut(activeVisit.id, loc.lat, loc.lng, checkOutData.resultado, checkOutData.notas);
            setActiveVisit(null);
            setCheckOutDialogOpen(false);
            alert('🏁 Visita finalizada exitosamente');
            fetchTodayPlan();
        } catch (error) {
            console.error('Error check-out:', error);
            alert('Error al finalizar visita');
        }
    };

    const handleAddToRoute = async (rut) => {
        try {
            await submitVisitPlan([rut]);
            alert('Cliente agregado a la ruta de hoy');
            fetchTodayPlan();
        } catch (error) {
            alert('Error al agregar a la ruta');
        }
    };

    const getMarkerIcon = (client) => {
        const circuit = circuits.find(c => c.nombre === client.circuito);
        
        // Determinar apariencia según pertenencia a ruta
        if (planRuts.has(client.rut)) {
            const visita = planHoy.find(v => v.cliente_rut === client.rut);
            const statusColor = visita ? getStatusColor(visita.estado) : '#94a3b8';
            return {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: statusColor,
                fillOpacity: 1,
                strokeWeight: 2,
                strokeColor: '#ffffff',
                scale: 9
            };
        }

        const heatColor = getHeatColor(client.heatScore);
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: circuit ? circuit.color : defaultCircuitColors['General'],
            fillOpacity: 0.9,
            strokeWeight: 3,
            strokeColor: heatColor,
            scale: 7
        };
    };

    if (loadError) return <Box p={3}>Error Maps</Box>;
    if (!isLoaded || loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ position: 'relative', height: '100vh', bgcolor: '#f5f5f5', pb: 8, display: 'flex', flexDirection: 'column' }}>
            
            {/* Controles Superiores: Toggle y Filtros */}
            <Box sx={{ p: 1, bgcolor: 'white', borderBottom: '1px solid #e0e0e0', zIndex: 1, boxShadow: 1 }}>
                {isManager && (
                    <TextField
                        select
                        fullWidth
                        size="small"
                        label="Filtrar por Vendedor"
                        value={selectedVendedor}
                        onChange={(e) => setSelectedVendedor(e.target.value)}
                        SelectProps={{ native: true }}
                        sx={{ mb: 1 }}
                    >
                        <option value="">TODOS</option>
                        {vendedores.map(v => <option key={v.rut} value={v.rut}>{v.nombre || v.alias || v.rut}</option>)}
                    </TextField>
                )}
                
                <Paper elevation={0} sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden', mb: viewMode === 'general' ? 1 : 0 }}>
                    <Button
                        startIcon={<AltRouteIcon />}
                        onClick={() => setViewMode('ruta')}
                        sx={{
                            flex: 1, borderRadius: 0, fontWeight: 600,
                            bgcolor: viewMode === 'ruta' ? 'primary.main' : 'transparent',
                            color: viewMode === 'ruta' ? 'white' : 'text.secondary',
                            '&:hover': { bgcolor: viewMode === 'ruta' ? 'primary.dark' : 'action.hover' }
                        }}
                    >
                        <Badge badgeContent={planHoy.length || 0} color="warning" sx={{ mr: 0.5 }}>
                            Ruta Hoy
                        </Badge>
                    </Button>
                    <Divider orientation="vertical" flexItem />
                    <Button
                        startIcon={<MapIcon />}
                        onClick={() => setViewMode('general')}
                        sx={{
                            flex: 1, borderRadius: 0, fontWeight: 600,
                            bgcolor: viewMode === 'general' ? 'primary.main' : 'transparent',
                            color: viewMode === 'general' ? 'white' : 'text.secondary',
                            '&:hover': { bgcolor: viewMode === 'general' ? 'primary.dark' : 'action.hover' }
                        }}
                    >
                        General
                    </Button>
                </Paper>

                {/* Filtros solo en modo general */}
                {viewMode === 'general' && (
                    <Box display="flex" gap={1} flexWrap="wrap">
                        <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                            <InputLabel>Circuito</InputLabel>
                            <Select value={filterCircuit} label="Circuito" onChange={e => setFilterCircuit(e.target.value)}>
                                <MenuItem value="ALL">Todos</MenuItem>
                                {circuits.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ flex: 1, minWidth: 120 }}>
                            <InputLabel>Prioridad</InputLabel>
                            <Select value={filterPriority} label="Prioridad" onChange={e => setFilterPriority(e.target.value)}>
                                <MenuItem value="ALL">Todas</MenuItem>
                                <MenuItem value="HIGH">Alta 🔴</MenuItem>
                                <MenuItem value="MEDIUM">Media 🟠</MenuItem>
                                <MenuItem value="LOW">Baja 🟢</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                )}
            </Box>

            {/* Mapa Arriba */}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={center}
                zoom={13}
                options={mapOptions}
            >
                {sortedClients.map((client) => {
                    const lat = parseFloat(client.latitud);
                    const lng = parseFloat(client.longitud);
                    if (isNaN(lat) || isNaN(lng)) return null;

                    return (
                        <Marker
                            key={client.id}
                            position={{ lat, lng }}
                            icon={getMarkerIcon(client)}
                            onClick={() => setSelectedClient(client)}
                        />
                    );
                })}

                {userLocation && (
                    <Marker
                        position={userLocation}
                        icon={{
                            path: window.google.maps.SymbolPath.CIRCLE,
                            scale: 6,
                            fillColor: '#4285F4',
                            fillOpacity: 1,
                            strokeColor: 'white',
                            strokeWeight: 2,
                        }}
                    />
                )}
            </GoogleMap>

            {/* Panel Flotante Cliente Seleccionado */}
            {selectedClient && (
                <Paper sx={{ position: 'absolute', top: '48vh', left: 16, right: 16, p: 2, borderRadius: 3, zIndex: 10, boxShadow: 3 }}>
                    <IconButton
                        size="small"
                        onClick={() => setSelectedClient(null)}
                        sx={{ position: 'absolute', top: 4, right: 4, color: 'text.secondary' }}
                    >
                        <Close fontSize="small" />
                    </IconButton>
                    <Typography variant="subtitle1" fontWeight="bold" pr={3} noWrap>{selectedClient.nombre}</Typography>
                    <Typography variant="body2" color="text.secondary" noWrap sx={{ mb: 1 }}>{selectedClient.direccion}</Typography>
                    
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                        {selectedClient.circuito && (
                            <Chip
                                label={selectedClient.circuito}
                                size="small"
                                sx={{ bgcolor: circuits.find(cc => cc.nombre === selectedClient.circuito)?.color || '#ddd', color: 'white', fontWeight: 'bold' }}
                            />
                        )}
                        <Chip 
                            label={getHeatColor(selectedClient.heatScore) === '#ef4444' ? 'Alta Prioridad' : 'Media/Baja Prioridad'} 
                            size="small" 
                            variant="outlined" 
                        />
                    </Box>
                    
                    <Box display="flex" gap={1} mb={1}>
                        <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<DirectionsCar />}
                            onClick={() => {
                                window.open(`https://waze.com/ul?ll=${selectedClient.latitud},${selectedClient.longitud}&navigate=yes`, '_blank');
                            }}
                        >
                            WAZE
                        </Button>
                        <Button
                            variant="outlined"
                            size="small"
                            fullWidth
                            startIcon={<DirectionsCar />}
                            onClick={() => {
                                window.open(`https://www.google.com/maps/dir/?api=1&destination=${selectedClient.latitud},${selectedClient.longitud}`, '_blank');
                            }}
                        >
                            MAPS
                        </Button>
                    </Box>

                    <Stack spacing={1}>
                        {!planRuts.has(selectedClient.rut) && (
                            <Button
                                variant="outlined"
                                color="secondary"
                                fullWidth
                                startIcon={<AddLocationIcon />}
                                onClick={() => handleAddToRoute(selectedClient.rut)}
                            >
                                AGREGAR A RUTA HOY
                            </Button>
                        )}

                        <Button
                            variant="contained"
                            fullWidth
                            color={activeVisit && activeVisit.cliente_rut === selectedClient.rut ? "warning" : "primary"}
                            onClick={() => {
                                if (activeVisit && activeVisit.cliente_rut === selectedClient.rut) {
                                    setCheckOutDialogOpen(true);
                                } else if (activeVisit) {
                                    alert('Termina tu visita actual antes de iniciar otra.');
                                } else {
                                    handleCheckIn();
                                }
                            }}
                        >
                            {activeVisit && activeVisit.cliente_rut === selectedClient.rut ? "FINALIZAR VISITA" : "HACER CHECK-IN"}
                        </Button>
                    </Stack>
                </Paper>
            )}

            {/* Listado de Clientes (Inferior) */}
            <Box sx={{ flex: 1, overflowY: 'auto', p: 2, mt: selectedClient ? 16 : 0 }}>
                {viewMode === 'ruta' && (
                    <Box sx={{ mb: 2, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                        {[['#94a3b8', 'Pendiente'], ['#3b82f6', 'En curso'], ['#10b981', 'Completada']].map(([color, label]) => (
                            <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <FiberManualRecordIcon sx={{ color, fontSize: 12 }} />
                                <Typography variant="caption">{label}</Typography>
                            </Box>
                        ))}
                    </Box>
                )}

                <Typography variant="h6" fontWeight="bold" mb={1}>
                    {viewMode === 'ruta' ? 'Mi Ruta de Hoy' : 'Clientes Generales'}
                </Typography>
                
                {sortedClients.length === 0 && (
                    <Typography variant="body2" color="text.secondary">
                        No hay clientes asignados en esta vista.
                    </Typography>
                )}

                {sortedClients.map((client, idx) => {
                    const isRuta = viewMode === 'ruta';
                    const visitaInfo = isRuta ? planHoy.find(v => v.cliente_rut === client.rut) : null;
                    const statusColor = visitaInfo ? getStatusColor(visitaInfo.estado) : 'transparent';
                    
                    return (
                        <Paper 
                            key={client.id} 
                            elevation={1} 
                            sx={{ p: 1.5, mb: 1.5, borderRadius: 2, borderLeft: isRuta ? `4px solid ${statusColor}` : 'none' }} 
                            onClick={() => setSelectedClient(client)}
                        >
                            <Box display="flex" gap={2} alignItems="center">
                                <Box sx={{ bgcolor: '#eee', p: 1, borderRadius: '50%', color: isRuta ? statusColor : 'action.active' }}>
                                    <LocationOn />
                                </Box>
                                <Box flexGrow={1} minWidth={0}>
                                    <Typography variant="subtitle2" fontWeight="bold" noWrap>
                                        {isRuta && `${idx + 1}. `}{client.nombre}
                                    </Typography>
                                    <Box display="flex" alignItems="center" gap={0.5}>
                                        <DirectionsCar sx={{ fontSize: '0.9rem', color: '#6B7280' }} />
                                        <Typography variant="caption" color="text.secondary">
                                            {formatDistance(client.distance)}
                                        </Typography>
                                    </Box>
                                </Box>
                                {isRuta && visitaInfo && (
                                    <Chip 
                                        label={getStatusLabel(visitaInfo.estado)} 
                                        size="small" 
                                        sx={{ bgcolor: statusColor + '20', color: statusColor, fontWeight: 600, fontSize: '0.7rem' }} 
                                    />
                                )}
                            </Box>
                        </Paper>
                    )
                })}
            </Box>

            {/* Dialog Check-out */}
            <Dialog open={checkOutDialogOpen} onClose={() => setCheckOutDialogOpen(false)} fullWidth>
                <DialogTitle>Finalizar Visita</DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle1" gutterBottom sx={{ mt: 1 }}>Resultado:</Typography>
                    <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                        {['venta', 'no_venta', 'cobranza'].map((res) => (
                            <Chip
                                key={res}
                                label={res.replace('_', ' ').toUpperCase()}
                                onClick={() => setCheckOutData({ ...checkOutData, resultado: res })}
                                color={checkOutData.resultado === res ? "primary" : "default"}
                                variant={checkOutData.resultado === res ? "filled" : "outlined"}
                            />
                        ))}
                    </Box>
                    <TextField
                        fullWidth
                        multiline
                        rows={3}
                        label="Notas de la visita"
                        value={checkOutData.notas}
                        onChange={(e) => setCheckOutData({ ...checkOutData, notas: e.target.value })}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setCheckOutDialogOpen(false)}>Cancelar</Button>
                    <Button onClick={handleCheckOut} variant="contained" color="primary">Confirmar cierre</Button>
                </DialogActions>
            </Dialog>

            {/* Indicador Visita Activa (Floating Sticky) */}
            {activeVisit && (
                <Paper sx={{ position: 'fixed', bottom: 70, left: 16, right: 16, bgcolor: '#2e7d32', color: 'white', p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Schedule fontSize="small" />
                        <Typography variant="body2" fontWeight="bold">Visita en curso...</Typography>
                    </Box>
                    <Button size="small" variant="contained" color="warning" onClick={() => setCheckOutDialogOpen(true)}>
                        TERMINAR
                    </Button>
                </Paper>
            )}
        </Box>
    );
};

export default MobileVisitsPage;

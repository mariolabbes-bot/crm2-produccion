
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Chip, Stack, Button, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { LocationOn, CheckCircle, DirectionsCar, Schedule, Flag } from '@mui/icons-material';
import { getHeatmapData, checkInVisita, checkOutVisita, getCircuits } from '../api';
import { getEnv } from '../utils/env';
import { getDistance, formatDistance } from '../utils/geoUtils';

const containerStyle = {
    width: '100%',
    height: '45vh', // Altura mapa en móvil
    borderRadius: '0 0 16px 16px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
};

const defaultCenter = {
    lat: -33.4489,
    lng: -70.6693
};

const defaultCircuitColors = {
    'General': '#95a5a6'
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

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [heatmapData, circuitsData] = await Promise.all([
                getHeatmapData(),
                getCircuits().catch(() => [])
            ]);

            let finalClients = Array.isArray(heatmapData) ? heatmapData : [];

            // Si tenemos ubicación, calculamos distancias y ordenamos
            if (userLocation && finalClients.length > 0) {
                finalClients = finalClients.map(c => ({
                    ...c,
                    distance: (c.lat && c.lng) ? getDistance(userLocation.lat, userLocation.lng, c.lat, c.lng) : Infinity
                })).sort((a, b) => a.distance - b.distance);
            }

            setClients(finalClients);
            setCircuits(circuitsData);
        } catch (err) {
            console.error('Error heatmap:', err);
        } finally {
            setLoading(false);
        }
    }, [userLocation]);

    useEffect(() => {
        fetchData();
    }, []); // Fetch initially

    useEffect(() => {
        // Obtener ubicación actual usuario una vez al inicio
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setUserLocation({
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    });
                },
                (err) => console.log('Ubicación no disponible:', err)
            );

            // Opcional: monitorear movimiento sin disparar fetchData en loop
            const watchId = navigator.geolocation.watchPosition(
                (position) => {
                    const newLoc = {
                        lat: position.coords.latitude,
                        lng: position.coords.longitude
                    };
                    setUserLocation(prev => {
                        // Solo actualizar si hay un cambio significativo (> 10m aprox) para evitar re-renders excesivos
                        if (!prev || Math.abs(prev.lat - newLoc.lat) > 0.0001 || Math.abs(prev.lng - newLoc.lng) > 0.0001) {
                            return newLoc;
                        }
                        return prev;
                    });
                },
                (err) => console.log('Error monitoreo:', err),
                { enableHighAccuracy: true, distanceFilter: 10 }
            );
            return () => navigator.geolocation.clearWatch(watchId);
        }
    }, []);

    const handleCheckIn = async (clientArg) => {
        const client = clientArg || selectedClient;
        if (!client) return;

        // Validación de proximidad (Opcional: 500 metros = 0.5 km)
        if (client.distance > 0.5) {
            const currentDist = formatDistance(client.distance);
            const confirmVisit = window.confirm(
                `Estás a ${currentDist} del cliente. La ubicación sugerida es mayor a 500 metros. ¿Deseas iniciar la visita de todas formas?`
            );
            if (!confirmVisit) return;
        }

        try {
            const location = userLocation || { lat: 0, lng: 0 }; // Fallback
            const res = await checkInVisita({
                cliente_rut: client.rut,
                latitud: location.lat,
                longitud: location.lng
            });
            setActiveVisit(res); // Guardar visita activa
            setSelectedClient(null); // Cerrar info window
            alert(`✅ Visita iniciada con ${client.nombre}`);
        } catch (error) {
            console.error('Error check-in:', error);
            alert('Error al iniciar visita');
        }
    };

    const handleCheckOut = async () => {
        if (!activeVisit) return;
        try {
            const location = userLocation || { lat: 0, lng: 0 };
            await checkOutVisita({
                visita_id: activeVisit.id,
                latitud: location.lat,
                longitud: location.lng,
                resultado: checkOutData.resultado,
                notas: checkOutData.notas
            });
            setActiveVisit(null);
            setCheckOutDialogOpen(false);
            alert('🏁 Visita finalizada exitosamente');
        } catch (error) {
            console.error('Error check-out:', error);
            alert('Error al finalizar visita');
        }
    };

    const getMarkerIcon = (circuitName) => {
        const circuit = circuits.find(c => c.nombre === circuitName);
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: circuit ? circuit.color : defaultCircuitColors['General'],
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 8
        };
    };

    if (loadError) return <Box p={3}>Error Maps</Box>;
    if (!isLoaded || loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ position: 'relative', height: '100vh', bgcolor: '#f5f5f5', pb: 8 }}>
            {/* Mapa Arriba */}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={userLocation || defaultCenter}
                zoom={12}
                options={{ disableDefaultUI: true, zoomControl: true }}
            >
                {clients.map((client) => {
                    // Validar coords
                    const lat = parseFloat(client.latitud);
                    const lng = parseFloat(client.longitud);
                    if (isNaN(lat) || isNaN(lng)) return null;

                    return (
                        <Marker
                            key={client.id}
                            position={{ lat, lng }}
                            icon={getMarkerIcon(client.circuito)}
                            onClick={() => setSelectedClient(client)}
                        />
                    );
                })}
                {/* Geolocalización Usuario */}
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

            {/* Panel Flotante de Cliente Seleccionado en Mapa */}
            {selectedClient && (
                <Paper sx={{ position: 'absolute', top: '38vh', left: 16, right: 16, p: 2, borderRadius: 3, zIndex: 10 }}>
                    <Box display="flex" justifyContent="space-between">
                        <Box>
                            <Typography variant="subtitle1" fontWeight="bold">{selectedClient.nombre}</Typography>
                            <Typography variant="body2" color="text.secondary">{selectedClient.direccion}</Typography>
                        </Box>
                        {selectedClient.circuito && (
                            <Chip
                                label={selectedClient.circuito}
                                size="small"
                                sx={{
                                    bgcolor: circuits.find(cc => cc.nombre === selectedClient.circuito)?.color || '#ddd',
                                    color: 'white',
                                    fontWeight: 'bold'
                                }}
                            />
                        )}
                    </Box>
                    <Box mt={2} display="flex" gap={1}>
                        <Button
                            variant="contained"
                            fullWidth
                            color={activeVisit && activeVisit.cliente_rut === selectedClient.rut ? "success" : "primary"}
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
                    </Box>
                </Paper>
            )}

            {/* Lista Scrollable Abajo */}
            <Box sx={{ p: 2, mt: selectedClient ? 8 : 0 }}>
                <Typography variant="h6" fontWeight="bold" mb={2}>Ruta Sugerida</Typography>
                {clients.slice(0, 10).map(client => (
                    <Paper key={client.id} sx={{ p: 2, mb: 2, borderRadius: 2 }} onClick={() => setSelectedClient(client)}>
                        <Box display="flex" gap={2} alignItems="center">
                            <Box sx={{ bgcolor: '#eee', p: 1, borderRadius: '50%' }}>
                                <LocationOn color="action" />
                            </Box>
                            <Box flexGrow={1}>
                                <Typography variant="subtitle2" fontWeight="bold">{client.nombre}</Typography>
                                <Box display="flex" alignItems="center" gap={0.5}>
                                    <DirectionsCar sx={{ fontSize: '0.9rem', color: '#6B7280' }} />
                                    <Typography variant="caption" color="text.secondary">
                                        {formatDistance(client.distance)}
                                    </Typography>
                                </Box>
                            </Box>
                        </Box>
                    </Paper>
                ))}
            </Box>

            {/* Dialog Check-out */}
            <Dialog open={checkOutDialogOpen} onClose={() => setCheckOutDialogOpen(false)} fullWidth>
                <DialogTitle>Finalizar Visita</DialogTitle>
                <DialogContent>
                    <Typography variant="subtitle1" gutterBottom>Resultado:</Typography>
                    <Box display="flex" gap={1} mb={2}>
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

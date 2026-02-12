
import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Chip, Stack } from '@mui/material';
import axios from 'axios';

const containerStyle = {
    width: '100%',
    height: '600px',
    borderRadius: '12px',
    boxShadow: '0 4px 20px rgba(0,0,0,0.1)'
};

const defaultCenter = {
    lat: -33.4489,
    lng: -70.6693
};

const circuitColors = {
    'CIRCUITO NORTE': '#3498db', // Azul
    'CIRCUITO SUR': '#e74c3c',   // Rojo
    'CIRCUITO CENTRO': '#2ecc71', // Verde
    'General': '#95a5a6'
};

const VisitMapPoC = () => {
    // Safely get API Key
    const apiKey = (window._env_ && window._env_.REACT_APP_GOOGLE_MAPS_API_KEY) ||
        (typeof process !== 'undefined' && process.env && process.env.REACT_APP_GOOGLE_MAPS_API_KEY) ||
        '';

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey
    });

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            // For PoC, we point to Eduardo Rojas (ID 11) or allow all if manager
            const res = await axios.get('/api/visits/heatmap?vendedor_id=11', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (Array.isArray(res.data)) {
                setClients(res.data);
            } else {
                console.error('Heatmap data is not an array:', res.data);
                setClients([]);
            }
        } catch (err) {
            console.error('Error fetching heatmap data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getMarkerIcon = (circuit) => {
        return {
            path: window.google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            fillColor: circuitColors[circuit] || circuitColors['General'],
            fillOpacity: 1,
            strokeWeight: 2,
            strokeColor: '#ffffff',
            scale: 6
        };
    };

    if (loadError) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">Error cargando Google Maps. Verifique su API Key.</Typography>
                <Typography variant="body2" sx={{ mt: 2 }}>
                    (PoC: Los datos están listos en el backend, pero el mapa requiere una clave válida).
                </Typography>
            </Box>
        );
    }

    if (!isLoaded || loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 10 }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>Cargando Mapa de Visitas (PoC)...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5" fontWeight="700" color="primary">
                    📍 Mapa de Ruta - Proof of Concept
                </Typography>
                <Stack direction="row" spacing={1}>
                    {Object.entries(circuitColors).map(([name, color]) => (
                        <Chip key={name} label={name} size="small" sx={{ bgcolor: color, color: 'white', fontWeight: 'bold' }} />
                    ))}
                </Stack>
            </Box>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={clients.length > 0 ? { lat: parseFloat(clients[0].latitud), lng: parseFloat(clients[0].longitud) } : defaultCenter}
                zoom={11}
                options={{
                    styles: [
                        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                    ]
                }}
            >
                {clients.map((client) => (
                    <Marker
                        key={client.id}
                        position={{ lat: parseFloat(client.latitud), lng: parseFloat(client.longitud) }}
                        icon={getMarkerIcon(client.circuito)}
                        onClick={() => setSelectedClient(client)}
                        animation={window.google.maps.Animation.DROP}
                    />
                ))}

                {selectedClient && (
                    <InfoWindow
                        position={{ lat: parseFloat(selectedClient.latitud), lng: parseFloat(selectedClient.longitud) }}
                        onCloseClick={() => setSelectedClient(null)}
                    >
                        <Paper sx={{ p: 1, minWidth: 200, boxShadow: 'none' }}>
                            <Typography variant="subtitle1" fontWeight="700">{selectedClient.nombre}</Typography>
                            <Typography variant="body2" color="textSecondary">{selectedClient.rut}</Typography>
                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                                <Typography variant="caption" display="block">
                                    <strong>Circuito:</strong> {selectedClient.circuito}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    <strong>Comuna:</strong> {selectedClient.comuna}
                                </Typography>
                                <Typography variant="caption" display="block" color="error" fontWeight="bold">
                                    <strong>Deuda:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedClient.deuda_total)}
                                </Typography>
                            </Box>
                        </Paper>
                    </InfoWindow>
                )}
            </GoogleMap>
        </Box>
    );
};

export default VisitMapPoC;

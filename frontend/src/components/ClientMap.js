import React, { useState, useEffect, useCallback } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow } from '@react-google-maps/api';
import { Box, Typography, Button, Paper, CircularProgress } from '@mui/material';
import axios from 'axios';

const containerStyle = {
    width: '100%',
    height: '500px',
    borderRadius: '8px'
};

const center = {
    lat: -33.4489, // Santiago, Chile
    lng: -70.6693
};

const ClientMap = ({ onAddToRoute, selectedVendedorId }) => {
    const { isLoaded } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: process.env.REACT_APP_GOOGLE_MAPS_API_KEY
    });

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);

    const fetchHeatmapData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            const url = selectedVendedorId
                ? `/api/visits/heatmap?vendedor_id=${selectedVendedorId}`
                : '/api/visits/heatmap';

            const res = await axios.get(url, {
                headers: { Authorization: `Bearer ${token}` }
            });
            setClients(res.data);
        } catch (err) {
            console.error('Error fetching heatmap:', err);
        } finally {
            setLoading(false);
        }
    }, [selectedVendedorId]);

    useEffect(() => {
        fetchHeatmapData();
    }, [fetchHeatmapData]);

    const getMarkerColor = (score) => {
        if (score >= 80) return '#e74c3c'; // Rojo (Crítico)
        if (score >= 50) return '#e67e22'; // Naranja (Medio)
        return '#2ecc71'; // Verde (Bajo)
    };

    if (!isLoaded || loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;

    return (
        <GoogleMap
            mapContainerStyle={containerStyle}
            center={clients.length > 0 ? { lat: parseFloat(clients[0].latitud), lng: parseFloat(clients[0].longitud) } : center}
            zoom={11}
        >
            {clients.map((client) => (
                <Marker
                    key={client.id}
                    position={{ lat: parseFloat(client.latitud), lng: parseFloat(client.longitud) }}
                    icon={{
                        path: window.google.maps.SymbolPath.CIRCLE,
                        fillColor: getMarkerColor(client.heatScore),
                        fillOpacity: 0.9,
                        strokeWeight: 1,
                        strokeColor: '#fff',
                        scale: 8
                    }}
                    onClick={() => setSelectedClient(client)}
                />
            ))}

            {selectedClient && (
                <InfoWindow
                    position={{ lat: parseFloat(selectedClient.latitud), lng: parseFloat(selectedClient.longitud) }}
                    onCloseClick={() => setSelectedClient(null)}
                >
                    <Paper sx={{ p: 1, maxWidth: 200, boxShadow: 'none' }}>
                        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{selectedClient.nombre}</Typography>
                        <Typography variant="caption" display="block">Deuda: {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedClient.deuda_total)}</Typography>
                        <Typography variant="caption" display="block">Última Visita: {selectedClient.daysSinceVisit} días</Typography>
                        <Box sx={{ mt: 1, display: 'flex', justifyContent: 'space-between' }}>
                            <Button size="small" variant="contained" onClick={() => onAddToRoute(selectedClient)}>
                                Agregar
                            </Button>
                        </Box>
                    </Paper>
                </InfoWindow>
            )}
        </GoogleMap>
    );
};

export default ClientMap;

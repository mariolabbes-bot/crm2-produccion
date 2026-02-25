import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DrawingManager } from '@react-google-maps/api';
import { Box, Typography, Paper, CircularProgress, Chip, Stack, FormControl, InputLabel, Select, MenuItem, Button, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import { getHeatmapData, getCircuits, submitVisitPlan, bulkAssignCircuit } from '../api';
import { getEnv } from '../utils/env';

const libraries = ['drawing', 'geometry'];

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

const defaultCircuitColors = {
    'General': '#95a5a6'
};

const getHeatColor = (score) => {
    if (score >= 70) return '#ef4444'; // Rojo (Crítico)
    if (score >= 40) return '#f59e0b'; // Naranja (Medio)
    return '#10b981'; // Verde (Al día)
};

const getPriorityLabel = (score) => {
    if (score >= 70) return 'Alta (Crítico)';
    if (score >= 40) return 'Media';
    return 'Baja (Al día)';
};

const VisitMapPoC = () => {
    const apiKey = getEnv('REACT_APP_GOOGLE_MAPS_API_KEY');

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries: libraries
    });

    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [circuits, setCircuits] = useState([]);

    const [filterCircuit, setFilterCircuit] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');

    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    // Drawing & Bulk Assignment States
    const [drawingMode, setDrawingMode] = useState(false);
    const [drawingManager, setDrawingManager] = useState(null);
    const [polygonRef, setPolygonRef] = useState(null);
    const [selectedPolygonClients, setSelectedPolygonClients] = useState([]);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [selectedAssignCircuit, setSelectedAssignCircuit] = useState('');

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const [heatmapData, circuitsData] = await Promise.all([
                getHeatmapData(), // Traer todos los clientes del vendedor
                getCircuits().catch(() => [])
            ]);

            if (Array.isArray(heatmapData)) {
                setClients(heatmapData);
            }
            setCircuits(circuitsData);
        } catch (err) {
            console.error('Error fetching data:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const getMarkerIcon = (client) => {
        const circuit = circuits.find(c => c.nombre === client.circuito);
        const heatColor = getHeatColor(client.heatScore);

        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: circuit ? circuit.color : defaultCircuitColors['General'],
            fillOpacity: 0.9,
            strokeWeight: 4,
            strokeColor: heatColor,
            scale: 8
        };
    };

    const handleAddToRoute = async (rut) => {
        try {
            await submitVisitPlan([rut]);
            setToast({ open: true, message: 'Cliente agregado a la ruta de hoy', severity: 'success' });
            setSelectedClient(null);
        } catch (error) {
            console.error('Error adding to route:', error);
            setToast({ open: true, message: 'Error al agregar a la ruta', severity: 'error' });
        }
    };

    const filteredClients = clients.filter(c => {
        if (filterCircuit !== 'ALL' && c.circuito !== filterCircuit) return false;
        if (filterPriority === 'HIGH' && c.heatScore < 70) return false;
        if (filterPriority === 'MEDIUM' && (c.heatScore < 40 || c.heatScore >= 70)) return false;
        if (filterPriority === 'LOW' && c.heatScore >= 40) return false;
        return true;
    });

    const handlePolygonComplete = (polygon) => {
        // Find all clients inside the polygon
        const enclosedClients = filteredClients.filter((client) => {
            const latLng = new window.google.maps.LatLng(parseFloat(client.latitud), parseFloat(client.longitud));
            return window.google.maps.geometry.poly.containsLocation(latLng, polygon);
        });

        if (enclosedClients.length > 0) {
            setSelectedPolygonClients(enclosedClients);
            setSelectedAssignCircuit('');
            setAssignmentModalOpen(true);
        } else {
            setToast({ open: true, message: 'No hay clientes dentro del polígono.', severity: 'warning' });
            polygon.setMap(null); // Remove empty polygon
        }
        setPolygonRef(polygon);
        setDrawingMode(false); // Turn off drawing mode
    };

    const handleCloseAssignmentModal = () => {
        setAssignmentModalOpen(false);
        if (polygonRef) {
            polygonRef.setMap(null);
            setPolygonRef(null);
        }
    };

    const handleBulkAssign = async () => {
        if (!selectedAssignCircuit) {
            setToast({ open: true, message: 'Seleccione un circuito.', severity: 'warning' });
            return;
        }

        try {
            const ruts = selectedPolygonClients.map(c => c.rut);
            await bulkAssignCircuit(ruts, selectedAssignCircuit);
            setToast({ open: true, message: `Asignados ${ruts.length} clientes a ${selectedAssignCircuit} exitosamente.`, severity: 'success' });
            handleCloseAssignmentModal();
            fetchData(); // Refresh map data
        } catch (error) {
            console.error('Error in bulk assignment:', error);
            setToast({ open: true, message: 'Error en asignación masiva.', severity: 'error' });
        }
    };

    if (loadError) {
        return (
            <Box sx={{ p: 4, textAlign: 'center' }}>
                <Typography color="error">Error cargando Google Maps. Verifique su API Key.</Typography>
            </Box>
        );
    }

    if (!isLoaded || loading) {
        return (
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 10 }}>
                <CircularProgress size={60} />
                <Typography sx={{ mt: 2 }}>Cargando Mapa Comercial...</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ p: 2 }}>
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Typography variant="h5" fontWeight="700" color="primary">
                    📍 Rutas y Cobertura Comercial
                </Typography>

                <Stack direction="row" spacing={2} sx={{ minWidth: 300 }}>
                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Circuito</InputLabel>
                        <Select
                            value={filterCircuit}
                            label="Circuito"
                            onChange={(e) => setFilterCircuit(e.target.value)}
                        >
                            <MenuItem value="ALL">Todos los Circuitos</MenuItem>
                            {circuits.map(c => (
                                <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    <FormControl size="small" sx={{ minWidth: 150 }}>
                        <InputLabel>Prioridad (Score)</InputLabel>
                        <Select
                            value={filterPriority}
                            label="Prioridad (Score)"
                            onChange={(e) => setFilterPriority(e.target.value)}
                        >
                            <MenuItem value="ALL">Todas</MenuItem>
                            <MenuItem value="HIGH">Alta (Rojo)</MenuItem>
                            <MenuItem value="MEDIUM">Media (Naranja)</MenuItem>
                            <MenuItem value="LOW">Baja (Verde)</MenuItem>
                        </Select>
                    </FormControl>
                </Stack>
            </Box>

            <Box sx={{ mb: 2, p: 1, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Typography variant="body2" fontWeight="bold" sx={{ alignSelf: 'center' }}>Leyenda Circuitos:</Typography>
                    {circuits.map((c) => (
                        <Chip key={c.id} label={c.nombre} size="small" sx={{ bgcolor: c.color, color: 'white', fontWeight: 'bold' }} />
                    ))}
                </Box>
                <Button
                    variant={drawingMode ? "contained" : "outlined"}
                    color="secondary"
                    onClick={() => {
                        setDrawingMode(!drawingMode);
                        if (polygonRef && !drawingMode) {
                            polygonRef.setMap(null);
                            setPolygonRef(null);
                        }
                    }}
                >
                    {drawingMode ? "Cancelar Selección Múltiple" : "Selección Múltiple (Lazo)"}
                </Button>
            </Box>

            <GoogleMap
                mapContainerStyle={containerStyle}
                center={filteredClients.length > 0 ? { lat: parseFloat(filteredClients[0].latitud), lng: parseFloat(filteredClients[0].longitud) } : defaultCenter}
                zoom={11}
                options={{
                    styles: [
                        { featureType: "poi", elementType: "labels", stylers: [{ visibility: "off" }] }
                    ]
                }}
            >
                {drawingMode && (
                    <DrawingManager
                        onLoad={setDrawingManager}
                        onPolygonComplete={handlePolygonComplete}
                        options={{
                            drawingControl: false,
                            drawingControlOptions: {
                                position: window.google.maps.ControlPosition.TOP_CENTER,
                                drawingModes: ['polygon']
                            },
                            polygonOptions: {
                                fillColor: '#2196f3',
                                fillOpacity: 0.3,
                                strokeWeight: 2,
                                strokeColor: '#2196f3',
                                clickable: false,
                                editable: false,
                                zIndex: 1
                            }
                        }}
                        drawingMode={drawingMode ? 'polygon' : null}
                    />
                )}

                {filteredClients.map((client) => (
                    <Marker
                        key={client.id}
                        position={{ lat: parseFloat(client.latitud), lng: parseFloat(client.longitud) }}
                        icon={getMarkerIcon(client)}
                        onClick={() => setSelectedClient(client)}
                    />
                ))}

                {selectedClient && (
                    <InfoWindow
                        position={{ lat: parseFloat(selectedClient.latitud), lng: parseFloat(selectedClient.longitud) }}
                        onCloseClick={() => setSelectedClient(null)}
                    >
                        <Paper sx={{ p: 1, minWidth: 220, boxShadow: 'none' }}>
                            <Typography variant="subtitle1" fontWeight="700">{selectedClient.nombre}</Typography>
                            <Typography variant="body2" color="textSecondary">{selectedClient.rut}</Typography>

                            <Box sx={{ mt: 1, pt: 1, borderTop: '1px solid #eee' }}>
                                <Typography variant="caption" display="block">
                                    <strong>Circuito:</strong> {selectedClient.circuito || 'Sin asignar'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    <strong>Prioridad:</strong> <span style={{ color: getHeatColor(selectedClient.heatScore), fontWeight: 'bold' }}>{getPriorityLabel(selectedClient.heatScore)}</span> ({selectedClient.rawScore} pts)
                                </Typography>
                                <Typography variant="caption" display="block" color="error" fontWeight="bold">
                                    <strong>Deuda:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedClient.deuda_total)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    <strong>Venta Promedio 12M:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedClient.prom_ventas)}
                                </Typography>
                            </Box>

                            <Box sx={{ mt: 2, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    size="small"
                                    fullWidth
                                    onClick={() => handleAddToRoute(selectedClient.rut)}
                                >
                                    Agregar a Ruta Hoy
                                </Button>
                            </Box>
                        </Paper>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* Modal de Asignación Masiva */}
            <Dialog open={assignmentModalOpen} onClose={handleCloseAssignmentModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Asignación Masiva a Circuito</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        Has seleccionado <strong>{selectedPolygonClients.length}</strong> clientes dentro del polígono.
                    </Typography>

                    <FormControl fullWidth size="medium">
                        <InputLabel>Asignar al Circuito</InputLabel>
                        <Select
                            value={selectedAssignCircuit}
                            label="Asignar al Circuito"
                            onChange={(e) => setSelectedAssignCircuit(e.target.value)}
                        >
                            <MenuItem value="" disabled>Seleccione una opción</MenuItem>
                            {circuits.map(c => (
                                <MenuItem key={`assign-${c.id}`} value={c.nombre}>{c.nombre}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={handleCloseAssignmentModal} color="inherit">Cancelar</Button>
                    <Button onClick={handleBulkAssign} variant="contained" color="primary" disabled={!selectedAssignCircuit}>
                        Confirmar y Guardar
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={toast.open}
                autoHideDuration={4000}
                onClose={() => setToast({ ...toast, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default VisitMapPoC;


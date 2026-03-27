import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, DrawingManager } from '@react-google-maps/api';
import { useNavigate } from 'react-router-dom';
import {
    Box, Typography, Paper, CircularProgress, Chip, Stack,
    FormControl, InputLabel, Select, MenuItem, Button, Snackbar,
    Alert, Dialog, DialogTitle, DialogContent, DialogActions,
    Divider, IconButton, Tooltip, Badge
} from '@mui/material';
import {
    getHeatmapData, getCircuits, submitVisitPlan, bulkAssignCircuit,
    getVendedores, getHotCircuits, getMyVisitsToday
} from '../api';
import { useAuth } from '../contexts/AuthContext';
import { getEnv } from '../utils/env';
import RouteIcon from '@mui/icons-material/AltRoute';
import MapIcon from '@mui/icons-material/Map';
import AddLocationIcon from '@mui/icons-material/AddLocation';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import PendingIcon from '@mui/icons-material/Schedule';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';

const libraries = ['drawing', 'geometry'];

const containerStyle = { width: '100%', height: '460px', borderRadius: '12px', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' };
const defaultCenter = { lat: -33.4489, lng: -70.6693 };

const getHeatColor = (score) => {
    if (score >= 70) return '#ef4444';
    if (score >= 40) return '#f59e0b';
    return '#10b981';
};

const getPriorityLabel = (score) => {
    if (score >= 70) return 'Alta (Crítico)';
    if (score >= 40) return 'Media';
    return 'Baja (Al día)';
};

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

const VisitMapPoC = () => {
    const navigate = useNavigate();
    const apiKey = getEnv('REACT_APP_GOOGLE_MAPS_API_KEY');

    const { isLoaded, loadError } = useJsApiLoader({
        id: 'google-map-script',
        googleMapsApiKey: apiKey,
        libraries
    });

    const { user, isManager } = useAuth();

    // ─── Estado general ───────────────────────────────────────
    const [clients, setClients] = useState([]);            // heatmap: todos los clientes
    const [planHoy, setPlanHoy] = useState([]);            // visitas del día
    const [planRuts, setPlanRuts] = useState(new Set());   // RUTs en el plan
    const [loading, setLoading] = useState(true);
    const [selectedClient, setSelectedClient] = useState(null);
    const [circuits, setCircuits] = useState([]);
    const [hotRanking, setHotRanking] = useState([]);
    const [vendedores, setVendedores] = useState([]);

    // ─── Modo de vista ────────────────────────────────────────
    const [viewMode, setViewMode] = useState('ruta'); // 'ruta' | 'general'

    // ─── Filtros (solo en modo general) ──────────────────────
    const [filterVendedor, setFilterVendedor] = useState('ALL');
    const [filterCircuit, setFilterCircuit] = useState('ALL');
    const [filterPriority, setFilterPriority] = useState('ALL');

    const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

    // ─── Drawing & Bulk Assignment ─────────────────────────────
    const [drawingMode, setDrawingMode] = useState(false);
    const [polygonRef, setPolygonRef] = useState(null);
    const [selectedPolygonClients, setSelectedPolygonClients] = useState([]);
    const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
    const [selectedAssignCircuit, setSelectedAssignCircuit] = useState('');

    // ─── Fetch del plan del día ───────────────────────────────
    const fetchTodayPlan = useCallback(async () => {
        try {
            const res = await getMyVisitsToday();
            const visitas = Array.isArray(res) ? res : [];
            setPlanHoy(visitas);
            setPlanRuts(new Set(visitas.map(v => v.cliente_rut)));
        } catch (err) {
            console.error('Error cargando plan del día:', err);
        }
    }, []);

    // ─── Fetch principal ──────────────────────────────────────
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const vId = filterVendedor === 'ALL' ? null : filterVendedor;
            const [heatmapRes, circuitsRes] = await Promise.all([
                getHeatmapData(vId),
                getCircuits().catch(() => [])
            ]);

            const heatmapData = (heatmapRes && (heatmapRes.data || (Array.isArray(heatmapRes) ? heatmapRes : []))) || [];
            const circuitsData = (circuitsRes && (circuitsRes.data || (Array.isArray(circuitsRes) ? circuitsRes : []))) || [];

            setClients(Array.isArray(heatmapData) ? heatmapData : []);
            setCircuits(Array.isArray(circuitsData) ? circuitsData : []);

            const hotRes = await getHotCircuits(vId).catch(() => []);
            const hotData = (hotRes && (hotRes.data || (Array.isArray(hotRes) ? hotRes : []))) || [];
            setHotRanking(Array.isArray(hotData) ? hotData : []);

            if (isManager() && (!vendedores || vendedores.length === 0)) {
                const vRes = await getVendedores().catch(() => []);
                const vData = (vRes && (vRes.data || (Array.isArray(vRes) ? vRes : []))) || [];
                if (Array.isArray(vData)) setVendedores(vData);
            }

            await fetchTodayPlan();
        } catch (err) {
            console.error('Error fetching map data:', err);
        } finally {
            setLoading(false);
        }
    }, [filterVendedor, isManager, vendedores.length, fetchTodayPlan]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // ─── Marcadores ──────────────────────────────────────────
    const getMarkerIcon = (client) => {
        if (!window.google) return null;
        const circuit = circuits.find(c => c.nombre === client.circuito);

        // Si está en la ruta, usar color de estado
        if (planRuts.has(client.rut)) {
            const visita = planHoy.find(v => v.cliente_rut === client.rut);
            const statusColor = visita ? getStatusColor(visita.estado) : '#94a3b8';
            return {
                path: window.google.maps.SymbolPath.CIRCLE,
                fillColor: statusColor,
                fillOpacity: 1,
                strokeWeight: 3,
                strokeColor: '#ffffff',
                scale: 10
            };
        }

        const heatColor = getHeatColor(client.heatScore);
        return {
            path: window.google.maps.SymbolPath.CIRCLE,
            fillColor: circuit ? circuit.color : '#95a5a6',
            fillOpacity: 0.85,
            strokeWeight: 4,
            strokeColor: heatColor,
            scale: 8
        };
    };

    // ─── Agregar cliente a la ruta ────────────────────────────
    const handleAddToRoute = async (rut) => {
        try {
            await submitVisitPlan([rut]);
            setToast({ open: true, message: 'Cliente agregado a la ruta de hoy', severity: 'success' });
            setSelectedClient(null);
            await fetchTodayPlan();
        } catch (error) {
            setToast({ open: true, message: 'Error al agregar a la ruta', severity: 'error' });
        }
    };

    // ─── Clientes visibles en el mapa ─────────────────────────
    const filteredClients = (() => {
        if (viewMode === 'ruta') {
            // Modo ruta: mostrar solo clientes del plan que tengan coordenadas
            return clients.filter(c => planRuts.has(c.rut));
        }
        // Modo general: filtros normales
        return clients.filter(c => {
            if (filterCircuit !== 'ALL' && c.circuito !== filterCircuit) return false;
            if (filterPriority === 'HIGH' && c.heatScore < 70) return false;
            if (filterPriority === 'MEDIUM' && (c.heatScore < 40 || c.heatScore >= 70)) return false;
            if (filterPriority === 'LOW' && c.heatScore >= 40) return false;
            return true;
        });
    })();

    // ─── Lasso ────────────────────────────────────────────────
    const handlePolygonComplete = (polygon) => {
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
            polygon.setMap(null);
        }
        setPolygonRef(polygon);
        setDrawingMode(false);
    };

    const handleCloseAssignmentModal = () => {
        setAssignmentModalOpen(false);
        if (polygonRef) { polygonRef.setMap(null); setPolygonRef(null); }
    };

    const handleBulkAssign = async () => {
        if (!selectedAssignCircuit) return;
        try {
            const ruts = selectedPolygonClients.map(c => c.rut);
            await bulkAssignCircuit(ruts, selectedAssignCircuit);
            setToast({ open: true, message: `Asignados ${ruts.length} clientes a ${selectedAssignCircuit}`, severity: 'success' });
            handleCloseAssignmentModal();
            fetchData();
        } catch (error) {
            setToast({ open: true, message: 'Error en asignación masiva.', severity: 'error' });
        }
    };

    if (loadError) return <Box sx={{ p: 4, textAlign: 'center' }}><Typography color="error">Error cargando Google Maps.</Typography></Box>;
    if (!isLoaded || loading) return (
        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', p: 10 }}>
            <CircularProgress size={60} />
            <Typography sx={{ mt: 2 }}>Cargando Mapa Comercial...</Typography>
        </Box>
    );

    const pendientes = planHoy.filter(v => v.estado === 'pendiente').length;
    const completadas = planHoy.filter(v => v.estado === 'completada').length;
    const enProgreso = planHoy.find(v => v.estado === 'en_progreso');

    return (
        <Box sx={{ p: 2 }}>

            {/* ── Encabezado + Toggle de Modo ─────────────────── */}
            <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h5" fontWeight="700" color="primary">📍 Mapa en Terreno</Typography>
                    {viewMode === 'ruta' && planHoy.length > 0 && (
                        <Typography variant="body2" color="text.secondary">
                            Hoy: {completadas} completadas · {pendientes} pendientes{enProgreso ? ' · 1 en curso' : ''}
                        </Typography>
                    )}
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                    {/* Toggle Modo */}
                    <Paper elevation={0} sx={{ display: 'flex', border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                        <Button
                            startIcon={<RouteIcon />}
                            onClick={() => setViewMode('ruta')}
                            sx={{
                                px: 2, py: 1, borderRadius: 0, fontWeight: 600,
                                bgcolor: viewMode === 'ruta' ? 'primary.main' : 'transparent',
                                color: viewMode === 'ruta' ? 'white' : 'text.secondary',
                                '&:hover': { bgcolor: viewMode === 'ruta' ? 'primary.dark' : 'action.hover' }
                            }}
                        >
                            <Badge badgeContent={planHoy.length || 0} color="warning" sx={{ mr: 0.5 }}>
                                Ruta del Día
                            </Badge>
                        </Button>
                        <Divider orientation="vertical" flexItem />
                        <Button
                            startIcon={<MapIcon />}
                            onClick={() => setViewMode('general')}
                            sx={{
                                px: 2, py: 1, borderRadius: 0, fontWeight: 600,
                                bgcolor: viewMode === 'general' ? 'primary.main' : 'transparent',
                                color: viewMode === 'general' ? 'white' : 'text.secondary',
                                '&:hover': { bgcolor: viewMode === 'general' ? 'primary.dark' : 'action.hover' }
                            }}
                        >
                            Vista General
                        </Button>
                    </Paper>

                    {/* Filtros solo en modo general */}
                    {viewMode === 'general' && (
                        <Stack direction="row" spacing={1} flexWrap="wrap">
                            {isManager() && (
                                <FormControl size="small" sx={{ minWidth: 160 }}>
                                    <InputLabel>Vendedor</InputLabel>
                                    <Select value={filterVendedor} label="Vendedor" onChange={e => setFilterVendedor(e.target.value)}>
                                        <MenuItem value="ALL">Todos</MenuItem>
                                        {Array.isArray(vendedores) && vendedores.map(v => (
                                            <MenuItem key={v.id || v.rut} value={v.rut}>{v.nombre_vendedor || v.alias || v.rut}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Circuito</InputLabel>
                                <Select value={filterCircuit} label="Circuito" onChange={e => setFilterCircuit(e.target.value)}>
                                    <MenuItem value="ALL">Todos</MenuItem>
                                    {circuits.map(c => <MenuItem key={c.id} value={c.nombre}>{c.nombre}</MenuItem>)}
                                </Select>
                            </FormControl>
                            <FormControl size="small" sx={{ minWidth: 140 }}>
                                <InputLabel>Prioridad</InputLabel>
                                <Select value={filterPriority} label="Prioridad" onChange={e => setFilterPriority(e.target.value)}>
                                    <MenuItem value="ALL">Todas</MenuItem>
                                    <MenuItem value="HIGH">Alta 🔴</MenuItem>
                                    <MenuItem value="MEDIUM">Media 🟠</MenuItem>
                                    <MenuItem value="LOW">Baja 🟢</MenuItem>
                                </Select>
                            </FormControl>
                        </Stack>
                    )}
                </Stack>
            </Box>

            {/* ── Banner si no hay plan del día ───────────────── */}
            {viewMode === 'ruta' && planHoy.length === 0 && (
                <Alert
                    severity="info"
                    sx={{ mb: 2 }}
                    action={
                        <Button color="inherit" size="small" onClick={() => navigate('/planificar')}>
                            Planificar
                        </Button>
                    }
                >
                    No hay clientes en tu ruta de hoy. Cambia a Vista General para agregar clientes.
                </Alert>
            )}

            {/* ── Leyenda y controles (solo en modo general) ──── */}
            {viewMode === 'general' && (
                <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                    <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap', alignItems: 'center' }}>
                        <Typography variant="body2" fontWeight="bold">Circuitos:</Typography>
                        {circuits.map(c => (
                            <Chip key={c.id} label={c.nombre} size="small" sx={{ bgcolor: c.color, color: 'white', fontWeight: 'bold' }} />
                        ))}
                    </Box>
                    <Button
                        variant={drawingMode ? 'contained' : 'outlined'}
                        color="secondary"
                        size="small"
                        onClick={() => {
                            setDrawingMode(!drawingMode);
                            if (polygonRef && !drawingMode) { polygonRef.setMap(null); setPolygonRef(null); }
                        }}
                    >
                        {drawingMode ? 'Cancelar Lazo' : '⬡ Selección por Lazo'}
                    </Button>
                </Box>
            )}

            {/* ── Leyenda de estado (solo en modo ruta) ───────── */}
            {viewMode === 'ruta' && planHoy.length > 0 && (
                <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    {[['#94a3b8', 'Pendiente'], ['#3b82f6', 'En curso'], ['#10b981', 'Completada']].map(([color, label]) => (
                        <Box key={label} sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                            <FiberManualRecordIcon sx={{ color, fontSize: 14 }} />
                            <Typography variant="caption">{label}</Typography>
                        </Box>
                    ))}
                </Box>
            )}

            {/* ── Mapa Google ──────────────────────────────────── */}
            <GoogleMap
                mapContainerStyle={containerStyle}
                center={filteredClients.length > 0
                    ? { lat: parseFloat(filteredClients[0].latitud), lng: parseFloat(filteredClients[0].longitud) }
                    : defaultCenter}
                zoom={11}
                options={{ styles: [{ featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }] }}
            >
                {viewMode === 'general' && drawingMode && (
                    <DrawingManager
                        onPolygonComplete={handlePolygonComplete}
                        options={{
                            drawingControl: false,
                            polygonOptions: { fillColor: '#2196f3', fillOpacity: 0.3, strokeWeight: 2, strokeColor: '#2196f3', clickable: false, editable: false, zIndex: 1 }
                        }}
                        drawingMode="polygon"
                    />
                )}

                {filteredClients.map(client => (
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
                        <Paper sx={{ p: 1.5, minWidth: 220, boxShadow: 'none' }}>
                            <Typography variant="subtitle1" fontWeight="700">{selectedClient.nombre}</Typography>
                            <Typography variant="body2" color="textSecondary" gutterBottom>{selectedClient.rut}</Typography>

                            <Box sx={{ pt: 1, borderTop: '1px solid #eee' }}>
                                <Typography variant="caption" display="block">
                                    <strong>Circuito:</strong> {selectedClient.circuito || 'Sin asignar'}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    <strong>Prioridad:</strong>{' '}
                                    <span style={{ color: getHeatColor(selectedClient.heatScore), fontWeight: 'bold' }}>
                                        {getPriorityLabel(selectedClient.heatScore)}
                                    </span>
                                </Typography>
                                <Typography variant="caption" display="block" color="error" fontWeight="bold">
                                    <strong>Deuda:</strong> {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(selectedClient.deuda_total)}
                                </Typography>
                                <Typography variant="caption" display="block">
                                    <strong>Última visita:</strong> {selectedClient.daysSinceVisit < 999 ? `Hace ${selectedClient.daysSinceVisit} días` : 'Nunca'}
                                </Typography>
                            </Box>

                            <Stack spacing={1} sx={{ mt: 1.5 }}>
                                <Button variant="contained" size="small" fullWidth
                                    onClick={() => navigate(`/cliente/${selectedClient.rut}`)}>
                                    Ver Ficha del Cliente
                                </Button>
                                {!planRuts.has(selectedClient.rut) && (
                                    <Button variant="outlined" size="small" fullWidth startIcon={<AddLocationIcon />}
                                        onClick={() => handleAddToRoute(selectedClient.rut)}>
                                        Agregar a Ruta Hoy
                                    </Button>
                                )}
                            </Stack>
                        </Paper>
                    </InfoWindow>
                )}
            </GoogleMap>

            {/* ── Lista inferior: Ruta del Día ─────────────────── */}
            {viewMode === 'ruta' && planHoy.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom>
                        🗂 Clientes en la Ruta de Hoy ({planHoy.length})
                    </Typography>
                    <Box sx={{
                        display: 'flex', flexDirection: 'column', gap: 1,
                        maxHeight: 320, overflowY: 'auto',
                        pr: 1,
                        '&::-webkit-scrollbar': { width: 6 },
                        '&::-webkit-scrollbar-thumb': { bgcolor: 'rgba(0,0,0,0.15)', borderRadius: 3 }
                    }}>
                        {planHoy.map((visita, idx) => {
                            const color = getStatusColor(visita.estado);
                            return (
                                <Paper
                                    key={visita.id}
                                    elevation={0}
                                    sx={{
                                        p: 1.5, border: '1px solid', borderColor: 'divider',
                                        borderRadius: 2, display: 'flex', alignItems: 'center',
                                        gap: 2, cursor: 'pointer', transition: 'all 0.15s',
                                        '&:hover': { bgcolor: '#f0f7ff', borderColor: 'primary.main' },
                                        borderLeft: `4px solid ${color}`
                                    }}
                                    onClick={() => navigate(`/cliente/${visita.cliente_rut}`)}
                                >
                                    <Typography variant="body2" sx={{ color: 'text.disabled', minWidth: 20, fontWeight: 'bold' }}>
                                        {idx + 1}
                                    </Typography>
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography variant="body2" fontWeight="600" noWrap>
                                            {visita.cliente_nombre || visita.cliente_rut}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary" noWrap>
                                            {visita.cliente_direccion || ''}
                                        </Typography>
                                    </Box>
                                    <Chip
                                        label={getStatusLabel(visita.estado)}
                                        size="small"
                                        sx={{ bgcolor: color + '20', color: color, fontWeight: 600, border: `1px solid ${color}40` }}
                                    />
                                </Paper>
                            );
                        })}
                    </Box>
                </Box>
            )}

            {/* ── Ranking Circuitos Hot (solo en modo general) ─── */}
            {viewMode === 'general' && hotRanking.length > 0 && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="h6" fontWeight="bold" gutterBottom color="error">
                        🔥 Circuitos con Mayor Urgencia
                    </Typography>
                    <Stack direction="row" spacing={2} sx={{ overflowX: 'auto', pb: 1 }}>
                        {hotRanking.slice(0, 5).map((r, idx) => (
                            <Paper key={r.nombre} elevation={2}
                                sx={{ p: 2, minWidth: 180, borderRadius: 3, cursor: 'pointer', border: '2px solid transparent', '&:hover': { borderColor: 'error.main', bgcolor: '#fff5f5' } }}
                                onClick={() => setFilterCircuit(r.nombre)}>
                                <Typography variant="subtitle2" fontWeight="bold">#{idx + 1} {r.nombre}</Typography>
                                <Typography variant="body2" color="error" fontWeight="bold">Score: {r.avgScore}%</Typography>
                                <Typography variant="caption" color="textSecondary">{r.criticalCount} críticos de {r.count}</Typography>
                            </Paper>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* ── Modal Asignación Masiva ──────────────────────── */}
            <Dialog open={assignmentModalOpen} onClose={handleCloseAssignmentModal} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ fontWeight: 'bold', color: 'primary.main' }}>Asignación Masiva a Circuito</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="body1" sx={{ mb: 3 }}>
                        Has seleccionado <strong>{selectedPolygonClients.length}</strong> clientes dentro del polígono.
                    </Typography>
                    <FormControl fullWidth size="medium">
                        <InputLabel>Asignar al Circuito</InputLabel>
                        <Select value={selectedAssignCircuit} label="Asignar al Circuito" onChange={e => setSelectedAssignCircuit(e.target.value)}>
                            <MenuItem value="" disabled>Seleccione una opción</MenuItem>
                            {circuits.map(c => <MenuItem key={`assign-${c.id}`} value={c.nombre}>{c.nombre}</MenuItem>)}
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

            {/* ── Toast ───────────────────────────────────────── */}
            <Snackbar open={toast.open} autoHideDuration={4000} onClose={() => setToast({ ...toast, open: false })} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}>
                <Alert onClose={() => setToast({ ...toast, open: false })} severity={toast.severity} sx={{ width: '100%' }}>
                    {toast.message}
                </Alert>
            </Snackbar>
        </Box>
    );
};

export default VisitMapPoC;


import React, { useState, useEffect, useCallback } from 'react';
import { 
    Box, Typography, Paper, Grid, Checkbox, Button, Chip, 
    CircularProgress, Alert, InputBase, IconButton, TextField,
    Divider, Stack, Badge
} from '@mui/material';
import { 
    AddTask, ArrowForward, AccessTime, Search as SearchIcon, 
    CalendarMonth as CalendarIcon, CheckCircleOutline,
    PlaylistAddCheck as BulkIcon, DeleteOutline, PersonPinCircle
} from '@mui/icons-material';
import { 
    getVisitSuggestions, submitVisitPlan, getCircuits, getVisitsByDate 
} from '../api';
import { useNavigate } from 'react-router-dom';

const PlannerPage = () => {
    const navigate = useNavigate();
    
    // --- ESTADO ---
    const [suggestions, setSuggestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState([]); // Array de RUTs seleccionados para el nuevo plan
    const [existingPlan, setExistingPlan] = useState([]); // RUTs ya planificados en la BD para esa fecha
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState(null);
    const [circuits, setCircuits] = useState([]);
    const [filterCircuit, setFilterCircuit] = useState('ALL');
    
    // Fecha por defecto: hoy (formato YYYY-MM-DD)
    const todayStr = new Date().toISOString().split('T')[0];
    const [selectedDate, setSelectedDate] = useState(todayStr);

    // --- CARGA DE DATOS ---
    const loadData = useCallback(async (date) => {
        try {
            setLoading(true);
            setError(null);
            
            const [suggestionsData, circuitsData, existingPlanRes] = await Promise.all([
                getVisitSuggestions(),
                getCircuits().catch(() => []), 
                getVisitsByDate(date).catch(() => [])
            ]);

            if (Array.isArray(suggestionsData)) {
                setSuggestions(suggestionsData);
            }
            setCircuits(circuitsData);
            
            // Mapear RUTs del plan existente
            const planRuts = existingPlanRes.map(v => v.cliente_rut);
            setExistingPlan(planRuts);
            
            // Limpiar selección manual al cambiar fecha (o podríamos preservarla)
            setSelected([]);
            
        } catch (err) {
            console.error(err);
            setError('No pudimos cargar los datos de planificación.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate, loadData]);

    // --- LÓGICA DE FILTRADO ---
    const filteredSuggestions = suggestions.filter(c => {
        const matchesSearch = c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (c.direccion && c.direccion.toLowerCase().includes(searchTerm.toLowerCase()));
        const matchesCircuit = filterCircuit === 'ALL' || c.circuito === filterCircuit;
        return matchesSearch && matchesCircuit;
    });

    // --- ACCIONES ---
    const toggleSelect = (rut) => {
        if (existingPlan.includes(rut)) return; // No se puede des-seleccionar lo que ya está en la BD desde aquí (por ahora)
        
        if (selected.includes(rut)) {
            setSelected(selected.filter(id => id !== rut));
        } else {
            setSelected([...selected, rut]);
        }
    };

    const handleSelectAllInCircuit = () => {
        if (filterCircuit === 'ALL') return;
        
        const clientsInCircuit = filteredSuggestions
            .map(c => c.rut)
            .filter(rut => !existingPlan.includes(rut) && !selected.includes(rut));
            
        setSelected([...selected, ...clientsInCircuit]);
    };

    const handleConfirmPlan = async () => {
        if (selected.length === 0) return;
        try {
            setSaving(true);
            await submitVisitPlan(selected, selectedDate);
            
            // Si es para hoy, ir al mapa
            if (selectedDate === todayStr) {
                navigate('/mapa-visitas');
            } else {
                // Si es fecha futura, refrescar para mostrar que ya están guardados
                await loadData(selectedDate);
            }
        } catch (err) {
            alert('Error al guardar el plan');
        } finally {
            setSaving(false);
        }
    };

    if (loading && suggestions.length === 0) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 12, bgcolor: '#F3F4F6', minHeight: '100vh' }}>
            
            {/* Header con DatePicker */}
            <Paper elevation={0} sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #ddd', position: 'sticky', top: 0, zIndex: 10 }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box>
                        <Typography variant="h5" fontWeight="bold" color="primary">Planificar Ruta</Typography>
                        <Typography variant="body2" color="text.secondary">Organiza tus visitas por fecha.</Typography>
                    </Box>
                    <TextField
                        type="date"
                        label="Fecha de Ruta"
                        value={selectedDate}
                        onChange={(e) => setSelectedDate(e.target.value)}
                        size="small"
                        InputLabelProps={{ shrink: true }}
                        sx={{ width: 170 }}
                    />
                </Box>
                
                <Stack direction="row" spacing={1} alignItems="center">
                    <Paper sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', flex: 1, borderRadius: 3, border: '1px solid #eee', elevation: 0 }}>
                        <InputBase
                            sx={{ ml: 1, flex: 1 }}
                            placeholder="Buscar cliente recomendados..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        <IconButton sx={{ p: '10px' }}><SearchIcon /></IconButton>
                    </Paper>
                    {filterCircuit !== 'ALL' && (
                        <Button 
                            variant="outlined" 
                            size="small" 
                            startIcon={<BulkIcon />}
                            onClick={handleSelectAllInCircuit}
                            sx={{ whiteSpace: 'nowrap', borderRadius: 2 }}
                        >
                            Todo el {filterCircuit}
                        </Button>
                    )}
                </Stack>
            </Paper>

            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

            <Box p={2}>
                <Grid container spacing={3}>
                    {/* COLUMNA IZQUIERDA: CATALOGO */}
                    <Grid item xs={12} md={8}>
                        {/* Filtros de Circuito */}
                        <Box sx={{ mb: 3, display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                            <Chip
                                label="TODOS"
                                onClick={() => setFilterCircuit('ALL')}
                        color={filterCircuit === 'ALL' ? 'primary' : 'default'}
                        variant={filterCircuit === 'ALL' ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 'bold' }}
                    />
                    {circuits.map(circuit => (
                        <Chip
                            key={circuit.id}
                            label={circuit.nombre}
                            onClick={() => setFilterCircuit(circuit.nombre)}
                            sx={{
                                bgcolor: filterCircuit === circuit.nombre ? circuit.color : 'transparent',
                                color: filterCircuit === circuit.nombre ? 'white' : 'inherit',
                                borderColor: circuit.color,
                                fontWeight: 'bold'
                            }}
                            variant={filterCircuit === circuit.nombre ? 'filled' : 'outlined'}
                        />
                    ))}
                </Box>

                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', color: '#6B7280', fontSize: '0.75rem', fontWeight: 800 }}>
                    Clientes Recomendados ({filteredSuggestions?.length || 0})
                </Typography>

                {(!filteredSuggestions || filteredSuggestions.length === 0) && (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#F9FAFB', borderRadius: 4 }}>
                        <Typography variant="body1" color="text.secondary">
                            {searchTerm ? 'No hay resultados para tu búsqueda.' : 'No encontramos sugerencias automáticas.'}
                        </Typography>
                    </Paper>
                )}

                {Array.isArray(filteredSuggestions) && filteredSuggestions.map(client => {
                    const isAlreadyPlanned = existingPlan.includes(client.rut);
                    const isSelected = selected.includes(client.rut);
                    
                    const heatColor = client.heatScore >= 70 ? '#ef4444' : (client.heatScore >= 40 ? '#f59e0b' : '#10b981');
                    const priorityLabel = client.heatScore >= 70 ? 'Urgente' : (client.heatScore >= 40 ? 'Media' : 'Baja');

                    return (
                        <Paper
                            key={client.rut}
                            sx={{
                                p: 2, mb: 1.5, borderRadius: 3,
                                border: isSelected ? '2px solid #2563EB' : (isAlreadyPlanned ? '1px solid #10b981' : '1px solid transparent'),
                                bgcolor: isAlreadyPlanned ? '#F0FFF4' : (isSelected ? '#EFF6FF' : 'white'),
                                transition: 'all 0.2s',
                                opacity: isAlreadyPlanned ? 0.85 : 1,
                                cursor: isAlreadyPlanned ? 'default' : 'pointer',
                                boxShadow: isSelected ? '0 4px 12px rgba(37, 99, 235, 0.15)' : 'none'
                            }}
                            onClick={() => !isAlreadyPlanned && toggleSelect(client.rut)}
                        >
                            <Grid container alignItems="center" spacing={1}>
                                <Grid item xs={10}>
                                    <Box display="flex" alignItems="center" gap={1} mb={0.5}>
                                        <Typography variant="subtitle1" fontWeight="800" noWrap sx={{ maxWidth: '200px' }}>
                                            {client.nombre}
                                        </Typography>
                                        <Badge 
                                            badgeContent={priorityLabel} 
                                            sx={{ 
                                                '& .MuiBadge-badge': { 
                                                    bgcolor: heatColor, color: 'white', fontWeight: 900, fontSize: '0.6rem', position: 'static', transform: 'none' 
                                                } 
                                            }} 
                                        />
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block" noWrap>{client.direccion}</Typography>
                                    
                                    <Stack direction="row" spacing={1} mt={1.5} flexWrap="wrap" useFlexGap gap={1}>
                                        {client.circuito && (
                                            <Chip
                                                label={client.circuito}
                                                size="small"
                                                sx={{
                                                    fontSize: '0.6rem', height: 20,
                                                    bgcolor: circuits.find(cc => cc.nombre === client.circuito)?.color || '#ddd',
                                                    color: 'white', fontWeight: 'bold'
                                                }}
                                            />
                                        )}
                                        {client.deuda_total > 0 && (
                                            <Chip
                                                label={`Deuda: $${new Intl.NumberFormat('es-CL').format(Math.round(client.deuda_total))}`}
                                                size="small" color="error" variant="outlined" sx={{ fontSize: '0.6rem', height: 20 }}
                                            />
                                        )}
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#f59e0b' }}>
                                            <AccessTime sx={{ fontSize: '0.9rem' }} />
                                            <Typography variant="caption" fontWeight="bold">
                                                {client.daysSinceVisit < 999 ? `Hace ${client.daysSinceVisit} d.` : 'Sin visita'}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Grid>
                                <Grid item xs={2} textAlign="right">
                                    {isAlreadyPlanned ? (
                                        <CheckCircleOutline color="success" />
                                    ) : (
                                        <Checkbox
                                            checked={isSelected}
                                            onChange={() => toggleSelect(client.rut)}
                                            color="primary"
                                        />
                                    )}
                                </Grid>
                            </Grid>
                        </Paper>
                    );
                })}
                    </Grid>

                    {/* COLUMNA DERECHA: SELECCIONADOS */}
                    <Grid item xs={12} md={4}>
                        <Paper sx={{ p: 2, borderRadius: 4, position: 'sticky', top: 120, border: '1px solid #eee', bgcolor: 'white', maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
                            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    <PersonPinCircle color="primary" sx={{ verticalAlign: 'middle', mr: 1 }}/>
                                    Ruta Seleccionada ({selected.length})
                                </Typography>
                                {selected.length > 0 && (
                                    <Button size="small" color="error" onClick={() => setSelected([])}>Limpiar</Button>
                                )}
                            </Box>
                            
                            <Divider sx={{ mb: 2 }} />

                            {selected.length === 0 ? (
                                <Box textAlign="center" p={3} opacity={0.5}>
                                    <Typography variant="body2">No has seleccionado nuevos clientes para esta ruta.</Typography>
                                </Box>
                            ) : (
                                suggestions.filter(c => selected.includes(c.rut)).map(client => (
                                    <Paper key={`sel-${client.rut}`} sx={{ p: 1.5, mb: 1, bgcolor: '#F9FAFB', borderRadius: 2, border: '1px solid #E5E7EB', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight="bold" noWrap sx={{ maxWidth: 200 }}>{client.nombre}</Typography>
                                            <Typography variant="caption" color="text.secondary" display="block">{client.circuito || 'Sin circuito'}</Typography>
                                        </Box>
                                        <IconButton size="small" color="error" onClick={() => toggleSelect(client.rut)}>
                                            <DeleteOutline fontSize="small" />
                                        </IconButton>
                                    </Paper>
                                ))
                            )}

                            {existingPlan.length > 0 && (
                                <Box mt={3}>
                                    <Typography variant="caption" fontWeight="bold" color="text.secondary">
                                        YA PLANIFICADOS EN ESTE DÍA ({existingPlan.length})
                                    </Typography>
                                    <Box mt={1}>
                                    {existingPlan.map((rut, idx) => {
                                        const c = suggestions.find(s => s.rut === rut);
                                        return (
                                            <Typography key={`ext-${rut}`} variant="caption" display="block" color="success.main" sx={{ mb: 0.5 }}>
                                                ✓ {c ? c.nombre : rut}
                                            </Typography>
                                        );
                                    })}
                                    </Box>
                                </Box>
                            )}
                        </Paper>
                    </Grid>
                </Grid>
            </Box>

            {/* BARRA DE ACCIÓN FLOTANTE */}
            <Paper
                elevation={10}
                sx={{
                    position: 'fixed', bottom: 0, left: 0, right: 0, p: 2, zIndex: 100,
                    borderRadius: '24px 24px 0 0', borderTop: '1px solid #eee'
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Box>
                        <Typography variant="subtitle1" fontWeight="800" color="primary">
                            {selected.length} nuevos seleccionados
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            {existingPlan.length} ya en el plan de este día
                        </Typography>
                    </Box>
                    <Button
                        variant="contained"
                        size="large"
                        endIcon={saving ? <CircularProgress size={20} color="inherit" /> : <ArrowForward />}
                        disabled={selected.length === 0 || saving}
                        onClick={handleConfirmPlan}
                        sx={{ 
                            borderRadius: 4, px: 4, py: 1.5, fontWeight: 'bold',
                            boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)'
                        }}
                    >
                        {selectedDate === todayStr ? 'INICIAR RUTA' : 'GUARDAR PLAN'}
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default PlannerPage;

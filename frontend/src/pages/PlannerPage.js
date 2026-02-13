
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Checkbox, Button, Chip, CircularProgress, Alert, InputBase, IconButton } from '@mui/material';
import { AddTask, ArrowForward, AccessTime, Search as SearchIcon } from '@mui/icons-material';
import { getVisitSuggestions, submitVisitPlan } from '../api';
import { useNavigate } from 'react-router-dom';

const PlannerPage = () => {
    const navigate = useNavigate();
    const [suggestions, setSuggestions] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [selected, setSelected] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Filter logic
    const filteredSuggestions = suggestions.filter(c =>
        c.nombre.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.direccion && c.direccion.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    useEffect(() => {
        const fetchSuggestions = async () => {
            try {
                const data = await getVisitSuggestions();
                if (Array.isArray(data)) {
                    setSuggestions(data);
                }
            } catch (err) {
                console.error(err);
                setError('No pudimos cargar las sugerencias.');
            } finally {
                setLoading(false);
            }
        };
        fetchSuggestions();
    }, []);

    const toggleSelect = (rut) => {
        if (selected.includes(rut)) {
            setSelected(selected.filter(id => id !== rut));
        } else {
            setSelected([...selected, rut]);
        }
    };

    const handleConfirmPlan = async () => {
        if (selected.length === 0) return;
        try {
            await submitVisitPlan(selected);
            navigate('/'); // Volver al Home, que ahora mostrará la ruta planificada
        } catch (err) {
            alert('Error al guardar el plan');
        }
    };

    if (loading) return <Box p={5} display="flex" justifyContent="center"><CircularProgress /></Box>;

    return (
        <Box sx={{ pb: 10, bgcolor: '#F3F4F6', minHeight: '100vh' }}>
            <Box sx={{ p: 2, bgcolor: 'white', borderBottom: '1px solid #ddd' }}>
                <Typography variant="h5" fontWeight="bold">Planifica tu Día</Typography>
                <Typography variant="body2" color="text.secondary">Selecciona los clientes que visitarás hoy.</Typography>
            </Box>

            {error && <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>}

            <Box p={2}>
                {/* Search Bar */}
                <Paper sx={{ p: '2px 4px', display: 'flex', alignItems: 'center', mb: 2, borderRadius: 3 }}>
                    <InputBase
                        sx={{ ml: 1, flex: 1 }}
                        placeholder="Buscar cliente..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    <IconButton sx={{ p: '10px' }}>
                        <SearchIcon />
                    </IconButton>
                </Paper>

                <Typography variant="subtitle2" sx={{ mb: 2, textTransform: 'uppercase', color: '#6B7280' }}>
                    Sugerencias ({filteredSuggestions?.length || 0})
                </Typography>

                {(!filteredSuggestions || filteredSuggestions.length === 0) && (
                    <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#F9FAFB' }}>
                        <Typography variant="body1" color="text.secondary">
                            {searchTerm ? 'No hay resultados para tu búsqueda.' : 'No encontramos sugerencias automáticas para hoy.'}
                        </Typography>
                        {!searchTerm && (
                            <Button sx={{ mt: 2 }} variant="outlined" onClick={() => window.location.reload()}>
                                Reintentar
                            </Button>
                        )}
                    </Paper>
                )}

                {Array.isArray(filteredSuggestions) && filteredSuggestions.map(client => (
                    <Paper
                        key={client.rut}
                        sx={{
                            p: 2,
                            mb: 2,
                            borderRadius: 3,
                            border: selected.includes(client.rut) ? '2px solid #2563EB' : '1px solid transparent',
                            bgcolor: selected.includes(client.rut) ? '#EFF6FF' : 'white',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => toggleSelect(client.rut)}
                    >
                        <Grid container alignItems="center">
                            <Grid item xs={10}>
                                <Typography variant="subtitle1" fontWeight="bold">{client.nombre}</Typography>
                                <Typography variant="caption" color="text.secondary" display="block">{client.direccion}, {client.comuna}</Typography>
                                <Box mt={1} display="flex" gap={1}>
                                    {client.circuito && <Chip label={client.circuito} size="small" sx={{ fontSize: '0.6rem' }} />}
                                    <Chip
                                        icon={<AccessTime sx={{ fontSize: '1rem !important' }} />}
                                        label="Sin visita hoy"
                                        size="small"
                                        color="warning"
                                        variant="outlined"
                                        sx={{ fontSize: '0.6rem' }}
                                    />
                                </Box>
                            </Grid>
                            <Grid item xs={2} textAlign="right">
                                <Checkbox
                                    checked={selected.includes(client.rut)}
                                    onChange={() => toggleSelect(client.rut)}
                                    color="primary"
                                />
                            </Grid>
                        </Grid>
                    </Paper>
                ))}
            </Box>

            {/* Floating Action Bar */}
            <Paper
                elevation={10}
                sx={{
                    position: 'fixed',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    p: 2,
                    zIndex: 100,
                    borderRadius: '20px 20px 0 0'
                }}
            >
                <Box display="flex" justifyContent="space-between" alignItems="center">
                    <Typography variant="subtitle1" fontWeight="bold">
                        {selected.length} clientes seleccionados
                    </Typography>
                    <Button
                        variant="contained"
                        endIcon={<ArrowForward />}
                        disabled={selected.length === 0}
                        onClick={handleConfirmPlan}
                        sx={{ borderRadius: 5, px: 3 }}
                    >
                        INICIAR RUTA
                    </Button>
                </Box>
            </Paper>
        </Box>
    );
};

export default PlannerPage;

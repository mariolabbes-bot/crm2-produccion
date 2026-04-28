import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Grid, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, Avatar,
    IconButton, Button, Tooltip, CircularProgress, Alert,
    Stack, Divider, Dialog, DialogTitle, DialogContent, AppBar, Toolbar
} from '@mui/material';
import { 
    ChevronLeft, ChevronRight, Visibility, 
    CheckCircle, HighlightOff, AccessTime, LocationOff,
    TrendingUp, Group as GroupIcon, Close as CloseIcon,
    LocationOn, Message
} from '@mui/icons-material';
import moment from 'moment';
import 'moment/locale/es';
import { getSupervisionData, getSellerSupervisionDetail } from '../../api';

moment.locale('es');

const SupervisionDashboard = () => {
    const [selectedDate, setSelectedDate] = useState(moment());
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [detailOpen, setDetailOpen] = useState(false);
    const [selectedSeller, setSelectedSeller] = useState(null);
    const [sellerVisits, setSellerVisits] = useState([]);
    const [loadingDetail, setLoadingDetail] = useState(false);

    const loadData = async (date) => {
        setLoading(true);
        setError(null);
        try {
            const formattedDate = date.format('YYYY-MM-DD');
            const res = await getSupervisionData(formattedDate);
            setData(Array.isArray(res) ? res : []);
            if (!Array.isArray(res)) {
                setError('La respuesta del servidor no tiene el formato esperado.');
            }
        } catch (err) {
            console.error('Error loading supervision data:', err);
            setError('Error al cargar datos de supervisión');
        } finally {
            setLoading(false);
        }
    };

    const loadSellerDetail = async (vendedorId) => {
        setLoadingDetail(true);
        try {
            const formattedDate = selectedDate.format('YYYY-MM-DD');
            const res = await getSellerSupervisionDetail(vendedorId, formattedDate);
            setSellerVisits(res || []);
        } catch (err) {
            console.error('Error loading seller detail:', err);
        } finally {
            setLoadingDetail(false);
        }
    };

    useEffect(() => {
        loadData(selectedDate);
    }, [selectedDate]);

    // Generar días para el selector (una semana alrededor de la fecha seleccionada)
    const renderCalendarStrip = () => {
        const days = [];
        for (let i = -3; i <= 3; i++) {
            days.push(moment(selectedDate).add(i, 'days'));
        }

        return (
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 3, gap: 1 }}>
                <IconButton onClick={() => setSelectedDate(moment(selectedDate).subtract(1, 'day'))}>
                    <ChevronLeft />
                </IconButton>
                {days.map((day) => {
                    const isSelected = day.isSame(selectedDate, 'day');
                    const isToday = day.isSame(moment(), 'day');
                    return (
                        <Paper
                            key={day.format('DD-MM')}
                            onClick={() => setSelectedDate(day)}
                            sx={{
                                p: 1,
                                minWidth: 60,
                                textAlign: 'center',
                                cursor: 'pointer',
                                border: isSelected ? '2px solid #6366f1' : '1px solid #e2e8f0',
                                bgcolor: isSelected ? '#eef2ff' : 'white',
                                transition: 'all 0.2s',
                                '&:hover': { transform: 'scale(1.05)', boxShadow: 1 }
                            }}
                            elevation={isSelected ? 2 : 0}
                        >
                            <Typography variant="caption" sx={{ display: 'block', fontWeight: 600, color: isSelected ? '#6366f1' : 'text.secondary' }}>
                                {day.format('ddd').toUpperCase()}
                            </Typography>
                            <Typography variant="h6" sx={{ fontWeight: 700, color: isSelected ? '#1e1b4b' : 'text.primary' }}>
                                {day.format('D')}
                            </Typography>
                            {isToday && <Box sx={{ width: 4, height: 4, borderRadius: '50%', bgcolor: '#6366f1', mx: 'auto', mt: 0.5 }} />}
                        </Paper>
                    );
                })}
                <IconButton onClick={() => setSelectedDate(moment(selectedDate).add(1, 'day'))}>
                    <ChevronRight />
                </IconButton>
            </Box>
        );
    };

    if (error) return <Alert severity="error">{error}</Alert>;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box>
                    <Typography variant="h6" fontWeight="bold" color="#1e293b">Supervisión Diaria de Equipo</Typography>
                    <Typography variant="body2" color="text.secondary">Seguimiento en tiempo real de actividades en terreno</Typography>
                </Box>
                <Button 
                    variant="outlined" 
                    startIcon={<GroupIcon />} 
                    onClick={() => loadData(selectedDate)}
                    disabled={loading}
                >
                    Actualizar
                </Button>
            </Box>

            {renderCalendarStrip()}

            {loading ? (
                <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
            ) : (
                <TableContainer component={Paper} sx={{ borderRadius: 3, border: '1px solid #e2e8f0', boxShadow: 'none' }}>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f8fafc' }}>
                            <TableRow>
                                <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Cumplimiento</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Actividades</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Alertas</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Horario Inicio/Fin</TableCell>
                                <TableCell align="center" sx={{ fontWeight: 700 }}>Detalle</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {data.map((row) => {
                                const cumplimiento = row.planificadas > 0 
                                    ? Math.round((row.completadas / row.planificadas) * 100) 
                                    : (row.completadas > 0 ? 100 : 0);
                                
                                return (
                                    <TableRow key={row.vendedor_id} hover>
                                        <TableCell>
                                            <Box display="flex" alignItems="center" gap={1.5}>
                                                <Avatar sx={{ bgcolor: '#6366f1', width: 32, height: 32, fontSize: '0.9rem' }}>
                                                    {row.nombre?.charAt(0)}
                                                </Avatar>
                                                <Box>
                                                    <Typography variant="subtitle2" fontWeight="bold">{row.nombre}</Typography>
                                                    <Typography variant="caption" color="text.secondary">{row.rut}</Typography>
                                                </Box>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Tooltip title={`${row.completadas} completadas de ${row.planificadas} planificadas`}>
                                                <Chip 
                                                    label={`${cumplimiento}%`} 
                                                    color={cumplimiento >= 80 ? 'success' : cumplimiento >= 50 ? 'warning' : 'default'}
                                                    size="small"
                                                    sx={{ fontWeight: 700, px: 1 }}
                                                />
                                            </Tooltip>
                                        </TableCell>
                                        <TableCell align="center">
                                            <Stack direction="row" spacing={0.5} justifyContent="center">
                                                <Chip icon={<CheckCircle sx={{ fontSize: '14px !important' }} />} label={row.completadas} size="small" variant="outlined" />
                                                <Chip icon={<HighlightOff sx={{ fontSize: '14px !important' }} />} label={parseInt(row.total_actividades) - parseInt(row.completadas)} size="small" variant="outlined" />
                                            </Stack>
                                        </TableCell>
                                        <TableCell align="center">
                                            {row.fuera_geocerca > 0 && (
                                                <Tooltip title={`${row.fuera_geocerca} check-ins fuera de geocerca`}>
                                                    <Chip 
                                                        icon={<LocationOff sx={{ fontSize: '14px !important' }} />} 
                                                        label={row.fuera_geocerca} 
                                                        color="error" 
                                                        size="small"
                                                        sx={{ fontWeight: 700 }}
                                                    />
                                                </Tooltip>
                                            )}
                                            {row.fuera_geocerca === 0 && <Typography variant="caption" color="success.main">OK</Typography>}
                                        </TableCell>
                                        <TableCell align="center">
                                            <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                                                <AccessTime sx={{ fontSize: 16, color: 'text.secondary' }} />
                                                <Typography variant="caption" fontWeight="medium">
                                                    {row.primera_visita?.substring(0,5) || '--'} - {row.ultima_visita?.substring(0,5) || '--'}
                                                </Typography>
                                            </Box>
                                        </TableCell>
                                        <TableCell align="center">
                                            <IconButton 
                                                size="small" 
                                                color="primary"
                                                onClick={() => {
                                                    setSelectedSeller(row);
                                                    setDetailOpen(true);
                                                    loadSellerDetail(row.vendedor_id);
                                                }}
                                            >
                                                <Visibility />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                            {data.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                        <Typography variant="body2" color="text.secondary">No hay actividad registrada para este día.</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* Modal Detalle Vendedor */}
            <Dialog fullScreen open={detailOpen} onClose={() => setDetailOpen(false)}>
                <AppBar sx={{ position: 'relative', bgcolor: '#1e293b' }}>
                    <Toolbar>
                        <IconButton edge="start" color="inherit" onClick={() => setDetailOpen(false)}>
                            <CloseIcon />
                        </IconButton>
                        <Typography sx={{ ml: 2, flex: 1 }} variant="h6" component="div">
                            Gestión Diaria: {selectedSeller?.nombre} - {selectedDate.format('LL')}
                        </Typography>
                    </Toolbar>
                </AppBar>
                <DialogContent sx={{ bgcolor: '#f1f5f9', p: 3 }}>
                    {loadingDetail ? (
                        <Box display="flex" justifyContent="center" py={10}><CircularProgress /></Box>
                    ) : (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                                <Paper sx={{ p: 3, borderRadius: 3 }}>
                                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Resumen del Día</Typography>
                                    <Stack spacing={2} sx={{ mt: 2 }}>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">Total Actividades</Typography>
                                            <Typography variant="body2" fontWeight="bold">{sellerVisits.length}</Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">Completadas</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="success.main">
                                                {sellerVisits.filter(v => v.estado === 'completada').length}
                                            </Typography>
                                        </Box>
                                        <Box display="flex" justifyContent="space-between">
                                            <Typography variant="body2" color="text.secondary">Fuera Geocerca</Typography>
                                            <Typography variant="body2" fontWeight="bold" color="error.main">
                                                {sellerVisits.filter(v => v.distancia_checkin > 500).length}
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </Paper>
                            </Grid>
                            <Grid item xs={12} md={8}>
                                <Stack spacing={2}>
                                    {sellerVisits.map((v, idx) => (
                                        <Paper key={idx} sx={{ p: 2, borderRadius: 2, borderLeft: `5px solid ${v.estado === 'completada' ? '#10b981' : '#94a3b8'}` }}>
                                            <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                                <Box>
                                                    <Typography variant="subtitle1" fontWeight="bold">
                                                        {v.tipo_evento === 'ruta' ? (v.cliente_nombre || 'Sin nombre') : v.titulo}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', mt: 0.5 }}>
                                                        <LocationOn sx={{ fontSize: 14, mr: 0.5 }} />
                                                        {v.tipo_evento === 'ruta' ? v.cliente_direccion : 'Actividad Interna'}
                                                    </Typography>
                                                </Box>
                                                <Chip 
                                                    label={v.estado.toUpperCase()} 
                                                    size="small" 
                                                    color={v.estado === 'completada' ? 'success' : 'default'}
                                                />
                                            </Box>
                                            <Divider sx={{ my: 1.5 }} />
                                            <Grid container spacing={2}>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Inicio</Typography>
                                                    <Typography variant="body2" fontWeight="medium">{v.hora_inicio?.substring(0,5) || '--'}</Typography>
                                                </Grid>
                                                <Grid item xs={6} md={3}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Fin</Typography>
                                                    <Typography variant="body2" fontWeight="medium">{v.hora_fin?.substring(0,5) || '--'}</Typography>
                                                </Grid>
                                                <Grid item xs={12} md={6}>
                                                    <Typography variant="caption" color="text.secondary" display="block">Resultado/Notas</Typography>
                                                    <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                                                        {v.resultado || v.notas || 'Sin comentarios'}
                                                    </Typography>
                                                </Grid>
                                            </Grid>
                                            {v.distancia_checkin > 500 && (
                                                <Box sx={{ mt: 1.5, p: 1, bgcolor: '#fef2f2', borderRadius: 1, border: '1px solid #fee2e2' }}>
                                                    <Typography variant="caption" color="error" fontWeight="bold">
                                                        ⚠️ Check-in realizado a {Math.round(v.distancia_checkin)}m del cliente.
                                                    </Typography>
                                                </Box>
                                            )}
                                        </Paper>
                                    ))}
                                    {sellerVisits.length === 0 && <Alert severity="info">No hay actividades para este día.</Alert>}
                                </Stack>
                            </Grid>
                        </Grid>
                    )}
                </DialogContent>
            </Dialog>
        </Box>
    );
};

export default SupervisionDashboard;

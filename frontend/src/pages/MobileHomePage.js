
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, IconButton } from '@mui/material';
import { LocationOn, DirectionsCar, CheckCircle, Warning, ArrowForwardIos } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getKpisMesActual, getMyVisitsToday } from '../api';
import KPICard from '../components/KPICard';
import { useNavigate } from 'react-router-dom';

/**
 * MobileHomePage - Dashboard "Mi Ruta" para Vendedores
 * Diseño Fase 2: Timeline de Actividades y Next Stop
 */
const MobileHomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [stats, setStats] = useState({ ventas: 0, meta: 15000000 });
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMobileData = async () => {
            try {
                // 1. KPIs
                const kpiData = await getKpisMesActual({ _t: Date.now() });
                setStats({
                    ventas: kpiData.monto_ventas_mes || 0,
                    meta: 15000000
                });

                // 2. Timeline (Visitas del día)
                const visitsData = await getMyVisitsToday();
                if (Array.isArray(visitsData)) {
                    setTimeline(visitsData);
                }

            } catch (error) {
                console.error('Error mobile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMobileData();
    }, []);

    const nextStop = timeline.find(v => v.estado === 'pendiente' || v.estado === 'en_progreso');
    const completedCount = timeline.filter(v => v.estado === 'completada').length;
    const totalCount = timeline.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Si no hay visitas planificadas, mostrar Prompt de Planificación
    if (!loading && timeline.length === 0) {
        return (
            <Box sx={{ minHeight: '80vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', p: 3, textAlign: 'center' }}>
                <img src="https://cdni.iconscout.com/illustration/premium/thumb/planning-schedule-4438814-3718492.png" alt="Planning" style={{ width: 200, marginBottom: 20, opacity: 0.8 }} />
                <Typography variant="h5" fontWeight="bold" gutterBottom>¡Buenos días, {user?.nombre?.split(' ')[0]}!</Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Aún no tienes una ruta definida para hoy. Comencemos planificando tu día.
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    fullWidth
                    sx={{ borderRadius: 5, mt: 2, py: 1.5 }}
                    onClick={() => navigate('/planificar')}
                >
                    PLANIFICAR MI DÍA
                </Button>
            </Box>
        );
    }

    return (
        <Box sx={{ pb: 10, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Header Timeline */}
            <Paper elevation={0} sx={{ p: 3, bgcolor: 'white', borderRadius: '0 0 24px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="h6" fontWeight="bold">Tu Progreso</Typography>
                    <Chip label={`${completedCount}/${totalCount} Visitas`} color="primary" size="small" />
                </Box>
                <Box sx={{ width: '100%', height: 8, bgcolor: '#F3F4F6', borderRadius: 4, overflow: 'hidden' }}>
                    <Box sx={{ width: `${progress}%`, height: '100%', bgcolor: '#10B981', transition: 'width 1s ease' }} />
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Ventas acumulada hoy: <strong>{new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(stats.ventas)}</strong>
                </Typography>
            </Paper>

            <Box sx={{ p: 2 }}>

                {/* NEXT STOP CARD (Destacada) */}
                {nextStop ? (
                    <Box sx={{ mb: 4 }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'uppercase', color: '#6B7280', letterSpacing: 1 }}>Siguiente Parada</Typography>
                        <Paper
                            elevation={4}
                            sx={{
                                p: 2,
                                borderRadius: 4,
                                borderLeft: '6px solid #2563EB',
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                        >
                            <Box sx={{ position: 'absolute', top: 0, right: 0, p: 1, bgcolor: '#EFF6FF', borderRadius: '0 0 0 12px' }}>
                                <Typography variant="caption" fontWeight="bold" color="primary">PRIORIDAD ALTA</Typography>
                            </Box>

                            <Typography variant="h6" fontWeight="bold" sx={{ mt: 1 }}>{nextStop.cliente_nombre}</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{nextStop.cliente_direccion}</Typography>

                            <Grid container spacing={1}>
                                <Grid item xs={6}>
                                    <Button
                                        variant="outlined"
                                        fullWidth
                                        startIcon={<LocationOn />}
                                        onClick={() => window.open(`https://waze.com/ul?q=${nextStop.cliente_direccion}`, '_blank')}
                                    >
                                        Navegar
                                    </Button>
                                </Grid>
                                <Grid item xs={6}>
                                    <Button
                                        variant="contained"
                                        fullWidth
                                        startIcon={<CheckCircle />}
                                        onClick={() => navigate('/mapa-visitas')} // Idealmente a modo visita directa
                                        sx={{ boxShadow: 'none' }}
                                    >
                                        Llegué
                                    </Button>
                                </Grid>
                            </Grid>
                        </Paper>
                    </Box>
                ) : (
                    <Paper sx={{ p: 3, textAlign: 'center', mb: 4, bgcolor: '#ECFDF5', color: '#065F46' }}>
                        <Typography variant="h6" fontWeight="bold">🎉 ¡Ruta Completada!</Typography>
                        <Typography variant="body2">Has finalizado todas tus visitas de hoy.</Typography>
                    </Paper>
                )}

                {/* TIMELINE (Resto de visitas) */}
                <Typography variant="subtitle2" sx={{ mb: 1, textTransform: 'uppercase', color: '#6B7280', letterSpacing: 1 }}>Línea de Tiempo</Typography>
                <div style={{ position: 'relative', paddingLeft: 10 }}>
                    {/* Línea vertical conectora */}
                    <div style={{ position: 'absolute', left: 24, top: 0, bottom: 0, width: 2, background: '#E5E7EB', zIndex: 0 }} />

                    {timeline.map((visita, index) => {
                        const isCompleted = visita.estado === 'completada';
                        const isNext = visita.id === nextStop?.id;
                        const isPending = visita.estado === 'pendiente' && !isNext;

                        return (
                            <Box key={visita.id} sx={{ display: 'flex', mb: 2, position: 'relative', zIndex: 1, opacity: isNext ? 0.5 : 1 }}>
                                {/* Icono Timeline */}
                                <Box sx={{
                                    mr: 2,
                                    mt: 0.5,
                                    width: 32,
                                    height: 32,
                                    borderRadius: '50%',
                                    bgcolor: isCompleted ? '#10B981' : (isNext ? '#2563EB' : 'white'),
                                    border: `2px solid ${isCompleted ? '#10B981' : (isNext ? '#2563EB' : '#D1D5DB')}`,
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    color: isCompleted || isNext ? 'white' : '#9CA3AF',
                                    flexShrink: 0
                                }}>
                                    {isCompleted ? <CheckCircle fontSize="small" /> : <DirectionsCar fontSize="small" />}
                                </Box>

                                {/* Contenido */}
                                <Paper
                                    onClick={() => !isCompleted && navigate('/mapa-visitas')}
                                    sx={{
                                        flexGrow: 1,
                                        p: 2,
                                        borderRadius: 3,
                                        border: isNext ? '1px solid #BFDBFE' : 'none',
                                        bgcolor: isCompleted ? '#F9FAFB' : 'white'
                                    }}
                                >
                                    <Box display="flex" justifyContent="space-between">
                                        <Typography variant="subtitle2" fontWeight="bold" color={isCompleted ? 'text.secondary' : 'text.primary'}>
                                            {visita.cliente_nombre}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="bold" color={isCompleted ? 'success.main' : 'text.disabled'}>
                                            {visita.hora_inicio ? visita.hora_inicio.substring(0, 5) : '--:--'}
                                        </Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" display="block">
                                        {visita.cliente_direccion}
                                    </Typography>
                                </Paper>
                            </Box>
                        );
                    })}
                </div>

            </Box>
        </Box>
    );
};

export default MobileHomePage;



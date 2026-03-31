
import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, IconButton } from '@mui/material';
import { getKpisMesActual, getMyVisitsToday, getSaldoCreditoTotal, getActiveVisit, checkOut } from '../api';
import MobileKPICard from '../components/MobileKPICard';
import { ShoppingCart, Payment, AccountBalanceWallet, Map, AltRoute, ExitToApp, MoreHoriz, ArrowForwardIos, LocationOn, CheckCircle, DirectionsCar, Schedule } from '@mui/icons-material';
import { Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

/**
 * MobileHomePage - Dashboard "Mi Ruta" para Vendedores
 * Diseño Fase 2: Timeline de Actividades y Next Stop
 */
const MobileHomePage = () => {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [kpis, setKpis] = useState({
        ventasMes: 0,
        abonosMes: 0,
        saldoTotal: 0,
        trendVentas: 0
    });
    const [timeline, setTimeline] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeVisit, setActiveVisit] = useState(null);
    const [checkOutDialogOpen, setCheckOutDialogOpen] = useState(false);
    const [checkOutData, setCheckOutData] = useState({ resultado: 'venta', notas: '' });

    useEffect(() => {
        const fetchMobileData = async () => {
            try {
                // 1. KPIs Personales
                const kpiData = await getKpisMesActual({ _t: Date.now() });
                const saldoData = await getSaldoCreditoTotal();

                const d = kpiData.data || kpiData;
                const s = saldoData.data || saldoData;

                setKpis({
                    ventasMes: d.monto_ventas_mes || 0,
                    abonosMes: d.monto_abonos_mes || 0,
                    saldoTotal: s.total_saldo_credito || 0,
                    trendVentas: d.variacion_vs_anio_anterior_pct || 0
                });

                // 2. Timeline (Visitas del día)
                const visitsData = await getMyVisitsToday();
                if (Array.isArray(visitsData)) {
                    setTimeline(visitsData);
                }

                // 3. Obtener Visita Activa
                try {
                    const activeRes = await getActiveVisit();
                    if (activeRes && activeRes.id) {
                        setActiveVisit(activeRes);
                    }
                } catch (e) {
                    console.log('Sin visita activa');
                }

            } catch (error) {
                console.error('Error mobile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMobileData();
    }, []);

    const handleCheckOut = async () => {
        if (!activeVisit) return;
        try {
            await checkOut(
                activeVisit.id,
                0, // latitud (opcional si no hay gps a mano aquí)
                0, // longitud
                checkOutData.resultado,
                checkOutData.notas
            );
            setActiveVisit(null);
            setCheckOutDialogOpen(false);
            alert('🏁 Visita finalizada exitosamente');
            // Opcional: recargar timeline
            const visitsData = await getMyVisitsToday();
            if (Array.isArray(visitsData)) setTimeline(visitsData);
        } catch (error) {
            console.error('Error check-out:', error);
            alert('Error al finalizar visita');
        }
    };

    const nextStop = timeline.find(v => v.estado === 'pendiente' || v.estado === 'en_progreso');
    const completedCount = timeline.filter(v => v.estado === 'completada').length;
    const totalCount = timeline.length;
    const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

    // Si no hay visitas planificadas, mostrar Prompt de Planificación
    const formatCLP = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    return (
        <Box sx={{ pb: 10, bgcolor: '#F9FAFB', minHeight: '100vh', pt: 2, px: 2 }}>
            {/* Header Saludo */}
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3} px={1}>
                <Box>
                    <Typography variant="h5" fontWeight="800">Hola, {user?.nombre?.split(' ')[0]}</Typography>
                    <Typography variant="caption" color="text.secondary" fontWeight="600">PANEL DE VENTA INDIVIDUAL</Typography>
                </Box>
                <IconButton color="default" sx={{ bgcolor: 'white', border: '1px solid #E5E7EB' }} onClick={() => logout()}>
                    <ExitToApp />
                </IconButton>
            </Box>

            {/* KPIs en tarjetas horizontales con efecto carrusel */}
            <Box sx={{ 
                display: 'flex', 
                gap: 2, 
                overflowX: 'auto', 
                pb: 2, 
                px: 1,
                mx: -1,
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { display: 'none' },
                msOverflowStyle: 'none',
                scrollbarWidth: 'none'
            }}>
                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Mi Venta del Mes"
                        value={formatCLP(kpis.ventasMes)}
                        progress={(kpis.ventasMes / 25000000) * 100}
                        subtitle="Meta Individual: 25M"
                        trend={kpis.trendVentas}
                        color="#2563EB"
                        icon={<ShoppingCart />}
                        loading={loading}
                    />
                </Box>

                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Mis Cobros"
                        value={formatCLP(kpis.abonosMes)}
                        subtitle={`${((kpis.abonosMes / (kpis.ventasMes || 1)) * 100).toFixed(1)}% de mis ventas`}
                        color="#10B981"
                        icon={<Payment />}
                        loading={loading}
                    />
                </Box>

                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Deuda de mi Cartera"
                        value={formatCLP(kpis.saldoTotal)}
                        subtitle="Pendiente por cobrar"
                        color="#E57A2D"
                        icon={<AccountBalanceWallet />}
                        loading={loading}
                    />
                </Box>
            </Box>

            {/* SECCIÓN ESTRATEGIA DE RUTA */}
            <Typography variant="subtitle2" sx={{ mt: 3, mb: 1, textTransform: 'uppercase', color: '#6B7280', fontWeight: 'bold' }}>Estrategia de Ruta</Typography>
            <Paper sx={{ p: 2, borderRadius: 4, mb: 4, display: 'flex', gap: 2, alignItems: 'center' }} onClick={() => navigate('/mapa-visitas')}>
                <Box sx={{ bgcolor: '#EFF6FF', p: 1.5, borderRadius: 3 }}>
                    <Map color="primary" />
                </Box>
                <Box flexGrow={1}>
                    <Typography variant="subtitle2" fontWeight="bold">Heatmap de Oportunidades</Typography>
                    <Typography variant="caption" color="text.secondary">Ver zonas con mayor potencial de cobro</Typography>
                </Box>
                <ArrowForwardIos fontSize="small" sx={{ color: '#9CA3AF' }} />
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

            {/* Indicador Visita Activa (Floating Sticky) */}
            {activeVisit && (
                <Paper sx={{ position: 'fixed', bottom: 70, left: 16, right: 16, bgcolor: '#2e7d32', color: 'white', p: 1.5, borderRadius: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center', zIndex: 100, boxShadow: 3 }}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Schedule fontSize="small" />
                        <Box>
                            <Typography variant="body2" fontWeight="bold">Visita en curso</Typography>
                            <Typography variant="caption">{activeVisit.cliente_nombre || 'Cliente'}</Typography>
                        </Box>
                    </Box>
                    <Button size="small" variant="contained" color="warning" onClick={() => setCheckOutDialogOpen(true)}>
                        TERMINAR
                    </Button>
                </Paper>
            )}

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

        </Box>
    );
};

export default MobileHomePage;



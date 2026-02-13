
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { TrendingUp, Warning, CheckCircle, ArrowForwardIos, AttachMoney, People } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getKpisMesActual, getRankingVendedores } from '../api';
import { useNavigate } from 'react-router-dom';

const MobileManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [kpis, setKpis] = useState({
        ventasHoy: 0,
        ventasMes: 0,
        metaMes: 15000000
    });
    const [ranking, setRanking] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchManagerData = async () => {
            try {
                // 1. KPIs Globales
                const kpiData = await getKpisMesActual({ _t: Date.now() });

                // 2. Ranking Vendedores
                const rankingData = await getRankingVendedores();

                setKpis({
                    ventasHoy: 1250000, // TODO: Crear endpoint real para "Ventas Hoy Global"
                    ventasMes: kpiData.monto_ventas_mes || 0,
                    metaMes: 150000000 // Meta global ejemplo
                });

                if (rankingData && rankingData.success && rankingData.data) {
                    setRanking(rankingData.data.slice(0, 5)); // Solo Top 5

                    // Generar alertas basadas en datos
                    const lowPerformers = rankingData.data.filter(v => parseFloat(v.ventas_mes_actual) < 1000000);
                    setAlertas(lowPerformers.map(v => ({
                        id: v.rut,
                        tipo: 'warning',
                        mensaje: `${v.nombre_vendedor.split(' ')[0]} bajo rendimiento`,
                        detalle: 'Ventas < 1M'
                    })));
                }

            } catch (error) {
                console.error('Error manager mobile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchManagerData();
    }, []);

    const porcentajeMeta = (kpis.ventasMes / kpis.metaMes) * 100;

    return (
        <Box sx={{ pb: 8 }}>
            {/* Header "Pulso" */}
            <Paper
                elevation={0}
                sx={{
                    p: 3,
                    mb: 2,
                    background: '#1F2937',
                    borderRadius: 3,
                    color: 'white'
                }}
            >
                <Typography variant="overline" sx={{ opacity: 0.7, letterSpacing: 1 }}>PULSO DEL NEGOCIO</Typography>
                <Grid container spacing={2} sx={{ mt: 0.5 }}>
                    <Grid item xs={6}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Ventas Hoy</Typography>
                        <Typography variant="h5" fontWeight="700" color="#10B981">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(kpis.ventasHoy)}
                        </Typography>
                    </Grid>
                    <Grid item xs={6} sx={{ borderLeft: '1px solid rgba(255,255,255,0.1)', pl: 2 }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Acumulado Mes</Typography>
                        <Typography variant="h6" fontWeight="600">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', compactDisplay: 'short', notation: 'compact' }).format(kpis.ventasMes)}
                        </Typography>
                        <Typography variant="caption" color={porcentajeMeta >= 100 ? '#10B981' : '#E57A2D'}>
                            {porcentajeMeta.toFixed(1)}% Meta
                        </Typography>
                    </Grid>
                </Grid>
            </Paper>

            {/* Sección de Alertas */}
            {alertas.length > 0 && (
                <Box sx={{ mb: 3 }}>
                    <Typography variant="subtitle2" fontWeight="700" sx={{ mb: 1, color: '#6B7280', textTransform: 'uppercase' }}>requieren atención</Typography>
                    <Grid container spacing={1}>
                        {alertas.map((alerta) => (
                            <Grid item xs={12} key={alerta.id}>
                                <Paper sx={{ p: 1.5, display: 'flex', alignItems: 'center', gap: 2, borderLeft: '4px solid #EF4444' }}>
                                    <Warning color="error" fontSize="small" />
                                    <Box flexGrow={1}>
                                        <Typography variant="subtitle2" fontWeight="bold">{alerta.mensaje}</Typography>
                                        <Typography variant="caption" color="text.secondary">{alerta.detalle}</Typography>
                                    </Box>
                                    <IconButton size="small"><ArrowForwardIos fontSize="small" /></IconButton>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Ranking Resumido */}
            <Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                    <Typography variant="subtitle2" fontWeight="700" sx={{ color: '#6B7280', textTransform: 'uppercase' }}>Top Vendedores</Typography>
                    <Chip label="Ver Todos" size="small" onClick={() => navigate('/ventas')} />
                </Box>

                <List disablePadding>
                    {ranking.map((vendedor, index) => (
                        <Paper key={vendedor.rut} sx={{ mb: 1, borderRadius: 2 }}>
                            <ListItem>
                                <ListItemAvatar>
                                    <Avatar sx={{ bgcolor: index === 0 ? '#FEF3C7' : '#F3F4F6', color: index === 0 ? '#D97706' : '#6B7280', fontWeight: 'bold' }}>
                                        {index + 1}
                                    </Avatar>
                                </ListItemAvatar>
                                <ListItemText
                                    primary={<Typography variant="subtitle2" fontWeight="700">{vendedor.nombre_vendedor}</Typography>}
                                    secondary={
                                        <Typography variant="caption" color="text.primary" fontWeight="600">
                                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(vendedor.ventas_mes_actual)}
                                        </Typography>
                                    }
                                />
                                {index === 0 && <CheckCircle color="success" fontSize="small" />}
                            </ListItem>
                        </Paper>
                    ))}
                </List>
            </Box>
        </Box>
    );
};

export default MobileManagerDashboard;

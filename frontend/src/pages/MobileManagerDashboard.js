
import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, Grid, Chip, IconButton, List, ListItem, ListItemText, ListItemAvatar, Avatar } from '@mui/material';
import { getKpisMesActual, getRankingVendedores, getVendedores, getSaldoCreditoTotal } from '../api';
import MobileKPICard from '../components/MobileKPICard';
import { ShoppingCart, Payment, People, AccountBalanceWallet, FilterList, Warning, ArrowForwardIos, CheckCircle } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const MobileManagerDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [selectedVendedor, setSelectedVendedor] = useState('todos');
    const [vendedores, setVendedores] = useState([]);
    const [kpis, setKpis] = useState({
        ventasMes: 0,
        abonosMes: 0,
        clientesActivos: 0,
        saldoTotal: 0,
        trendVentas: 0
    });
    const [ranking, setRanking] = useState([]);
    const [alertas, setAlertas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true);
            try {
                // 1. Cargar Vendedores si no están
                if (vendedores.length === 0) {
                    const vendRes = await getVendedores();
                    setVendedores(vendRes.data || vendRes || []);
                }

                const params = selectedVendedor !== 'todos' ? { vendedor_id: selectedVendedor } : {};
                params._t = Date.now();

                // 2. KPIs Globales/Por Vendedor
                const kpiData = await getKpisMesActual(params);
                const saldoData = await getSaldoCreditoTotal(params);
                const rankingData = await getRankingVendedores();

                const d = kpiData.data || kpiData;
                const s = saldoData.data || saldoData;

                setKpis({
                    ventasMes: d.monto_ventas_mes || 0,
                    abonosMes: d.monto_abonos_mes || 0,
                    clientesActivos: d.numero_clientes_con_venta_mes || 0,
                    saldoTotal: s.total_saldo_credito || 0,
                    trendVentas: d.variacion_vs_anio_anterior_pct || 0
                });

                if (rankingData?.success && rankingData?.data) {
                    setRanking(rankingData.data.slice(0, 5));
                    const lowPerformers = rankingData.data.filter(v => parseFloat(v.ventas_mes_actual) < 1000000);
                    setAlertas(lowPerformers.map(v => ({
                        id: v.rut,
                        mensaje: `${v.nombre_vendedor.split(' ')[0]} < 1M`,
                        detalle: 'Ventas bajas'
                    })));
                }
            } catch (error) {
                console.error('Error manager mobile:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [selectedVendedor]);

    const formatCLP = (val) => new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);

    return (
        <Box sx={{ pb: 8, px: 2, pt: 2, bgcolor: '#F9FAFB', minHeight: '100vh' }}>
            {/* Selector de Vendedor Premium */}
            <Paper sx={{ p: 2, mb: 3, borderRadius: 4, display: 'flex', alignItems: 'center', gap: 2, boxShadow: '0 4px 20px rgba(0,0,0,0.05)' }}>
                <FilterList color="primary" />
                <Box flexGrow={1}>
                    <Typography variant="caption" fontWeight="bold" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>PANEL DE CONTROL</Typography>
                    <select
                        value={selectedVendedor}
                        onChange={(e) => setSelectedVendedor(e.target.value)}
                        style={{ width: '100%', border: 'none', background: 'none', fontSize: '1rem', fontWeight: 'bold', outline: 'none' }}
                    >
                        <option value="todos">Todos los Vendedores</option>
                        {vendedores.map(v => <option key={v.rut} value={v.rut}>{v.nombre}</option>)}
                    </select>
                </Box>
            </Paper>

            {/* Grid de KPIs Uniformes */}
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
                        title="Ventas del Mes"
                        value={formatCLP(kpis.ventasMes)}
                        progress={(kpis.ventasMes / 150000000) * 100}
                        subtitle="vs Meta Global"
                        trend={kpis.trendVentas}
                        color="#2563EB"
                        icon={<ShoppingCart />}
                        loading={loading}
                    />
                </Box>

                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Recaudación / Abonos"
                        value={formatCLP(kpis.abonosMes)}
                        subtitle={`${((kpis.abonosMes / (kpis.ventasMes || 1)) * 100).toFixed(1)}% de la venta`}
                        color="#10B981"
                        icon={<Payment />}
                        loading={loading}
                    />
                </Box>

                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Cartera de Deuda"
                        value={formatCLP(kpis.saldoTotal)}
                        subtitle="Monto total pendiente"
                        color="#E57A2D"
                        icon={<AccountBalanceWallet />}
                        loading={loading}
                    />
                </Box>

                <Box sx={{ minWidth: '85%', scrollSnapAlign: 'center' }}>
                    <MobileKPICard
                        title="Cobertura Clientes"
                        value={kpis.clientesActivos}
                        suffix="Clientes con venta"
                        subtitle="Mes actual"
                        color="#8B5CF6"
                        icon={<People />}
                        loading={loading}
                    />
                </Box>
            </Box>

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

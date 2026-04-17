import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, CircularProgress,
    Alert, Grid
} from '@mui/material';
import { getPortfolioHealth, getVendedores } from '../../api';
import { useAuth } from '../../contexts/AuthContext';
import KPICard from '../KPICard';
import { TrendingUp, TrendingDown, ReportProblem, CheckCircle } from '@mui/icons-material';

const PortfolioHealthReport = ({ vendedorId }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const params = vendedorId !== 'todos' ? { vendedor_id: vendedorId } : {};
                const res = await getPortfolioHealth(params);
                if (res.success) {
                    setData(res.data);
                } else {
                    setError('No se pudieron cargar los datos de salud de cartera');
                }
            } catch (err) {
                setError('Error de conexión');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [vendedorId]);

    const formatCurrency = (val) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(val);
    };

    const getSaludConfig = (salud) => {
        switch (salud) {
            case 'fuga': return { label: 'FUGA', color: 'error', icon: <ReportProblem fontSize="small" /> };
            case 'riesgo': return { label: 'RIESGO', color: 'warning', icon: <TrendingDown fontSize="small" /> };
            case 'crecimiento': return { label: 'CRECIMIENTO', color: 'success', icon: <TrendingUp fontSize="small" /> };
            default: return { label: 'ESTABLE', color: 'info', icon: <CheckCircle fontSize="small" /> };
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    // Resumen estadístico
    const stats = {
        fuga: data.filter(d => d.salud === 'fuga').length,
        riesgo: data.filter(d => d.salud === 'riesgo').length,
        crecimiento: data.filter(d => d.salud === 'crecimiento').length,
        total: data.length
    };

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#2B4F6F' }}>
                Salud de Cartera e Inteligencia de Fuga
            </Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <KPICard title="Clientes en Crecimiento" value={stats.crecimiento} color="#10B981" subtitle="Superan meta YoY" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KPICard title="Clientes en Riesgo" value={stats.riesgo} color="#F59E0B" subtitle="Bajo promedio 3m" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KPICard title="Alertas de Fuga" value={stats.fuga} color="#EF4444" subtitle="Venta $0 este mes" />
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cliente / Vendedor</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Venta Mes</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Meta YoY</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Prom. 3m</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Estado Salud</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row) => {
                            const config = getSaludConfig(row.salud);
                            return (
                                <TableRow key={row.rut} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.nombre_vendedor}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>{formatCurrency(row.venta_actual)}</TableCell>
                                    <TableCell align="right" color="text.secondary">{formatCurrency(row.meta_anio_ant)}</TableCell>
                                    <TableCell align="right">{formatCurrency(row.promedio_3m)}</TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            icon={config.icon} 
                                            label={config.label} 
                                            color={config.color} 
                                            size="small" 
                                            sx={{ fontWeight: 'bold', minWidth: 100 }}
                                        />
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default PortfolioHealthReport;

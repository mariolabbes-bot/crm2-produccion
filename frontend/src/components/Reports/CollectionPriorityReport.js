import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, Chip, CircularProgress,
    Alert, Grid
} from '@mui/material';
import { getCollectionPriority } from '../../api';
import KPICard from '../KPICard';
import { AccountBalanceWallet, Warning, Speed } from '@mui/icons-material';

const CollectionPriorityReport = ({ vendedorId }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const params = vendedorId !== 'todos' ? { vendedor_id: vendedorId } : {};
                const res = await getCollectionPriority(params);
                if (res.success) {
                    setData(res.data);
                } else {
                    setError('No se pudo cargar el reporte de recaudación');
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

    const getPrioridadConfig = (prioridad) => {
        switch (prioridad) {
            case 'prioridad_critica': return { label: 'CRÍTICA (>60d)', color: 'error' };
            case 'prioridad_alta': return { label: 'ALTA (Impacto)', color: 'warning' };
            default: return { label: 'SEGUIMIENTO', color: 'info' };
        }
    };

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    const totalDeuda = data.reduce((acc, curr) => acc + parseFloat(curr.deuda_total), 0);
    const criticos = data.filter(d => d.prioridad === 'prioridad_critica').length;

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#2B4F6F' }}>
                Priorización de Recaudación y Cobranza Crítica
            </Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={4}>
                    <KPICard title="Deuda en Cartera" value={formatCurrency(totalDeuda)} color="#E57A2D" icon={<AccountBalanceWallet />} />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KPICard title="Casos Críticos" value={criticos} color="#EF4444" icon={<Warning />} subtitle="Más de 60 días de mora" />
                </Grid>
                <Grid item xs={12} md={4}>
                    <KPICard title="Índice de Recaudo" value="Normal" color="#10B981" icon={<Speed />} />
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Cliente / Vendedor</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Deuda Total</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Días Mora Max</TableCell>
                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>Promedio Venta</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Prioridad</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row) => {
                            const config = getPrioridadConfig(row.prioridad);
                            return (
                                <TableRow key={row.rut} hover>
                                    <TableCell>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>{row.nombre}</Typography>
                                        <Typography variant="caption" color="text.secondary">{row.nombre_vendedor}</Typography>
                                    </TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', color: '#EF4444' }}>{formatCurrency(row.deuda_total)}</TableCell>
                                    <TableCell align="right">{row.dias_mora_max} días</TableCell>
                                    <TableCell align="right">{formatCurrency(row.promedio_venta_mensual)}</TableCell>
                                    <TableCell align="center">
                                        <Chip 
                                            label={config.label} 
                                            color={config.color} 
                                            size="small" 
                                            sx={{ fontWeight: 'bold', minWidth: 120 }}
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

export default CollectionPriorityReport;

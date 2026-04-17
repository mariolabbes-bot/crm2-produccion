import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Paper, Table, TableBody, TableCell, 
    TableContainer, TableHead, TableRow, CircularProgress,
    Alert, Grid, LinearProgress
} from '@mui/material';
import { getManagementEffectiveness } from '../../api';
import KPICard from '../KPICard';
import { 
    AssignmentTurnedIn, 
    EventAvailable, 
    QueryStats,
    AccessTime
} from '@mui/icons-material';

const ManagementEfficiencyReport = ({ vendedorId }) => {
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const params = vendedorId !== 'todos' ? { vendedor_id: vendedorId } : {};
                const res = await getManagementEffectiveness(params);
                if (res.success) {
                    setData(res.data);
                } else {
                    setError('No se pudo cargar el reporte de eficiencia');
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

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;

    // Totales globales para el set de datos actual
    const totals = data.reduce((acc, curr) => ({
        visitas: acc.visitas + parseInt(curr.total_visitas),
        planificadas: acc.planificadas + parseInt(curr.planificadas),
        completadas: acc.completadas + parseInt(curr.completadas),
        efectividad: acc.efectividad + parseInt(curr.efectividad_plan)
    }), { visitas: 0, planificadas: 0, completadas: 0, efectividad: 0 });

    const avgEffectiveness = totals.planificadas > 0 
        ? Math.round((totals.efectividad / totals.planificadas) * 100) 
        : 0;

    return (
        <Box>
            <Typography variant="h6" sx={{ mb: 3, fontWeight: 'bold', color: '#2B4F6F' }}>
                Eficacia de Gestión de Terreno (Últimos 30 días)
            </Typography>

            <Grid container spacing={2} sx={{ mb: 4 }}>
                <Grid item xs={12} md={3}>
                    <KPICard title="Total Visitas" value={totals.visitas} color="#3B82F6" icon={<EventAvailable />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <KPICard title="Planificadas" value={totals.planificadas} color="#8B5CF6" icon={<QueryStats />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <KPICard title="Efectiv. Plan" value={`${avgEffectiveness}%`} color="#10B981" icon={<AssignmentTurnedIn />} />
                </Grid>
                <Grid item xs={12} md={3}>
                    <KPICard title="Propuesta Ruta" value="Eficiente" color="#F59E0B" icon={<AccessTime />} />
                </Grid>
            </Grid>

            <TableContainer component={Paper} sx={{ borderRadius: 2, boxShadow: 'none', border: '1px solid #e2e8f0' }}>
                <Table size="small">
                    <TableHead sx={{ bgcolor: '#f8fafc' }}>
                        <TableRow>
                            <TableCell sx={{ fontWeight: 'bold' }}>Vendedor</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Total Visitas</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Planificadas</TableCell>
                            <TableCell align="center" sx={{ fontWeight: 'bold' }}>Completadas</TableCell>
                            <TableCell sx={{ fontWeight: 'bold', minWidth: 200 }}>% Eficacia del Plan</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {data.map((row, idx) => {
                            const pct = row.planificadas > 0 
                                ? Math.min(100, Math.round((row.efectividad_plan / row.planificadas) * 100))
                                : 0;
                            
                            return (
                                <TableRow key={idx} hover>
                                    <TableCell sx={{ fontWeight: 'bold' }}>{row.nombre_vendedor}</TableCell>
                                    <TableCell align="center">{row.total_visitas}</TableCell>
                                    <TableCell align="center">{row.planificadas}</TableCell>
                                    <TableCell align="center">{row.completadas}</TableCell>
                                    <TableCell>
                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                            <Box sx={{ width: '100%', mr: 1 }}>
                                                <LinearProgress 
                                                    variant="determinate" 
                                                    value={pct} 
                                                    color={pct > 70 ? 'success' : pct > 40 ? 'warning' : 'error'}
                                                    sx={{ height: 8, borderRadius: 4 }}
                                                />
                                            </Box>
                                            <Typography variant="body2" sx={{ fontWeight: 'bold', minWidth: 40 }}>
                                                {pct}%
                                            </Typography>
                                        </Box>
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

export default ManagementEfficiencyReport;

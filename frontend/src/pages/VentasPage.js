import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip
} from '@mui/material';
import { getVendedores, getVentasReport } from '../api';
import { useAuth } from '../contexts/AuthContext';
import ProductAnalyticsWidget from '../components/ProductAnalyticsWidget';

const VentasPage = () => {
    const { user } = useAuth();
    const isManager = user?.rol?.toUpperCase() === 'MANAGER';

    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedor, setSelectedVendedor] = useState('');
    const [categoria, setCategoria] = useState('TODOS LOS PRODUCTOS');
    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isManager) {
            getVendedores().then(res => {
                if (res.success) setVendedores(res.data);
            });
        }
    }, [isManager]);

    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getVentasReport({
                    vendedor_id: selectedVendedor,
                    categoria: categoria
                });
                if (res.success) {
                    setData(res.data);
                } else {
                    setError('Error al cargar el reporte');
                }
            } catch (err) {
                setError('Error de conexión con el servidor');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [selectedVendedor, categoria]);

    const formatMoney = (val) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    };

    const getVariationColor = (val) => {
        if (val > 0) return 'success.main';
        if (val < 0) return 'error.main';
        return 'text.secondary';
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header y Filtros */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                        Módulo de Ventas
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Análisis detallado de rendimiento por producto y comparativas.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2 }}>
                    {isManager && (
                        <FormControl sx={{ minWidth: 200 }} size="small">
                            <InputLabel>Vendedor</InputLabel>
                            <Select
                                value={selectedVendedor}
                                label="Vendedor"
                                onChange={(e) => setSelectedVendedor(e.target.value)}
                            >
                                <MenuItem value="">Todos los Vendedores</MenuItem>
                                {vendedores.map(v => (
                                    <MenuItem key={v.id} value={v.id}>{v.nombre_completo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Categoría</InputLabel>
                        <Select
                            value={categoria}
                            label="Categoría"
                            onChange={(e) => setCategoria(e.target.value)}
                        >
                            <MenuItem value="TODOS LOS PRODUCTOS">Todos los Productos</MenuItem>
                            <MenuItem value="APLUS TBR">APLUS TBR</MenuItem>
                            <MenuItem value="APLUS PCR">APLUS PCR</MenuItem>
                            <MenuItem value="LUBRICANTES">Lubricantes</MenuItem>
                            <MenuItem value="REENCAUCHE">Reencauche</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* KPIs Cards */}
            <ProductAnalyticsWidget vendedorId={selectedVendedor} />

            {/* Tabla Detallada */}
            <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 2, boxShadow: 3 }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2B4F6F' }}>
                        Detalle de Rendimiento por Producto
                    </Typography>
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>
                ) : (
                    <TableContainer>
                        <Table sx={{ minWidth: 800 }}>
                            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Descripción de Producto</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Cant. Mes Actual</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Litros Mes Actual</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>% vs Año Ant.</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>% vs Prom. 6m</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Volumen Dinero</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={6} align="center" sx={{ py: 4 }}>
                                            No se encontraron ventas para los filtros seleccionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row, index) => (
                                        <TableRow key={index} hover>
                                            <TableCell sx={{ fontWeight: 500 }}>{row.descripcion}</TableCell>
                                            <TableCell align="right">{row.cantidad_mes_actual}</TableCell>
                                            <TableCell align="right">{row.litros_mes_actual > 0 ? row.litros_mes_actual.toLocaleString('es-CL') : '-'}</TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ color: getVariationColor(row.perc_vs_anio_ant), fontWeight: 'bold' }}>
                                                    {row.perc_vs_anio_ant > 0 ? '+' : ''}{row.perc_vs_anio_ant}%
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ color: getVariationColor(row.perc_vs_prom_6m), fontWeight: 'bold' }}>
                                                    {row.perc_vs_prom_6m > 0 ? '+' : ''}{row.perc_vs_prom_6m}%
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                                {formatMoney(row.volumen_dinero_mes_actual)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>
        </Container>
    );
};

export default VentasPage;

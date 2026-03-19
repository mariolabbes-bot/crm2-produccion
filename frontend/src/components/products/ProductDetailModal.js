import React, { useEffect, useState } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Typography,
    Box,
    CircularProgress,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip
} from '@mui/material';
import { getProductDetail } from '../../api';

const ProductDetailModal = ({ open, onClose, sku }) => {
    const [loading, setLoading] = useState(false);
    const [productData, setProductData] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && sku) {
            fetchDetail();
        } else {
            setProductData(null);
            setError('');
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [open, sku]);

    const fetchDetail = async () => {
        setLoading(true);
        setError('');
        try {
            const result = await getProductDetail(sku);
            if (result.success) {
                setProductData(result.data);
            } else {
                setError(result.msg || 'Error al cargar detalles');
            }
        } catch (err) {
            setError(err.message || 'Error de conexión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
            <DialogTitle sx={{ bgcolor: '#f5f5f5', pb: 2 }}>
                {loading ? 'Cargando...' : productData ? `SKU: ${productData.sku}` : 'Detalle de Producto'}
            </DialogTitle>

            <DialogContent sx={{ mt: 2 }}>
                {loading && (
                    <Box display="flex" justifyContent="center" my={4}>
                        <CircularProgress />
                    </Box>
                )}

                {error && (
                    <Typography color="error" variant="body1">
                        {error}
                    </Typography>
                )}

                {!loading && productData && (
                    <Box>
                        <Box mb={3}>
                            <Typography variant="h6" fontWeight="bold">
                                {productData.descripcion}
                            </Typography>
                            <Box display="flex" gap={1} mt={1}>
                                {productData.marca && <Chip label={`Marca: ${productData.marca}`} size="small" />}
                                {productData.familia && <Chip label={`Familia: ${productData.familia}`} size="small" variant="outlined" />}
                            </Box>
                        </Box>

                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                            Disponibilidad y Ventas por Sucursal
                        </Typography>
                        <TableContainer component={Paper} variant="outlined">
                            <Table size="small">
                                <TableHead sx={{ bgcolor: '#fafafa' }}>
                                    <TableRow>
                                        <TableCell fontWeight="bold">Sucursal</TableCell>
                                        <TableCell align="right" fontWeight="bold">Venta Promedio (6m)</TableCell>
                                        <TableCell align="right" fontWeight="bold">Stock Disponible</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {productData.sucursales && productData.sucursales.length > 0 ? (
                                        productData.sucursales.map((row, idx) => (
                                            <TableRow key={idx}>
                                                <TableCell>{row.sucursal}</TableCell>
                                                <TableCell align="right">
                                                    {row.venta_promedio > 0 ? row.venta_promedio : '-'}
                                                </TableCell>
                                                <TableCell align="right">
                                                    <Typography
                                                        fontWeight={row.stock > 0 ? 'bold' : 'normal'}
                                                        color={row.stock > 0 ? 'success.main' : 'text.secondary'}
                                                    >
                                                        {row.stock}
                                                    </Typography>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={3} align="center">
                                                <Typography variant="body2" color="text.secondary" py={2}>
                                                    No hay información de sucursales disponible.
                                                </Typography>
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Box>
                )}
            </DialogContent>

            <DialogActions sx={{ p: 2 }}>
                <Button onClick={onClose} variant="contained" color="primary">
                    Cerrar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

export default ProductDetailModal;

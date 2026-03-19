import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, TextField, InputAdornment,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Chip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import ProductAnalyticsWidget from '../components/ProductAnalyticsWidget';
import ProductDetailModal from '../components/products/ProductDetailModal';
import { getTop20Products, searchProducts } from '../api';

const ProductsPage = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [products, setProducts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    const [selectedSku, setSelectedSku] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // Initial load: Fetch top 20
    useEffect(() => {
        const fetchTop20 = async () => {
            setLoading(true);
            try {
                const res = await getTop20Products();
                if (res.success) {
                    setTopProducts(res.data);
                }
            } catch (err) {
                console.error('Error fetching top 20:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchTop20();
    }, []);

    // Search effect with debounce
    useEffect(() => {
        if (!searchTerm.trim() || searchTerm.trim().length < 3) {
            setProducts([]);
            return;
        }

        const delayFn = setTimeout(async () => {
            setLoading(true);
            try {
                const res = await searchProducts(searchTerm);
                if (res.success) {
                    setProducts(res.data);
                }
            } catch (err) {
                console.error('Error searching products:', err);
            } finally {
                setLoading(false);
            }
        }, 500);

        return () => clearTimeout(delayFn);
    }, [searchTerm]);

    const handleProductClick = (sku) => {
        setSelectedSku(sku);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setTimeout(() => setSelectedSku(null), 300); // clear after animation
    };

    const isSearching = searchTerm.trim().length >= 3;
    const currentList = isSearching ? products : topProducts;
    const title = isSearching ?\`Resultados de búsqueda (\${products.length})\` : 'Top 20 Productos Más Vendidos';

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Título de la Sección */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                    Buscador de Productos e Inventario
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Consulta el catálogo, revisa el stock por sucursal y la venta promedio.
                </Typography>
            </Box>

            {/* Panel de Análisis (KPIs temporales si aplican) */}
            <ProductAnalyticsWidget />

            <Box sx={{ mt: 4, mb: 3 }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Buscar por SKU, descripción o marca..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <SearchIcon color="primary" />
                            </InputAdornment>
                        ),
                        sx: { bgcolor: 'white', borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }
                    }}
                />
            </Box>

            <Paper sx={{ p: 3, borderRadius: 2, boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h6" fontWeight="bold" color="primary.dark">
                        {title}
                    </Typography>
                    {loading && <CircularProgress size={24} />}
                </Box>

                <TableContainer>
                    <Table>
                        <TableHead sx={{ bgcolor: '#f4f6f8' }}>
                            <TableRow>
                                <TableCell><strong>SKU</strong></TableCell>
                                <TableCell><strong>Descripción</strong></TableCell>
                                <TableCell><strong>Marca</strong></TableCell>
                                <TableCell><strong>Familia</strong></TableCell>
                                {!isSearching && <TableCell align="right"><strong>Total Vendido</strong></TableCell>}
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {currentList.length > 0 ? (
                                currentList.map((prod) => (
                                    <TableRow 
                                        key={prod.sku} 
                                        hover 
                                        onClick={() => handleProductClick(prod.sku)}
                                        sx={{ cursor: 'pointer', transition: '0.2s', '&:hover': { bgcolor: '#f0f7ff' } }}
                                    >
                                        <TableCell sx={{ fontWeight: '500', color: 'primary.main' }}>
                                            {prod.sku}
                                        </TableCell>
                                        <TableCell>{prod.descripcion}</TableCell>
                                        <TableCell>
                                            {prod.marca && <Chip label={prod.marca} size="small" />}
                                        </TableCell>
                                        <TableCell>
                                            {prod.familia && <Chip label={prod.familia} size="small" variant="outlined" />}
                                        </TableCell>
                                        {!isSearching && (
                                            <TableCell align="right" sx={{ fontWeight: 'bold' }}>
                                                <Box display="flex" alignItems="center" justifyContent="flex-end" gap={1}>
                                                    <ShoppingCartIcon fontSize="small" color="success" />
                                                    {prod.total_vendido}
                                                </Box>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={5} align="center" sx={{ py: 4 }}>
                                        {loading ? 'Buscando...' : 'No se encontraron resultados.'}
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Paper>

            <ProductDetailModal 
                open={modalOpen} 
                onClose={handleCloseModal} 
                sku={selectedSku} 
            />

        </Container>
    );
};

export default ProductsPage;

import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Container, TextField, InputAdornment,
    Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    CircularProgress, Chip, FormControl, InputLabel, Select, MenuItem, Grid
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import FilterListIcon from '@mui/icons-material/FilterList';
import ProductAnalyticsWidget from '../components/ProductAnalyticsWidget';
import ProductDetailModal from '../components/products/ProductDetailModal';
import { getTop20Products, searchProducts, getProductMetadata } from '../api';

const ProductsPage = () => {
    // Search & Filter States
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedMarca, setSelectedMarca] = useState('');
    const [selectedFamilia, setSelectedFamilia] = useState('');

    // Data States
    const [metadata, setMetadata] = useState({ marcas: [], familias: [] });
    const [products, setProducts] = useState([]);
    const [topProducts, setTopProducts] = useState([]);

    // UI States
    const [loading, setLoading] = useState(false);
    const [selectedSku, setSelectedSku] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);

    // 1. Initial Load: Top 20 & Metadata
    useEffect(() => {
        const fetchInitialData = async () => {
            setLoading(true);
            try {
                const [topRes, metaRes] = await Promise.all([
                    getTop20Products(),
                    getProductMetadata()
                ]);
                if (topRes.success) setTopProducts(topRes.data);
                if (metaRes.marcas) setMetadata({ marcas: metaRes.marcas, familias: metaRes.familias });
            } catch (err) {
                console.error('Error fetching initial data:', err);
            } finally {
                setLoading(false);
            }
        };
        fetchInitialData();
    }, []);

    // 2. Search Effect (Triggered on text, marca, or familia change)
    useEffect(() => {
        const isTextValid = searchTerm.trim().length >= 3;
        const hasFilters = selectedMarca !== '' || selectedFamilia !== '';

        if (!isTextValid && !hasFilters) {
            setProducts([]);
            return;
        }

        const delayFn = setTimeout(async () => {
            setLoading(true);
            try {
                const params = {};
                if (isTextValid) params.q = searchTerm.trim();
                if (selectedMarca) params.marca = selectedMarca;
                if (selectedFamilia) params.familia = selectedFamilia;

                const res = await searchProducts(params);
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
    }, [searchTerm, selectedMarca, selectedFamilia]);

    // Modal Handlers
    const handleProductClick = (sku) => {
        setSelectedSku(sku);
        setModalOpen(true);
    };

    const handleCloseModal = () => {
        setModalOpen(false);
        setTimeout(() => setSelectedSku(null), 300); // clear after animation
    };

    // Derived State
    const isSearchingActive = searchTerm.trim().length >= 3 || selectedMarca !== '' || selectedFamilia !== '';
    const currentList = isSearchingActive ? products : topProducts;
    const title = isSearchingActive ? `Resultados de búsqueda (${products.length})` : 'Top 20 Productos Más Vendidos';

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                    Buscador de Productos e Inventario
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Consulta el catálogo, revisa el stock por sucursal y la venta promedio.
                </Typography>
            </Box>

            <ProductAnalyticsWidget />

            {/* Filter Section */}
            <Paper sx={{ mt: 4, mb: 3, p: 3, borderRadius: 2, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                    <FilterListIcon color="primary" />
                    <Typography variant="h6" fontWeight="bold">Filtros de Búsqueda</Typography>
                </Box>

                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            variant="outlined"
                            placeholder="Buscar por SKU, descripción..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="primary" />
                                    </InputAdornment>
                                ),
                                sx: { bgcolor: 'white' }
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel>Marca</InputLabel>
                            <Select
                                value={selectedMarca}
                                onChange={(e) => setSelectedMarca(e.target.value)}
                                label="Marca"
                                sx={{ bgcolor: 'white' }}
                            >
                                <MenuItem value=""><em>Todas las Marcas</em></MenuItem>
                                {metadata.marcas.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={6} md={3}>
                        <FormControl fullWidth variant="outlined">
                            <InputLabel>Familia</InputLabel>
                            <Select
                                value={selectedFamilia}
                                onChange={(e) => setSelectedFamilia(e.target.value)}
                                label="Familia"
                                sx={{ bgcolor: 'white' }}
                            >
                                <MenuItem value=""><em>Todas las Familias</em></MenuItem>
                                {metadata.familias.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>
            </Paper>

            {/* Results Table */}
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
                                {!isSearchingActive && <TableCell align="right"><strong>Total Vendido</strong></TableCell>}
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
                                        {!isSearchingActive && (
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

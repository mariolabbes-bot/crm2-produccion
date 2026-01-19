
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Select, MenuItem, Chip } from '@mui/material';
import axios from 'axios';

const ProductCleanup = () => {
    const [products, setProducts] = useState([]);
    const [metadata, setMetadata] = useState({ marcas: [], familias: [], subfamilias: [] });
    const [loading, setLoading] = useState(true);

    // Fetch incomplete products and metadata
    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            setLoading(true);
            const [prodRes, metaRes] = await Promise.all([
                axios.get('http://localhost:4000/api/products/incomplete', { withCredentials: true }),
                axios.get('http://localhost:4000/api/products/metadata', { withCredentials: true })
            ]);
            setProducts(prodRes.data);
            setMetadata(metaRes.data);
        } catch (error) {
            console.error("Error fetching cleanup data", error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = async (sku, field, value) => {
        // Optimistic update
        setProducts(prev => prev.map(p => p.sku === sku ? { ...p, [field]: value } : p));

        // API Call
        try {
            await axios.put(`http://localhost:4000/api/products/${sku}`, { [field]: value }, { withCredentials: true });
        } catch (error) {
            console.error("Failed to update product", error);
            // Revert on error? Or just alert.
        }
    };

    if (loading) return <Typography>Cargando productos por clasificar...</Typography>;
    if (products.length === 0) return <Typography>¡Todo limpio! No hay productos pendientes de clasificación.</Typography>;

    return (
        <Box>
            <Typography variant="h6" gutterBottom>
                Productos por Clasificar ({products.length})
                <Button size="small" onClick={fetchData} sx={{ ml: 2 }}>Actualizar</Button>
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>SKU</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell>Marca</TableCell>
                            <TableCell>Familia</TableCell>
                            <TableCell>SubFamilia</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {products.map((row) => (
                            <TableRow key={row.sku}>
                                <TableCell>{row.sku}</TableCell>
                                <TableCell>{row.descripcion}</TableCell>

                                {/* MARCA */}
                                <TableCell>
                                    <Select
                                        size="small"
                                        value={row.marca || ''}
                                        onChange={(e) => handleChange(row.sku, 'marca', e.target.value)}
                                        displayEmpty
                                        sx={{ minWidth: 120 }}
                                    >
                                        <MenuItem value=""><em>Seleccionar</em></MenuItem>
                                        {metadata.marcas.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                                    </Select>
                                </TableCell>

                                {/* FAMILIA */}
                                <TableCell>
                                    <Select
                                        size="small"
                                        value={row.familia || ''}
                                        onChange={(e) => handleChange(row.sku, 'familia', e.target.value)}
                                        displayEmpty
                                        sx={{ minWidth: 120 }}
                                    >
                                        <MenuItem value=""><em>Seleccionar</em></MenuItem>
                                        {metadata.familias.map(f => <MenuItem key={f} value={f}>{f}</MenuItem>)}
                                    </Select>
                                </TableCell>

                                {/* SUBFAMILIA */}
                                <TableCell>
                                    <Select
                                        size="small"
                                        value={row.subfamilia || ''}
                                        onChange={(e) => handleChange(row.sku, 'subfamilia', e.target.value)}
                                        displayEmpty
                                        sx={{ minWidth: 120 }}
                                    >
                                        <MenuItem value=""><em>Seleccionar</em></MenuItem>
                                        {metadata.subfamilias.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                    </Select>
                                </TableCell>

                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ProductCleanup;

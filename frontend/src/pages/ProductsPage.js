import React from 'react';
import { Box, Typography, Container } from '@mui/material';
import ProductAnalyticsWidget from '../components/ProductAnalyticsWidget';

const ProductsPage = () => {
    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Título de la Sección */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                    Productos
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Gestión y análisis de inventario y ventas por producto.
                </Typography>
            </Box>

            {/* Panel de Análisis (KPIs) */}
            <ProductAnalyticsWidget />

            {/* Aquí iría futuras tablas de productos, inventario, etc. */}
            <Box sx={{
                mt: 4,
                p: 4,
                border: '1px dashed #ccc',
                borderRadius: 2,
                bgcolor: '#f9f9f9',
                textAlign: 'center'
            }}>
                <Typography variant="body2" color="text.secondary">
                    [Listado de Productos - Próximamente]
                </Typography>
            </Box>
        </Container>
    );
};

export default ProductsPage;

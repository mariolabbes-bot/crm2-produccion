import React, { useState, useEffect } from 'react';
import { Card, CardContent, Typography, Grid, Box, CircularProgress, Alert } from '@mui/material';
import { getProductKpis } from '../api';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import OpacityIcon from '@mui/icons-material/Opacity'; // Para litros
import BlurOnIcon from '@mui/icons-material/BlurOn'; // Para neumáticos/unidades
import LocalOfferIcon from '@mui/icons-material/LocalOffer';

const ProductAnalyticsWidget = ({ vendedorId }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadData = async () => {
            setLoading(true);
            try {
                const result = await getProductKpis({ vendedor_id: vendedorId });
                if (result.success) {
                    setData(result);
                } else {
                    setError('Error cargando KPIs');
                }
            } catch (err) {
                console.error(err);
                setError('Error de conexión');
            } finally {
                setLoading(false);
            }
        };
        loadData();
    }, [vendedorId]);

    if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}><CircularProgress /></Box>;
    if (error) return <Alert severity="error">{error}</Alert>;
    if (!data) return null;

    const getIcon = (id) => {
        if (id === 'lubricantes') return <OpacityIcon sx={{ fontSize: 40, color: '#E57A2D', opacity: 0.2 }} />;
        return <BlurOnIcon sx={{ fontSize: 40, color: '#1976d2', opacity: 0.2 }} />;
    };

    return (
        <Box sx={{ mb: 4 }}>
            <Typography variant="h6" sx={{ mb: 2, fontWeight: 'bold', color: '#2B4F6F' }}>
                Análisis de Productos (Mes Actual vs Año Anterior)
            </Typography>

            <Box sx={{
                display: 'flex',
                gap: 2,
                overflowX: 'auto',
                pb: 2,
                px: 1,
                mx: -1,
                scrollSnapType: 'x mandatory',
                '&::-webkit-scrollbar': { height: 8 },
                '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4 },
                scrollbarWidth: 'thin'
            }}>
                {data.kpis.map((kpi) => (
                    <Box key={kpi.id} sx={{ 
                        minWidth: { xs: '85%', sm: '45%', md: '23%' }, 
                        scrollSnapAlign: 'start',
                        flexShrink: 0
                    }}>
                        <Card sx={{
                            height: '100%',
                            position: 'relative',
                            transition: 'transform 0.2s',
                            '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 }
                        }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <Box>
                                        <Typography variant="overline" color="text.secondary" sx={{ fontWeight: 'bold', lineHeight: 1.2 }}>
                                            {kpi.label}
                                        </Typography>
                                        <Typography variant="h4" sx={{ fontWeight: 'bold', my: 1, color: '#2B4F6F' }}>
                                            {kpi.current.toLocaleString('es-CL')} <Typography component="span" variant="caption" sx={{ color: '#666' }}>{kpi.unit}</Typography>
                                        </Typography>
                                    </Box>
                                    {getIcon(kpi.id)}
                                </Box>

                                <Box sx={{ mt: 2, pt: 2, borderTop: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" color="text.secondary">
                                        Año ant: {kpi.lastYear.toLocaleString('es-CL')}
                                    </Typography>

                                    <Box sx={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        color: kpi.variation >= 0 ? 'success.main' : 'error.main',
                                        bgcolor: kpi.variation >= 0 ? 'rgba(46, 125, 50, 0.1)' : 'rgba(211, 47, 47, 0.1)',
                                        px: 1,
                                        py: 0.5,
                                        borderRadius: 1
                                    }}>
                                        {kpi.variation >= 0 ? <TrendingUpIcon fontSize="small" sx={{ mr: 0.5 }} /> : <TrendingDownIcon fontSize="small" sx={{ mr: 0.5 }} />}
                                        <Typography variant="caption" fontWeight="bold">
                                            {kpi.variation > 0 ? '+' : ''}{kpi.variation}%
                                        </Typography>
                                    </Box>
                                </Box>
                            </CardContent>
                        </Card>
                    </Box>
                ))}
            </Box>
        </Box>
    );
};

export default ProductAnalyticsWidget;


import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, Button, List, ListItem, ListItemText, ListItemAvatar, Avatar, Chip, IconButton } from '@mui/material';
import { LocationOn, DirectionsCar, CheckCircle, Warning, ArrowForwardIos } from '@mui/icons-material';
import { useAuth } from '../contexts/AuthContext';
import { getKpisMesActual, getMyVisitsToday } from '../api';
import KPICard from '../components/KPICard';
import { useNavigate } from 'react-router-dom';

/**
 * MobileHomePage - Dashboard "Mi Ruta" para Vendedores
 * Muestra KPIs resumidos y acceso directo a la ruta del día.
 */
const MobileHomePage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [kpis, setKpis] = useState({ ventas: 0, meta: 10000000 }); // Meta hardcoded o traer de backend
    const [visitas, setVisitas] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMobileData = async () => {
            try {
                // 1. Cargar KPIs básicos
                const kpiData = await getKpisMesActual({ _t: Date.now() });
                setKpis({
                    ventas: kpiData.monto_ventas_mes || 0,
                    meta: 15000000 // Ejemplo de meta mensual
                });

                // 2. Cargar historial de visitas de hoy (Real)
                const visitsData = await getMyVisitsToday();
                if (Array.isArray(visitsData)) {
                    const mappedVisits = visitsData.map(v => ({
                        id: v.id,
                        nombre: v.cliente_nombre || 'Cliente sin nombre',
                        direccion: v.cliente_direccion || '',
                        estado: v.estado === 'completada' ? 'visitado' : 'pendiente',
                        hora: v.hora_inicio ? v.hora_inicio.substring(0, 5) : '--:--',
                        venta: v.resultado === 'venta'
                    }));
                    setVisitas(mappedVisits);
                }

            } catch (error) {
                console.error('Error mobile data:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchMobileData();
    }, []);

    const avanceMeta = (kpis.ventas / kpis.meta) * 100;

    return (
        <Box sx={{ pb: 8 }}>
            {/* 1. Saludo y Resumen de Meta (Compacto) */}
            <Paper
                elevation={0}
                sx={{
                    p: 2,
                    mb: 2,
                    background: 'linear-gradient(135deg, #2B4F6F 0%, #1E3A52 100%)',
                    borderRadius: 3,
                    color: 'white'
                }}
            >
                <Typography variant="body2" sx={{ opacity: 0.8 }}>Hola,</Typography>
                <Typography variant="h5" fontWeight="700" sx={{ mb: 2 }}>{user?.nombre_completo?.split(' ')[0]}</Typography>

                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end' }}>
                    <Box>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Ventas Mes</Typography>
                        <Typography variant="h6" fontWeight="700">
                            {new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(kpis.ventas)}
                        </Typography>
                    </Box>
                    <Box sx={{ textAlign: 'right' }}>
                        <Typography variant="caption" sx={{ opacity: 0.8 }}>Meta</Typography>
                        <Typography variant="subtitle1" fontWeight="600" color="#E57A2D">
                            {avanceMeta.toFixed(1)}%
                        </Typography>
                    </Box>
                </Box>
                {/* Barra de progreso simple */}
                <Box sx={{ width: '100%', height: 6, bgcolor: 'rgba(255,255,255,0.1)', borderRadius: 3, mt: 1, overflow: 'hidden' }}>
                    <Box sx={{ width: `${Math.min(avanceMeta, 100)}%`, height: '100%', bgcolor: '#E57A2D' }} />
                </Box>
            </Paper>

            {/* 2. Acceso Rápido a Mapa */}
            <Button
                variant="outlined"
                fullWidth
                startIcon={<LocationOn />}
                onClick={() => navigate('/mapa-visitas')} // Navegar a la vista de mapa
                sx={{
                    mb: 3,
                    py: 1.5,
                    borderRadius: 3,
                    borderColor: '#2B4F6F',
                    color: '#2B4F6F',
                    fontWeight: 600,
                    textTransform: 'none',
                    justifyContent: 'flex-start',
                    pl: 3
                }}
            >
                Ver Mapa de Ruta (Hoy)
            </Button>

            {/* 3. Lista de Visitas (Próximas) */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                <Typography variant="h6" fontWeight="700" color="#111827">Visitas de Hoy</Typography>
                <Chip
                    label={`${visitas.filter(v => v.estado === 'pendiente').length} Activas`}
                    size="small"
                    color="primary"
                    sx={{ height: 24, fontSize: '0.7rem' }}
                />
            </Box>

            <List disablePadding>
                {visitas.map((visita) => (
                    <Paper
                        key={visita.id}
                        sx={{
                            mb: 1.5,
                            borderRadius: 3,
                            overflow: 'hidden',
                            borderLeft: `5px solid ${visita.estado === 'visitado' ? '#10B981' : '#E57A2D'}`
                        }}
                    >
                        <ListItem
                            alignItems="flex-start"
                            secondaryAction={
                                <IconButton edge="end">
                                    <ArrowForwardIos sx={{ fontSize: 14 }} />
                                </IconButton>
                            }
                            sx={{ py: 1.5 }}
                        >
                            <ListItemAvatar>
                                <Avatar sx={{ bgcolor: visita.estado === 'visitado' ? '#E6FFFA' : '#FFF7ED', color: visita.estado === 'visitado' ? '#10B981' : '#E57A2D' }}>
                                    {visita.estado === 'visitado' ? <CheckCircle fontSize="small" /> : <DirectionsCar fontSize="small" />}
                                </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                                primary={
                                    <Typography variant="subtitle2" fontWeight="700">
                                        {visita.nombre}
                                    </Typography>
                                }
                                secondary={
                                    <Box component="span" sx={{ display: 'block', mt: 0.5 }}>
                                        <Typography variant="caption" display="block" color="text.secondary">
                                            {visita.direccion}
                                        </Typography>
                                        <Typography variant="caption" fontWeight="600" color="text.primary">
                                            {visita.hora} • {visita.estado === 'visitado' ? 'Completado' : 'Pendiente'}
                                        </Typography>
                                    </Box>
                                }
                            />
                        </ListItem>
                    </Paper>
                ))}
            </List>

            {/* Hint o Tip */}
            <Paper sx={{ p: 2, mt: 2, bgcolor: '#FEF3C7', color: '#92400E', borderRadius: 2 }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                    <Warning fontSize="small" />
                    <Typography variant="caption" fontWeight="600">
                        Recuerda sincronizar tus pedidos al finalizar la ruta.
                    </Typography>
                </Box>
            </Paper>
        </Box>
    );
};

export default MobileHomePage;

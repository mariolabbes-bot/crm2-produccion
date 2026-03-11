import React from 'react';
import { Card, CardContent, Box, Typography, LinearProgress, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

/**
 * MobileKPICard - Tarjeta optimizada para visualización móvil
 * Diseño horizontal, altura reducida y dimensiones uniformes.
 */
const MobileKPICard = ({
    title,
    value,
    subtitle = null,
    progress = null, // 0 to 100
    trend = null,
    color = '#2B4F6F',
    icon = null,
    loading = false,
    suffix = ""
}) => {
    const isPositiveTrend = trend !== null && trend >= 0;

    return (
        <Card
            sx={{
                mb: 2,
                borderRadius: 3,
                borderLeft: `6px solid ${color}`,
                boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                overflow: 'hidden'
            }}
        >
            <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                    {/* Lado Izquierdo: Título e Icono */}
                    <Box display="flex" alignItems="center" gap={1.5}>
                        {icon && (
                            <Box
                                sx={{
                                    color: color,
                                    bgcolor: `${color}10`,
                                    p: 1,
                                    borderRadius: 2,
                                    display: 'flex'
                                }}
                            >
                                {icon}
                            </Box>
                        )}
                        <Typography
                            variant="caption"
                            sx={{
                                fontWeight: 700,
                                color: 'text.secondary',
                                textTransform: 'uppercase',
                                letterSpacing: 0.5
                            }}
                        >
                            {title}
                        </Typography>
                    </Box>

                    {/* Lado Derecho: Tendencia */}
                    {trend !== null && !loading && (
                        <Box
                            sx={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 0.5,
                                color: isPositiveTrend ? '#10B981' : '#EF4444',
                                bgcolor: isPositiveTrend ? '#10B98115' : '#EF444415',
                                px: 1,
                                py: 0.5,
                                borderRadius: 5
                            }}
                        >
                            {isPositiveTrend ? <TrendingUp sx={{ fontSize: 14 }} /> : <TrendingDown sx={{ fontSize: 14 }} />}
                            <Typography variant="caption" fontWeight="bold">
                                {isPositiveTrend ? '+' : ''}{trend}%
                            </Typography>
                        </Box>
                    )}
                </Box>

                {/* Valor Central */}
                <Box sx={{ mt: 1.5, mb: progress !== null ? 1 : 0, display: 'flex', alignItems: 'baseline', gap: 1 }}>
                    {loading ? (
                        <Skeleton variant="text" width="60%" height={40} />
                    ) : (
                        <>
                            <Typography variant="h5" fontWeight="800" color="text.primary">
                                {value}
                            </Typography>
                            {suffix && (
                                <Typography variant="caption" color="text.secondary" fontWeight="600">
                                    {suffix}
                                </Typography>
                            )}
                        </>
                    )}
                </Box>

                {/* Barra de Progreso Opcional */}
                {progress !== null && !loading && (
                    <Box sx={{ mt: 1 }}>
                        <Box display="flex" justifyContent="space-between" mb={0.5}>
                            <Typography variant="caption" color="text.secondary">{subtitle}</Typography>
                            <Typography variant="caption" fontWeight="bold" color={color}>{progress.toFixed(0)}%</Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(progress, 100)}
                            sx={{
                                height: 6,
                                borderRadius: 3,
                                bgcolor: `${color}20`,
                                '& .MuiLinearProgress-bar': {
                                    bgcolor: color,
                                    borderRadius: 3
                                }
                            }}
                        />
                    </Box>
                )}

                {/* Subtítulo simple si no hay progreso */}
                {progress === null && subtitle && !loading && (
                    <Typography variant="caption" color="text.secondary">
                        {subtitle}
                    </Typography>
                )}
            </CardContent>
        </Card>
    );
};

export default MobileKPICard;

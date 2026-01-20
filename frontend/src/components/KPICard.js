import React from 'react';
import { Card, CardContent, Box, Typography, Skeleton } from '@mui/material';
import { TrendingUp, TrendingDown } from '@mui/icons-material';

/**
 * KPICard - Tarjeta reutilizable para mostrar indicadores clave
 * 
 * @param {string} title - Título del KPI (ej: "Ventas del Mes")
 * @param {string|number} value - Valor principal (ej: "$3,456,789")
 * @param {string} subtitle - Subtítulo opcional (ej: "vs mes anterior")
 * @param {string} highlightedSubtitle - Subtítulo destacado a la derecha (ej: "97.5% de las ventas")
 * @param {string} highlightedColor - Color del subtítulo destacado
 * @param {number} trend - Tendencia en porcentaje (ej: 12.5 = +12.5%)
 * @param {boolean} trendAsPercentage - Si true, muestra el trend como porcentaje sin flechas
 * @param {string} color - Color del módulo (ej: "#10B981" para ventas)
 * @param {React.ReactNode} icon - Ícono del módulo
 * @param {boolean} loading - Estado de carga
 */
const KPICard = ({
  title,
  value,
  subtitle = null,
  highlightedSubtitle = null,
  highlightedColor = null,
  trend = null,
  trendAsPercentage = false,
  color = '#2B4F6F',
  icon = null,
  loading = false
}) => {
  const isPositiveTrend = trend !== null && trend >= 0;

  return (
    <Card
      sx={{
        height: '100%',
        borderLeft: `4px solid ${color}`,
        transition: 'all 0.3s ease',
        '&:hover': {
          transform: 'translateY(-4px)',
          boxShadow: `0 8px 24px rgba(0, 0, 0, 0.12)`,
        }
      }}
    >
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        {/* Header: Título + Ícono */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
          <Typography
            variant="subtitle2"
            sx={{
              color: '#6B7280',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              fontSize: '0.7rem'
            }}
          >
            {title}
          </Typography>

          {icon && (
            <Box
              sx={{
                color: color,
                backgroundColor: `${color}15`, // 15% opacity
                borderRadius: 2,
                p: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              {icon}
            </Box>
          )}
        </Box>

        {/* Valor Principal */}
        {loading ? (
          <Skeleton variant="text" width="80%" height={48} />
        ) : (
          <Typography
            variant="h4"
            sx={{
              fontWeight: 700,
              color: '#111827',
              mb: 0.5,
              fontSize: '1.75rem',
              lineHeight: 1.2
            }}
          >
            {value}
          </Typography>
        )}

        {/* Footer: Subtítulo + Tendencia o Highlighted Subtitle */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 2 }}>
          {subtitle && (
            <Typography
              variant="body2"
              sx={{
                color: '#9CA3AF',
                fontSize: '0.875rem'
              }}
            >
              {subtitle}
            </Typography>
          )}

          {/* Si hay highlightedSubtitle, mostrarlo en lugar del trend */}
          {highlightedSubtitle ? (
            <Typography
              variant="body2"
              sx={{
                color: highlightedColor || color,
                fontWeight: 700,
                fontSize: '0.875rem'
              }}
            >
              {highlightedSubtitle}
            </Typography>
          ) : trend !== null && (
            trendAsPercentage ? (
              // Modo porcentaje: sin flechas, color del módulo
              <Typography
                variant="body2"
                sx={{
                  color: color,
                  fontWeight: 700,
                  fontSize: '0.875rem'
                }}
              >
                {(trend || 0).toFixed(1)}%
              </Typography>
            ) : (
              // Modo tendencia: con flechas, color verde/rojo
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  color: isPositiveTrend ? '#10B981' : '#EF4444',
                  fontWeight: 600,
                  fontSize: '0.875rem'
                }}
              >
                {isPositiveTrend ? (
                  <TrendingUp sx={{ fontSize: 20 }} />
                ) : (
                  <TrendingDown sx={{ fontSize: 20 }} />
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {isPositiveTrend ? '+' : ''}{(trend || 0).toFixed(1)}%
                </Typography>
              </Box>
            )
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default KPICard;

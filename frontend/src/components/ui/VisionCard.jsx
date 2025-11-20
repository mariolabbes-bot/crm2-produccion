import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const gradients = {
  primary: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
  success: 'linear-gradient(135deg, #2DCE89 0%, #11CDEF 100%)',
  warning: 'linear-gradient(135deg, #FB6340 0%, #F5365C 100%)',
  neutral: 'linear-gradient(135deg, #f8f9fe 0%, #ffffff 100%)',
};

const VisionCard = ({ 
  title, 
  value, 
  subtitle, 
  subtitleColor,
  icon, 
  trend, 
  gradient = 'neutral', 
  variant = 'neutral', 
  sx = {}, 
  children, 
  ...props 
}) => {
  // Usar gradient si está definido, sino variant
  const bgVariant = gradient || variant;
  const bg = gradients[bgVariant] || gradients.neutral;
  const isNeutral = bgVariant === 'neutral';
  
  // Si se pasan children, renderizar el componente original (backward compatibility)
  if (children) {
    return (
      <Card {...props} sx={{
        background: bg,
        color: isNeutral ? 'inherit' : '#fff',
        border: isNeutral ? '1px solid #edf2f7' : 'none',
        boxShadow: isNeutral ? undefined : '0 8px 24px rgba(130,94,228,0.25)',
        ...sx,
      }}>
        <CardContent>
          {children}
        </CardContent>
      </Card>
    );
  }
  
  // Renderizar con props estructuradas (nuevo modo)
  return (
    <Card {...props} sx={{
      background: bg,
      color: isNeutral ? 'inherit' : '#fff',
      border: isNeutral ? '1px solid #edf2f7' : 'none',
      boxShadow: isNeutral ? undefined : '0 8px 24px rgba(130,94,228,0.25)',
      ...sx,
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
          {/* Header: Icon + Title */}
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon && (
              <Typography variant="h5" component="span">
                {icon}
              </Typography>
            )}
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600, 
                opacity: 0.9,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                fontSize: '0.75rem'
              }}
            >
              {title}
            </Typography>
          </Box>
          
          {/* Value (main number/text) */}
          <Typography 
            variant="h4" 
            component="div" 
            sx={{ 
              fontWeight: 700,
              fontSize: { xs: '1.5rem', sm: '1.75rem', md: '2rem' },
              lineHeight: 1.2
            }}
          >
            {value}
          </Typography>
          
          {/* Subtitle (percentage, trend info) */}
          {subtitle && (
            <Typography 
              variant="body2" 
              sx={{ 
                color: subtitleColor || 'inherit',
                opacity: subtitleColor ? 1 : 0.9,
                fontSize: '0.875rem',
                fontWeight: subtitleColor ? 600 : 400,
                mt: 0.5
              }}
            >
              {subtitle}
            </Typography>
          )}
        </Box>
      </CardContent>
    </Card>
  );
};

export default VisionCard;

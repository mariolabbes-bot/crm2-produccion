import React from 'react';
import { Card, CardContent } from '@mui/material';

const gradients = {
  primary: 'linear-gradient(135deg, #5E72E4 0%, #825EE4 100%)',
  success: 'linear-gradient(135deg, #2DCE89 0%, #11CDEF 100%)',
  warning: 'linear-gradient(135deg, #FB6340 0%, #F5365C 100%)',
  neutral: 'linear-gradient(135deg, #f8f9fe 0%, #ffffff 100%)',
};

const VisionCard = ({ variant = 'neutral', sx = {}, children, ...props }) => {
  const bg = gradients[variant] || gradients.neutral;
  return (
    <Card {...props} sx={{
      background: bg,
      color: variant === 'neutral' ? 'inherit' : '#fff',
      border: variant === 'neutral' ? '1px solid #edf2f7' : 'none',
      boxShadow: variant === 'neutral' ? undefined : '0 8px 24px rgba(130,94,228,0.25)',
      ...sx,
    }}>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default VisionCard;

import React from 'react';
import { Card, CardContent, Typography, Box } from '@mui/material';

const SalesKpiCard = ({ title, value, subtitle, color = 'primary', icon, sx = {}, ...props }) => (
  <Card elevation={0} sx={{
    minHeight: 110,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    borderLeft: `4px solid var(--mui-palette-${color}-main, #3A36DB)`,
    ...sx,
  }} {...props}>
    <CardContent sx={{ pb: '16px!important', pt: '18px!important' }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        {icon && <Box sx={{ fontSize: 32, color: `var(--mui-palette-${color}-main, #3A36DB)` }}>{icon}</Box>}
        <Typography variant="subtitle2" color="text.secondary" sx={{ fontWeight: 500 }}>{title}</Typography>
      </Box>
      <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
      {subtitle && <Typography variant="caption" color="text.secondary">{subtitle}</Typography>}
    </CardContent>
  </Card>
);

export default SalesKpiCard;

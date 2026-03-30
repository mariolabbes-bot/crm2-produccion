import React from 'react';
import { Box, Typography } from '@mui/material';
import CircuitManagement from '../components/admin/CircuitManagement';

const MisCircuitosPage = () => {
    return (
        <Box sx={{ p: 3, bgcolor: '#F3F4F6', minHeight: '100vh' }}>
            <Box mb={3}>
                <Typography variant="h5" fontWeight="bold" color="primary">Gestión de Mis Circuitos</Typography>
                <Typography variant="body2" color="text.secondary">
                    Asigna tus clientes a los distintos circuitos disponibles para organizarlos en el mapa y planificador.
                </Typography>
            </Box>
            <CircuitManagement />
        </Box>
    );
};

export default MisCircuitosPage;

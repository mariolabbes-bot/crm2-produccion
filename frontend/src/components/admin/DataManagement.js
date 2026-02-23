
import React, { useState } from 'react';
import { Paper, Tabs, Tab, Box } from '@mui/material';
import ProductCleanup from './ProductCleanup';
import ClientCleanup from './ClientCleanup';
import CircuitManagement from './CircuitManagement';

const DataManagement = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box>
            <Paper sx={{ mb: 2 }}>
                <Tabs value={tabIndex} onChange={handleChange} centered>
                    <Tab label="Clasificación de Productos" />
                    <Tab label="Completar Clientes" />
                    <Tab label="Gestión de Circuitos" />
                </Tabs>
            </Paper>

            <Box role="tabpanel" hidden={tabIndex !== 0}>
                {tabIndex === 0 && <ProductCleanup />}
            </Box>

            <Box role="tabpanel" hidden={tabIndex !== 1}>
                {tabIndex === 1 && <ClientCleanup />}
            </Box>

            <Box role="tabpanel" hidden={tabIndex !== 2}>
                {tabIndex === 2 && <CircuitManagement />}
            </Box>
        </Box>
    );
};

export default DataManagement;

import React, { useState } from 'react';
import { Paper, Tabs, Tab, Box } from '@mui/material';
import ProductCleanup from './ProductCleanup';
import ClientCleanup from './ClientCleanup';
import CircuitManagement from './CircuitManagement';
import BranchCleanup from './BranchCleanup'; // Added Branch Cleanup

const DataManagement = () => {
    const [tabIndex, setTabIndex] = useState(0);

    const handleChange = (event, newValue) => {
        setTabIndex(newValue);
    };

    return (
        <Box>
            <Paper sx={{ mb: 2 }}>
                <Tabs value={tabIndex} onChange={handleChange} centered variant="scrollable" scrollButtons="auto">
                    <Tab label="Clasificación de Productos" />
                    <Tab label="Completar Clientes" />
                    <Tab label="Gestión de Circuitos" />
                    <Tab label="Mapeo de Sucursales" />
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

            <Box role="tabpanel" hidden={tabIndex !== 3}>
                {tabIndex === 3 && <BranchCleanup />}
            </Box>
        </Box>
    );
};

export default DataManagement;

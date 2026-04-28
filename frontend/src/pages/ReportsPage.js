import React, { useState, useEffect } from 'react';
import { 
    Box, Typography, Tabs, Tab, FormControl, InputLabel, 
    Select, MenuItem, Container, Paper
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { getVendedores } from '../api';
import PortfolioHealthReport from '../components/Reports/PortfolioHealthReport';
import ManagementEfficiencyReport from '../components/Reports/ManagementEfficiencyReport';
import CollectionPriorityReport from '../components/Reports/CollectionPriorityReport';
import SupervisionDashboard from '../components/Reports/SupervisionDashboard';

const ReportsPage = () => {
    const { isManager } = useAuth();
    const [vendedores, setVendedores] = useState([]);
    const [tabValue, setTabValue] = useState(0);
    const [vendedorSeleccionado, setVendedorSeleccionado] = useState('todos');

    useEffect(() => {
        if (isManager()) {
            getVendedores().then(res => {
                const data = res.data || res;
                if (Array.isArray(data)) setVendedores(data);
            }).catch(console.error);
        }
    }, [isManager]);

    const handleTabChange = (event, newValue) => {
        setTabValue(newValue);
    };

    return (
        <Container maxWidth="xl">
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                    Inteligencia Comercial (BI)
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Análisis avanzado de rendimiento, salud de clientes y eficacia de terreno.
                </Typography>
            </Box>

            {/* Filtros Globales de Reporte */}
            {isManager() && (
                <Paper sx={{ p: 2, mb: 3, display: 'flex', gap: 2, alignItems: 'center', borderRadius: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 250 }}>
                        <InputLabel>Filtrar por Vendedor</InputLabel>
                        <Select
                            value={vendedorSeleccionado}
                            label="Filtrar por Vendedor"
                            onChange={(e) => setVendedorSeleccionado(e.target.value)}
                        >
                            <MenuItem value="todos">Todos los vendedores</MenuItem>
                            {vendedores.map((v) => (
                                <MenuItem key={v.rut || v.id} value={v.rut}>{v.nombre || v.nombre_completo}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                </Paper>
            )}

            {/* Pestañas de Reportes */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
                <Tabs value={tabValue} onChange={handleTabChange} sx={{
                    '& .MuiTab-root': { fontWeight: 'bold', fontSize: '0.9rem' }
                }}>
                    <Tab label="Salud de Cartera" />
                    <Tab label="Eficacia de Gestión" />
                    <Tab label="Cobranza Priorizada" />
                    {isManager() && <Tab label="Supervisión de Ruta" />}
                </Tabs>
            </Box>

            {/* Contenido Dinámico */}
            <Box sx={{ py: 2 }}>
                {tabValue === 0 && <PortfolioHealthReport vendedorId={vendedorSeleccionado} />}
                {tabValue === 1 && <ManagementEfficiencyReport vendedorId={vendedorSeleccionado} />}
                {tabValue === 2 && <CollectionPriorityReport vendedorId={vendedorSeleccionado} />}
                {tabValue === 3 && isManager() && <SupervisionDashboard />}
            </Box>
        </Container>
    );
};

export default ReportsPage;

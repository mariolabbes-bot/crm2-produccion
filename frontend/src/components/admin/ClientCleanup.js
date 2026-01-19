
import React, { useState, useEffect } from 'react';
import { Paper, Typography, Box, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import axios from 'axios';
import DownloadIcon from '@mui/icons-material/Download';

const ClientCleanup = () => {
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchClients();
    }, []);

    const fetchClients = async () => {
        try {
            setLoading(true);
            const res = await axios.get('http://localhost:4000/api/clients/incomplete', { withCredentials: true });
            setClients(res.data);
        } catch (error) {
            console.error("Error fetching incomplete clients", error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        window.open('http://localhost:4000/api/clients/incomplete/download', '_blank');
    };

    if (loading) return <Typography>Cargando clientes incompletos...</Typography>;
    if (clients.length === 0) return <Typography>¡Excelente! No hay clientes con datos faltantes.</Typography>;

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">
                    Clientes Incompletos ({clients.length})
                </Typography>
                <Button
                    variant="contained"
                    startIcon={<DownloadIcon />}
                    onClick={handleDownload}
                    color="primary"
                >
                    Descargar Excel para Completar
                </Button>
            </Box>

            <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Estos clientes fueron creados automáticamente (Stubs) y les falta información clave (Dirección, Teléfono, Email).
                Descarga la planilla, complétala y vuelve a importarla en la sección de "Carga de Datos" (pestaña Dashboard).
            </Typography>

            <TableContainer component={Paper} sx={{ maxHeight: 500 }}>
                <Table stickyHeader size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>RUT</TableCell>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Dirección</TableCell>
                            <TableCell>Teléfono</TableCell>
                            <TableCell>Email</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {clients.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell>{c.rut}</TableCell>
                                <TableCell>{c.nombre}</TableCell>
                                <TableCell>{c.direccion || <span style={{ color: 'red' }}>Faltante</span>}</TableCell>
                                <TableCell>{c.telefono || <span style={{ color: 'orange' }}>Faltante</span>}</TableCell>
                                <TableCell>{c.email || <span style={{ color: 'orange' }}>Faltante</span>}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default ClientCleanup;

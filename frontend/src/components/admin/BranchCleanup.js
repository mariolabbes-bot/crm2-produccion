import React, { useState, useEffect } from 'react';
import { Box, Typography, Paper, TextField, Button, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, IconButton, CircularProgress } from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import axios from 'axios';

const BranchCleanup = () => {
    const [aliases, setAliases] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [newExcelVal, setNewExcelVal] = useState('');
    const [newRealVal, setNewRealVal] = useState('');

    useEffect(() => {
        loadAliases();
    }, []);

    const loadAliases = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${process.env.REACT_APP_API_URL || 'https://crm2-produccion.onrender.com'}/api/sucursal-aliases`);
            if (res.data.success) {
                setAliases(res.data.data);
            }
        } catch (err) {
            setError('Error al cargar alias de sucursales.');
        } finally {
            setLoading(false);
        }
    };

    const handleAdd = async (e) => {
        e.preventDefault();
        if (!newExcelVal.trim() || !newRealVal.trim()) return;
        setError('');
        try {
            const res = await axios.post(`${process.env.REACT_APP_API_URL || 'https://crm2-produccion.onrender.com'}/api/sucursal-aliases`, {
                valor_excel: newExcelVal.trim(),
                sucursal_real: newRealVal.trim().toUpperCase()
            });
            if (res.data.success) {
                setNewExcelVal('');
                setNewRealVal('');
                loadAliases();
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error al añadir alias.');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Seguro que deseas eliminar este alias?')) return;
        try {
            await axios.delete(`${process.env.REACT_APP_API_URL || 'https://crm2-produccion.onrender.com'}/api/sucursal-aliases/${id}`);
            loadAliases();
        } catch (err) {
            setError('Error al eliminar alias.');
        }
    };

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Mapeo Oficial de Sucursales</Typography>
            <Typography variant="body2" color="textSecondary" mb={3}>
                Define cómo el sistema debe traducir los nombres de sucursal que vienen en los Excel (ej. "001") hacia sus nombres Oficiales (ej. "CASA MATRIZ") para que el cruce de Ventas y Stock cuádre perfectamente.
            </Typography>

            <Paper sx={{ p: 2, mb: 4, bgcolor: '#f5f5f5' }}>
                <form onSubmit={handleAdd} style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                    <TextField
                        size="small"
                        label="Valor en Excel (Malo)"
                        variant="outlined"
                        value={newExcelVal}
                        onChange={(e) => setNewExcelVal(e.target.value)}
                        placeholder="Ej: 001, Casa matriz, Matriz"
                        fullWidth
                    />
                    <Typography variant="h6">→</Typography>
                    <TextField
                        size="small"
                        label="Sucursal Oficial (Real)"
                        variant="outlined"
                        value={newRealVal}
                        onChange={(e) => setNewRealVal(e.target.value)}
                        placeholder="Ej: CASA MATRIZ"
                        fullWidth
                    />
                    <Button variant="contained" type="submit" disabled={!newExcelVal || !newRealVal}>
                        Agregar
                    </Button>
                </form>
                {error && <Typography color="error" mt={2} variant="body2">{error}</Typography>}
            </Paper>

            {loading ? (
                <CircularProgress />
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead sx={{ bgcolor: '#eceff1' }}>
                            <TableRow>
                                <TableCell><b>Valor Crudo del Excel</b></TableCell>
                                <TableCell><b>Mapeo Final (Oficial)</b></TableCell>
                                <TableCell align="right"><b>Acciones</b></TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {aliases.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={3} align="center">No hay mapeos guardados.</TableCell>
                                </TableRow>
                            ) : (
                                aliases.map(a => (
                                    <TableRow key={a.id}>
                                        <TableCell>{a.valor_excel}</TableCell>
                                        <TableCell sx={{ color: 'primary.main', fontWeight: 'bold' }}>{a.sucursal_real}</TableCell>
                                        <TableCell align="right">
                                            <IconButton color="error" size="small" onClick={() => handleDelete(a.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
};

export default BranchCleanup;

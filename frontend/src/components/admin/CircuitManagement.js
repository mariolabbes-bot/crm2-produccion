import React, { useState, useEffect } from 'react';
import {
    Box, Typography, Paper, Grid, TextField, Button,
    IconButton, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Dialog, DialogTitle, DialogContent,
    DialogActions, Alert, CircularProgress
} from '@mui/material';
import { Edit, Delete, Add, ColorLens, GroupAdd } from '@mui/icons-material';
import { getCircuits, createCircuit, updateCircuit, deleteCircuit, bulkAssignCircuit } from '../../api';
import { Divider } from '@mui/material';

const CircuitManagement = () => {
    const [circuits, setCircuits] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [open, setOpen] = useState(false);
    const [editingCircuit, setEditingCircuit] = useState(null);
    const [formData, setFormData] = useState({ nombre: '', color: '#95a5a6', descripcion: '' });

    // Bulk Assignment State
    const [bulkData, setBulkData] = useState({ ruts: '', circuito: '' });
    const [bulkLoading, setBulkLoading] = useState(false);

    const fetchCircuits = async () => {
        try {
            setLoading(true);
            const data = await getCircuits();
            setCircuits(data);
        } catch (err) {
            setError('Error al cargar circuitos');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchCircuits();
    }, []);

    const handleOpen = (circuit = null) => {
        if (circuit) {
            setEditingCircuit(circuit);
            setFormData({ nombre: circuit.nombre, color: circuit.color, descripcion: circuit.descripcion || '' });
        } else {
            setEditingCircuit(null);
            setFormData({ nombre: '', color: '#95a5a6', descripcion: '' });
        }
        setOpen(true);
    };

    const handleClose = () => {
        setOpen(false);
        setError(null);
    };

    const handleSubmit = async () => {
        if (!formData.nombre) return;
        try {
            if (editingCircuit) {
                await updateCircuit(editingCircuit.id, formData);
            } else {
                await createCircuit(formData);
            }
            fetchCircuits();
            handleClose();
        } catch (err) {
            setError(err.message || 'Error al guardar circuito');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de eliminar este circuito?')) return;
        try {
            await deleteCircuit(id);
            fetchCircuits();
        } catch (err) {
            alert(err.message || 'No se pudo eliminar el circuito');
        }
    };

    const handleBulkAssign = async () => {
        const rutsArray = bulkData.ruts
            .split(/[\s,\n]+/)
            .map(r => r.trim())
            .filter(r => r.length > 0);

        if (rutsArray.length === 0) return;

        try {
            setBulkLoading(true);
            const targetCircuit = bulkData.circuito === 'NONE' ? null : bulkData.circuito;
            await bulkAssignCircuit(rutsArray, targetCircuit);
            alert(`✅ Se han actualizado ${rutsArray.length} clientes.`);
            setBulkData({ ruts: '', circuito: '' });
        } catch (err) {
            alert(err.message || 'Error en la asignación masiva');
        } finally {
            setBulkLoading(false);
        }
    };

    if (loading) return <Box p={4} textAlign="center"><CircularProgress /></Box>;

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h6" fontWeight="bold">Gestión de Circuitos</Typography>
                <Button variant="contained" startIcon={<Add />} onClick={() => handleOpen()}>
                    Nuevo Circuito
                </Button>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <TableContainer component={Paper} sx={{ borderRadius: 3 }}>
                <Table>
                    <TableHead sx={{ bgcolor: '#f8f9fa' }}>
                        <TableRow>
                            <TableCell>Nombre</TableCell>
                            <TableCell>Color</TableCell>
                            <TableCell>Descripción</TableCell>
                            <TableCell align="right">Acciones</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {circuits.map((c) => (
                            <TableRow key={c.id}>
                                <TableCell sx={{ fontWeight: 'bold' }}>{c.nombre}</TableCell>
                                <TableCell>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Box sx={{ width: 24, height: 24, borderRadius: '50%', bgcolor: c.color, border: '1px solid #ddd' }} />
                                        <Typography variant="body2">{c.color}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>{c.descripcion}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="primary" onClick={() => handleOpen(c)}>
                                        <Edit fontSize="small" />
                                    </IconButton>
                                    <IconButton size="small" color="error" onClick={() => handleDelete(c.id)}>
                                        <Delete fontSize="small" />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={open} onClose={handleClose} fullWidth maxWidth="xs">
                <DialogTitle>{editingCircuit ? 'Editar Circuito' : 'Nuevo Circuito'}</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField
                            label="Nombre del Circuito"
                            fullWidth
                            value={formData.nombre}
                            onChange={(e) => setFormData({ ...formData, nombre: e.target.value.toUpperCase() })}
                        />
                        <Box>
                            <Typography variant="caption" color="text.secondary">Color Identificador</Typography>
                            <Box display="flex" gap={2} alignItems="center">
                                <input
                                    type="color"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                    style={{ width: 50, height: 40, border: 'none', padding: 0, cursor: 'pointer' }}
                                />
                                <TextField
                                    size="small"
                                    value={formData.color}
                                    onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                                />
                            </Box>
                        </Box>
                        <TextField
                            label="Descripción (opcional)"
                            fullWidth
                            multiline
                            rows={2}
                            value={formData.descripcion}
                            onChange={(e) => setFormData({ ...formData, descripcion: e.target.value })}
                        />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleClose}>Cancelar</Button>
                    <Button onClick={handleSubmit} variant="contained">Guardar</Button>
                </DialogActions>
            </Dialog>

            <Divider sx={{ my: 4 }} />

            <Paper sx={{ p: 3, borderRadius: 3, bgcolor: '#f1f5f9' }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                    Asignación Masiva por RUT
                </Typography>
                <Typography variant="body2" color="text.secondary" mb={2}>
                    Pega una lista de RUTs (separados por coma, espacio o nueva línea) para asignarles un circuito rápidamente.
                </Typography>
                <Grid container spacing={2}>
                    <Grid item xs={12} md={8}>
                        <TextField
                            fullWidth
                            multiline
                            rows={4}
                            placeholder="77.123.456-7, 76.555.444-3..."
                            value={bulkData.ruts}
                            onChange={(e) => setBulkData({ ...bulkData, ruts: e.target.value })}
                            sx={{ bgcolor: 'white' }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4}>
                        <Box display="flex" flexDirection="column" gap={2}>
                            <TextField
                                select
                                label="Circuito a Asignar"
                                fullWidth
                                SelectProps={{ native: true }}
                                value={bulkData.circuito}
                                onChange={(e) => setBulkData({ ...bulkData, circuito: e.target.value })}
                                sx={{ bgcolor: 'white' }}
                            >
                                <option value="">-- Seleccionar --</option>
                                <option value="NONE">SIN CIRCUITO (Limpiar)</option>
                                {circuits.map(c => (
                                    <option key={c.id} value={c.nombre}>{c.nombre}</option>
                                ))}
                            </TextField>
                            <Button
                                variant="contained"
                                color="secondary"
                                fullWidth
                                onClick={handleBulkAssign}
                                disabled={!bulkData.ruts || !bulkData.circuito || bulkLoading}
                            >
                                {bulkLoading ? 'Procesando...' : 'Asignar Circuito'}
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>
        </Box>
    );
};

export default CircuitManagement;

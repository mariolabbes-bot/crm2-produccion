import React, { useState, useEffect } from 'react';
import {
    Box, Button, Typography, Paper, FormControl, InputLabel, Select, MenuItem,
    LinearProgress, Alert, List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import DownloadIcon from '@mui/icons-material/Download';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const UniversalImporter = () => {
    const [importType, setImportType] = useState('ventas');
    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [jobId, setJobId] = useState(null);
    const [jobStatus, setJobStatus] = useState(null); // processing, completed, failed
    const [progress, setProgress] = useState(0);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    // Polling effect
    useEffect(() => {
        let interval;
        if (jobId && (jobStatus === 'processing' || jobStatus === 'pending')) {
            interval = setInterval(async () => {
                try {
                    const res = await fetch(`${API_URL}/import/status/${jobId}`, {
                        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
                    });
                    const data = await res.json();
                    if (data.success) {
                        setJobStatus(data.status);
                        if (data.status === 'completed') {
                            setResult(data.result); // result contains details
                            setProgress(100);
                            clearInterval(interval);
                        } else if (data.status === 'failed') {
                            setError(data.errorMessage || 'Error desconocido en el proceso');
                            clearInterval(interval);
                        } else {
                            // Fake progress update if we don't have real percentage
                            setProgress((old) => Math.min(old + 5, 90));
                        }
                    }
                } catch (e) {
                    console.error("Error polling status", e);
                }
            }, 2000);
        }
        return () => clearInterval(interval);
    }, [jobId, jobStatus]);

    const handleFileChange = (e) => {
        if (e.target.files && e.target.files[0]) {
            setFile(e.target.files[0]);
            setError(null);
            setResult(null);
            setJobId(null);
            setJobStatus(null);
            setProgress(0);
        }
    };

    const handleUpload = async () => {
        if (!file) {
            setError("Por favor seleccione un archivo.");
            return;
        }

        setUploading(true);
        setError(null);
        setJobStatus('pending');
        setProgress(5);

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Determine endpoint based on type
            let endpoint = '';
            switch (importType) {
                case 'ventas': endpoint = '/import/ventas?forceSync=true'; break;
                case 'abonos': endpoint = '/import/abonos?updateMissing=1&forceSync=true'; break;
                case 'clientes': endpoint = '/import/clientes?forceSync=true'; break;
                case 'saldo_credito': endpoint = '/import/saldo-credito?forceSync=true'; break;
                default: endpoint = '/import/ventas?forceSync=true';
            }

            const res = await fetch(`${API_URL}${endpoint}`, {
                method: 'POST',
                body: formData,
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            const data = await res.json();
            if (res.ok && data.success) {
                if (data.status === 'completed' && data.result) {
                    console.log('⚡ Importación completada sincrónicamente');
                    setJobId(data.jobId);
                    setResult(data.result);
                    setJobStatus('completed');
                    setProgress(100);
                } else {
                    setJobId(data.jobId);
                    setJobStatus('processing');
                }
            } else {
                setError(data.msg || "Error al iniciar la carga.");
                setUploading(false);
                setJobStatus(null);
            }
        } catch (err) {
            setError("Error de red: " + err.message);
            setUploading(false);
            setJobStatus(null);
        } finally {
            // Upload phase done, now polling handles the "uploading" visual state effectively
            // But we keep uploading=true to disable inputs
            setUploading(false);
        }
    };

    const resetForm = () => {
        setFile(null);
        setJobId(null);
        setJobStatus(null);
        setResult(null);
        setError(null);
        setProgress(0);
        // Clear file input value
        const fileInput = document.getElementById('importer-file-input');
        if (fileInput) fileInput.value = '';
    };

    return (
        <Paper className="card-unified" sx={{ p: 3, mb: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" color="primary">Importador Universal</Typography>
                <Button variant="outlined" size="small" onClick={() => window.open(`${API_URL}/import/plantilla/${importType}`, '_blank')}>
                    Descargar Plantilla
                </Button>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <FormControl sx={{ minWidth: 200 }}>
                    <InputLabel>Tipo de Datos</InputLabel>
                    <Select
                        value={importType}
                        label="Tipo de Datos"
                        onChange={(e) => setImportType(e.target.value)}
                        disabled={!!jobId && jobStatus === 'processing'}
                    >
                        <MenuItem value="ventas">Ventas (Facturas/Boletas)</MenuItem>
                        <MenuItem value="abonos">Abonos (Pagos)</MenuItem>
                        <MenuItem value="clientes">Clientes (Maestro)</MenuItem>
                        <MenuItem value="saldo_credito">Saldo Crédito (Snapshot)</MenuItem>
                    </Select>
                </FormControl>

                <Box sx={{ flexGrow: 1 }}>
                    <Button
                        variant="outlined"
                        component="label"
                        fullWidth
                        startIcon={<InsertDriveFileIcon />}
                        sx={{ height: 56, justifyContent: 'flex-start', px: 2, borderColor: 'rgba(0, 0, 0, 0.23)', color: file ? 'primary.main' : 'text.secondary' }}
                        disabled={!!jobId && jobStatus === 'processing'}
                    >
                        {file ? file.name : "Seleccionar Archivo Excel (.xlsx)..."}
                        <input
                            id="importer-file-input"
                            type="file"
                            hidden
                            accept=".xlsx, .xls"
                            onChange={handleFileChange}
                        />
                    </Button>
                </Box>

                <Button
                    variant="contained"
                    size="large"
                    onClick={handleUpload}
                    disabled={!file || (!!jobId && jobStatus === 'processing')}
                    startIcon={<CloudUploadIcon />}
                    sx={{ height: 56, px: 4 }}
                >
                    {jobStatus === 'processing' ? 'Procesando...' : 'Importar'}
                </Button>
            </Box>

            {/* Progress Bar */}
            {(jobStatus === 'pending' || jobStatus === 'processing') && (
                <Box sx={{ mt: 3 }}>
                    <Typography variant="body2" color="textSecondary" gutterBottom>
                        Procesando archivo... Esto puede tomar unos minutos. Por favor no cierre esta ventana.
                    </Typography>
                    <LinearProgress variant="determinate" value={progress} />
                </Box>
            )}

            {/* Error Message */}
            {error && (
                <Alert severity="error" sx={{ mt: 3 }} icon={<ErrorIcon />}>
                    {error}
                </Alert>
            )}

            {/* Success / Result View */}
            {jobStatus === 'completed' && result && (
                <Box sx={{ mt: 3, p: 2, bgcolor: '#f1f8e9', borderRadius: 2, border: '1px solid #c5e1a5' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <CheckCircleIcon color="success" sx={{ mr: 1 }} />
                        <Typography variant="h6" color="success.main">
                            Importación Completada
                        </Typography>
                    </Box>

                    <Typography variant="subtitle2" gutterBottom>Resumen:</Typography>
                    <List dense>
                        <ListItem>
                            <ListItemText primary={`Total Filas: ${result.totalRows}`} />
                        </ListItem>
                        <ListItem>
                            <ListItemText primary={`Importados Exitosamente: ${result.imported || result.inserted || 0}`} secondary={result.updated ? `Actualizados: ${result.updated}` : null} />
                        </ListItem>
                        {result.duplicates > 0 && (
                            <ListItem>
                                <ListItemText primary={`Duplicados (Omitidos): ${result.duplicates}`} />
                            </ListItem>
                        )}
                        {result.errors > 0 && (
                            <ListItem>
                                <ListItemText primary={`Errores / Observaciones: ${result.errors}`} sx={{ color: 'warning.main' }} />
                            </ListItem>
                        )}
                        {/* Specific Report Links */}
                        {result.pendingReportUrl && (
                            <ListItem button component="a" href={`${API_URL}${result.pendingReportUrl.replace('/api', '')}`} target="_blank">
                                <ListItemIcon><DownloadIcon /></ListItemIcon>
                                <ListItemText primary="Descargar Reporte de Faltantes (Vendedores/Clientes)" />
                            </ListItem>
                        )}
                        {result.observationsReportUrl && (
                            <ListItem button component="a" href={`${API_URL}${result.observationsReportUrl.replace('/api', '')}`} target="_blank">
                                <ListItemIcon><DownloadIcon /></ListItemIcon>
                                <ListItemText primary="Descargar Reporte de Errores/Observaciones" />
                            </ListItem>
                        )}
                    </List>

                    <Button variant="text" onClick={resetForm} sx={{ mt: 1 }}>
                        Importar otro archivo
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

export default UniversalImporter;

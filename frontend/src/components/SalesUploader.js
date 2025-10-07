
import React, { useState } from 'react';
import { Button, Input, Typography, Box, CircularProgress, Alert } from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';


const SalesUploader = () => {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csvDownloadUrl, setCsvDownloadUrl] = useState(null);

  const handleFileChange = (event) => {
    setFile(event.target.files[0]);
    setError('');
    setSuccess('');
    setCsvDownloadUrl(null);
  };

  const handleUpload = async () => {
    if (!file) {
      setError('Por favor, selecciona un archivo.');
      return;
    }

    setUploading(true);
    setError('');
    setSuccess('');
    setCsvDownloadUrl(null);

    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`${API_URL}/sales/bulk`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      if (res.headers.get('content-type')?.includes('text/csv')) {
        // Hay registros no cargados, descargar CSV
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        setCsvDownloadUrl(url);
        setSuccess('Algunos registros no se cargaron. Descarga el archivo para revisar.');
      } else {
        const data = await res.json();
        if (res.ok) setSuccess(data.message);
        else setError(data.msg || 'Error al cargar ventas.');
      }
    } catch (err) {
      setError('Error de red o servidor.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>
        Cargar Ventas desde CSV
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
        <Input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          disableUnderline
        />
        <Button
          variant="contained"
          onClick={handleUpload}
          disabled={!file || uploading}
        >
          {uploading ? <CircularProgress size={24} /> : 'Cargar'}
        </Button>
      </Box>
      {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mt: 2 }}>{success}</Alert>}
      {csvDownloadUrl && (
        <Button
          href={csvDownloadUrl}
          download="ventas_no_cargadas.csv"
          variant="outlined"
          sx={{ mt: 2 }}
        >
          Descargar registros no cargados
        </Button>
      )}
    </Box>
  );
};

export default SalesUploader;

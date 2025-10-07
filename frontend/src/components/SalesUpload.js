import React, { useState } from 'react';
import { Button, Box, Typography, Alert, CircularProgress } from '@mui/material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

export default function SalesUpload() {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [csvDownloadUrl, setCsvDownloadUrl] = useState(null);

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
    setError('');
    setSuccess('');
    setCsvDownloadUrl(null);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return setError('Selecciona un archivo CSV.');
    setLoading(true);
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
      setLoading(false);
    }
  };

  return (
    <Box sx={{ mt: 4, p: 3, bgcolor: 'white', borderRadius: 2, boxShadow: 2 }}>
      <Typography variant="h6" gutterBottom>Cargar ventas desde archivo CSV</Typography>
      <form onSubmit={handleUpload}>
        <input
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          style={{ marginBottom: 16 }}
        />
        <Button type="submit" variant="contained" disabled={loading || !file}>
          {loading ? <CircularProgress size={24} /> : 'Cargar ventas'}
        </Button>
      </form>
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
}

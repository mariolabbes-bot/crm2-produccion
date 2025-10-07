import React, { useState } from 'react';
import { Box, Typography, TextField, Button, Alert, CircularProgress, Stack, Table, TableHead, TableRow, TableCell, TableBody } from '@mui/material';
import { importSalesJson } from '../api';

const exampleTemplate = `[
  { "rut": "11111111-1", "invoice_number": "F001", "invoice_date": "2025-09-01", "net_amount": 12345.67 },
  { "rut": "22222222-2", "invoice_number": "F002", "invoice_date": "2025-09-02", "net_amount": 9980 }
]`;

export default function SalesJsonImporter() {
  const [raw, setRaw] = useState(exampleTemplate);
  const [parsed, setParsed] = useState([]);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleParse = () => {
    setError('');
    setResult(null);
    try {
      const data = JSON.parse(raw);
      if (!Array.isArray(data)) {
        setError('El JSON debe ser un array de objetos.');
        return;
      }
      setParsed(data);
    } catch (e) {
      setError('JSON inválido: ' + e.message);
    }
  };

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setRaw(ev.target.result);
      setParsed([]);
      setResult(null);
      setError('');
    };
    reader.readAsText(file, 'utf-8');
  };

  const handleImport = async () => {
    if (parsed.length === 0) {
      setError('No hay datos parseados.');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const res = await importSalesJson(parsed);
      setResult(res);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const downloadFailed = () => {
    if (!result || !result.detalles_fallidos || result.detalles_fallidos.length === 0) return;
    const csvHeader = 'rut,invoice_number,invoice_date,net_amount,motivo\n';
    const csvBody = result.detalles_fallidos.map(r => `${r.rut || ''},${r.invoice_number || ''},${r.invoice_date || ''},${r.net_amount || ''},"${(r.motivo || '').replace(/"/g,'"')}"`).join('\n');
    const blob = new Blob([csvHeader + csvBody], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ventas_fallidas.json_import.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ mt: 4 }}>
      <Typography variant="h6" gutterBottom>Importar Ventas desde JSON</Typography>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ mb: 2 }}>
        <Button variant="outlined" component="label">Cargar archivo JSON<input hidden type="file" accept="application/json,.json" onChange={handleFile} /></Button>
        <Button variant="contained" onClick={handleParse}>Parsear</Button>
        <Button variant="contained" color="success" disabled={parsed.length===0 || loading} onClick={handleImport}>{loading ? <CircularProgress size={22} /> : 'Importar'}</Button>
        {result?.detalles_fallidos?.length > 0 && <Button variant="outlined" color="warning" onClick={downloadFailed}>Descargar fallidos</Button>}
      </Stack>
      <TextField multiline minRows={8} fullWidth value={raw} onChange={e=>setRaw(e.target.value)} label="JSON de ventas" />
      {error && <Alert severity="error" sx={{ mt:2 }}>{error}</Alert>}
      {parsed.length > 0 && !result && <Alert severity="info" sx={{ mt:2 }}>{parsed.length} registros listos para importar.</Alert>}
      {result && (
        <Alert severity={result.failed>0? 'warning':'success'} sx={{ mt:2 }}>
          Importación: {result.inserted} insertados, {result.failed} fallidos.
        </Alert>
      )}
      {result?.detalles_fallidos?.length > 0 && (
        <Box sx={{ mt:2, maxHeight:300, overflow:'auto' }}>
          <Typography variant="subtitle1">Registros fallidos:</Typography>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>RUT</TableCell>
                <TableCell>Factura</TableCell>
                <TableCell>Fecha</TableCell>
                <TableCell>Monto</TableCell>
                <TableCell>Motivo</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {result.detalles_fallidos.slice(0,50).map((r,i)=>(
                <TableRow key={i}>
                  <TableCell>{r.rut}</TableCell>
                  <TableCell>{r.invoice_number}</TableCell>
                  <TableCell>{r.invoice_date}</TableCell>
                  <TableCell>{r.net_amount}</TableCell>
                  <TableCell>{r.motivo}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {result.detalles_fallidos.length > 50 && <Typography variant="caption">Mostrando primeros 50 de {result.detalles_fallidos.length}.</Typography>}
        </Box>
      )}
    </Box>
  );
}

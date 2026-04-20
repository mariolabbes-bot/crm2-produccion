import React, { useState } from 'react';
import { 
  Paper, 
  Grid,
  Tabs,
  Tab,
  Box, 
  Button, 
  Typography, 
  Alert, 
  CircularProgress, 
  FormControlLabel, 
  Checkbox,
  Divider,
  List,
  ListItem,
  ListItemIcon,
  ListItemText
} from '@mui/material';
import { 
  DeleteSweep as CleanupIcon, 
  History as HistoryIcon, 
  Shield as ShieldIcon,
  Update as UpdateIcon 
} from '@mui/icons-material';
import { cleanupData } from '../../api';

const HistoricalCleanup = () => {
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleCleanup = async () => {
    if (!dryRun && !window.confirm('¿Estás seguro de que deseas eliminar definitivamente los datos históricos? Esta acción es irreversible.')) {
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const data = await cleanupData(dryRun);
      if (data.success) {
        setResult(data.results);
      } else {
        setError(data.error || 'Error desconocido al realizar limpieza');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 3, borderRadius: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2, gap: 1 }}>
        <CleanupIcon color="primary" sx={{ fontSize: 32 }} />
        <Typography variant="h5">Mantenimiento de Datos Históricos</Typography>
      </Box>

      <Typography variant="body1" sx={{ mb: 3, color: 'text.secondary' }}>
        Este proceso optimiza el sistema eliminando registros de ventas y abonos con más de <strong>24 meses</strong> de antigüedad.
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Política de Conservación:</Typography>
        <List size="small" sx={{ py: 0 }}>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><ShieldIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Se conservan todas las ventas con saldos pendientes (deudas vigentes)." />
          </ListItem>
          <ListItem sx={{ py: 0.5 }}>
            <ListItemIcon sx={{ minWidth: 32 }}><UpdateIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Se conservan los últimos 2 años de historia para comparativas bianuales." />
          </ListItem>
        </List>
      </Alert>

      <Box sx={{ bgcolor: 'rgba(0,0,0,0.02)', p: 2, borderRadius: 2, mb: 3, border: '1px solid rgba(0,0,0,0.05)' }}>
        <FormControlLabel
          control={
            <Checkbox 
              checked={dryRun} 
              onChange={(e) => setDryRun(e.target.checked)} 
              color="primary"
            />
          }
          label={
            <Box>
              <Typography variant="subtitle2">Modo Simulación (Dry Run)</Typography>
              <Typography variant="caption" color="text.secondary">
                Solo cuenta los registros afectados sin realizar cambios reales en la base de datos.
              </Typography>
            </Box>
          }
        />
      </Box>

      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
        <Button
          variant="contained"
          color={dryRun ? "primary" : "error"}
          onClick={handleCleanup}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={20} color="inherit" /> : <CleanupIcon />}
          sx={{ minWidth: 200, py: 1.2, fontWeight: 600 }}
        >
          {loading ? 'Procesando...' : dryRun ? 'Simular Limpieza' : 'Ejecutar Limpieza Real'}
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mt: 3 }}>
          {error}
        </Alert>
      )}

      {result && (
        <Box sx={{ mt: 4 }}>
          <Divider sx={{ mb: 2 }} />
          <Typography variant="subtitle1" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 600 }}>
            <HistoryIcon color="action" /> Resultados de la {result.isDryRun ? 'Simulación' : 'Limpieza'}:
          </Typography>
          
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(16, 185, 129, 0.05)' }}>
                <Typography variant="h4" color="success.main">{result.ventasEliminadas}</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary' }}>
                  Ventas {result.isDryRun ? 'a eliminar' : 'eliminadas'}
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6}>
              <Paper variant="outlined" sx={{ p: 2, textAlign: 'center', bgcolor: 'rgba(59, 130, 246, 0.05)' }}>
                <Typography variant="h4" color="primary.main">{result.abonosEliminados}</Typography>
                <Typography variant="caption" sx={{ textTransform: 'uppercase', fontWeight: 600, color: 'text.secondary' }}>
                  Abonos {result.isDryRun ? 'a eliminar' : 'eliminados'}
                </Typography>
              </Paper>
            </Grid>
          </Grid>
          
          {!result.isDryRun && (
            <Alert severity="success" sx={{ mt: 2 }}>
              La base de datos ha sido optimizada correctamente.
            </Alert>
          )}
        </Box>
      )}
    </Paper>
  );
};

export default HistoricalCleanup;

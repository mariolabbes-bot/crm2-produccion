import React, { useState } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Divider,
} from '@mui/material';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import * as api from '../../api';

/**
 * ContextoTab - Registro de antecedentes de gestión (texto libre)
 */
function ContextoTab({ clientId, data, onUpdate }) {
  const [contexto, setContexto] = useState(data || '');
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);

      if (!clientId) throw new Error('Cliente ID no disponible');
      
      await api.updateClient(clientId, { contexto });
      
      setSuccess(true);
      if (onUpdate) onUpdate();
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      console.error('Error guardando contexto:', err);
      setError(err.message || 'Error al guardar los antecedentes');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <InfoIcon color="primary" />
        <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
          Antecedentes de Gestión (Contexto)
        </Typography>
      </Box>

      <Paper sx={{ p: 3, borderRadius: 3, border: '1px solid #eee', bgcolor: '#fdfdfd' }}>
        <Typography variant="body2" sx={{ mb: 2, color: 'text.secondary' }}>
          Registra aquí información relevante sobre el cliente que ayude a la gestión comercial: nombre de encargados, mejores horarios, temas personales, etc. Este registro es permanente para consulta.
        </Typography>

        <TextField
          fullWidth
          multiline
          rows={12}
          variant="outlined"
          placeholder="Ejemplo: Encargado Juan Pérez. Atiende mejor después de las 16:00. Le interesa el fútbol. Su negocio es familiar..."
          value={contexto}
          onChange={(e) => setContexto(e.target.value)}
          disabled={saving}
          sx={{ 
            bgcolor: 'white',
            '& .MuiOutlinedInput-root': {
              borderRadius: 2
            }
          }}
        />

        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        {success && (
          <Alert severity="success" sx={{ mt: 2 }}>
            ✅ Información guardada correctamente
          </Alert>
        )}

        <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={saving ? <CircularProgress size={20} color="inherit" /> : <SaveIcon />}
            disabled={saving}
            onClick={handleSave}
            sx={{ 
              borderRadius: 3, 
              px: 4, 
              py: 1,
              fontWeight: 'bold',
              textTransform: 'none'
            }}
          >
            {saving ? 'Guardando...' : 'Guardar Antecedentes'}
          </Button>
        </Box>
      </Paper>

      <Box sx={{ mt: 4 }}>
        <Divider />
        <Stack direction="row" spacing={2} sx={{ mt: 2, p: 1, bgcolor: '#f5f5f5', borderRadius: 2 }}>
          <Typography variant="caption" sx={{ color: 'text.secondary' }}>
            <strong>Nota:</strong> Esta información es compartida con el equipo comercial y el manager.
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}

export default ContextoTab;

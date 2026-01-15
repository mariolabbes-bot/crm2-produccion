import React, { useState } from 'react';
import { Box, Paper, TextField, IconButton, List, ListItem, ListItemText, Button, Typography, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import axios from 'axios';

const ChatBox = ({ initialContext }) => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [lastParsed, setLastParsed] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editTo, setEditTo] = useState('');
  const [editText, setEditText] = useState('');
  
  const append = (role, text) => setMessages(m => [...m, { role, text }]);
  
  const handleSend = async () => {
    if (!input.trim()) return;
    append('user', input);
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const resp = await axios.post('/api/assistant/parse', { message: input, context: initialContext }, { headers: { Authorization: `Bearer ${token}` } });
      const parsed = resp.data.parsed;
      setLastParsed({ parsed, audit_id: resp.data.audit_id });
      append('assistant', parsed.suggestedAction.preview?.text || JSON.stringify(parsed));
      // prepare editable fields and open confirm dialog
      setEditTo(parsed.entities?.telefono || parsed.entities?.rut || '');
      setEditText(parsed.suggestedAction.preview?.text || '');
      setConfirmOpen(true);
    } catch (err) {
      append('assistant', 'Error parsing message');
    } finally {
      setLoading(false);
      setInput('');
    }
  };

  const handleConfirm = async () => {
    if (!lastParsed) return;
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      // Build action from editable fields
      const action = {
        type: lastParsed.parsed.suggestedAction.type,
        to: editTo,
        text: editText
      };
      const resp = await axios.post('/api/assistant/execute', { audit_id: lastParsed.audit_id, action }, { headers: { Authorization: `Bearer ${token}` } });
      append('assistant', `Acción encolada: job_id=${resp.data.job_id}`);
      setLastParsed(null);
      setConfirmOpen(false);
    } catch (err) {
      append('assistant', 'Error ejecutando acción');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Paper sx={{ p: 2 }} className="card-unified">
      <Typography variant="h6" sx={{ mb: 1 }}>Asistente (prototipo)</Typography>
      <List sx={{ maxHeight: 300, overflow: 'auto', mb: 1 }}>
        {messages.map((m, i) => (
          <ListItem key={i}><ListItemText primary={m.text} secondary={m.role} /></ListItem>
        ))}
      </List>
      <Box sx={{ display: 'flex', gap: 1 }}>
        <TextField fullWidth value={input} onChange={(e) => setInput(e.target.value)} placeholder="Escribe una instrucción (ej: enviar cotización a cliente 77555444-3)" />
        <IconButton color="primary" onClick={handleSend} disabled={loading}><SendIcon /></IconButton>
      </Box>
      
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle>Confirmar acción del Asistente</DialogTitle>
        <DialogContent>
          <Typography variant="caption" sx={{ display: 'block', mb: 1 }}>Editar destinatario y texto antes de ejecutar</Typography>
          <TextField fullWidth label="Para (teléfono o RUT)" value={editTo} onChange={(e) => setEditTo(e.target.value)} sx={{ mb: 1 }} />
          <TextField fullWidth multiline minRows={3} label="Texto" value={editText} onChange={(e) => setEditText(e.target.value)} />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleConfirm} variant="contained" disabled={loading}>Confirmar y Encolar</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default ChatBox;

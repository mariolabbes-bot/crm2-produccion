import React, { useState, useRef, useEffect } from 'react';
import {
    Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Button, IconButton, Typography, Box,
    Avatar, Paper, CircularProgress
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SendIcon from '@mui/icons-material/Send';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import PersonIcon from '@mui/icons-material/Person';
import axios from 'axios';
import { useAuth } from '../../contexts/AuthContext';

// Estilos bubble
const MessageBubble = ({ role, content }) => {
    const isUser = role === 'user';
    return (
        <Box sx={{
            display: 'flex',
            justifyContent: isUser ? 'flex-end' : 'flex-start',
            mb: 2
        }}>
            {!isUser && (
                <Avatar sx={{ bgcolor: '#1976d2', mr: 1, width: 32, height: 32 }}>
                    <SmartToyIcon fontSize="small" />
                </Avatar>
            )}
            <Paper sx={{
                p: 2,
                maxWidth: '75%',
                bgcolor: isUser ? '#e3f2fd' : '#f5f5f5',
                borderRadius: 2,
                borderTopRightRadius: isUser ? 0 : 2,
                borderTopLeftRadius: !isUser ? 0 : 2
            }}>
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>
                    {content}
                </Typography>
            </Paper>
            {isUser && (
                <Avatar sx={{ bgcolor: '#ff9800', ml: 1, width: 32, height: 32 }}>
                    <PersonIcon fontSize="small" />
                </Avatar>
            )}
        </Box>
    );
};

const ChatInterface = ({ open, onClose }) => {
    const { token } = useAuth();
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState([
        { role: 'system', content: '¡Hola! Soy tu asistente comercial. ¿En qué te puedo ayudar hoy?' }
    ]);
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim()) return;

        const userMsg = { role: 'user', content: input };
        setMessages(prev => [...prev, userMsg]);
        setInput('');
        setLoading(true);

        try {
            const res = await axios.post(
                `${process.env.REACT_APP_API_URL}/ai/chat`,
                { message: userMsg.content },
                { headers: { 'Authorization': token } }
            );

            const aiMsg = {
                role: 'assistant',
                content: res.data.content || 'No pude generar una respuesta.'
            };
            setMessages(prev => [...prev, aiMsg]);

        } catch (err) {
            console.error('Error chat:', err);
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: '⚠️ Error de conexión con el agente IA. Intenta más tarde.'
            }]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog
            open={open}
            onClose={onClose}
            fullWidth
            maxWidth="sm"
            PaperProps={{ sx: { height: '80vh', position: 'fixed', right: 20, bottom: 20, m: 0, borderRadius: 3 } }}
        >
            <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', bgcolor: '#1976d2', color: 'white' }}>
                <Box display="flex" alignItems="center">
                    <AutoAwesomeIcon sx={{ mr: 1 }} /> Asistente IA
                </Box>
                <IconButton onClick={onClose} sx={{ color: 'white' }}>
                    <CloseIcon />
                </IconButton>
            </DialogTitle>

            <DialogContent dividers sx={{ bgcolor: '#fafafa', display: 'flex', flexDirection: 'column' }}>
                <Box sx={{ flexGrow: 1, overflowY: 'auto', py: 2 }}>
                    {messages.filter(m => m.role !== 'system_hidden').map((msg, i) => (
                        <MessageBubble key={i} {...msg} />
                    ))}
                    {loading && (
                        <Box display="flex" justifyContent="flex-start" mb={2} ml={5}>
                            <CircularProgress size={20} />
                            <Typography variant="caption" sx={{ ml: 1 }}>Pensando...</Typography>
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>
            </DialogContent>

            <DialogActions sx={{ p: 2, bgcolor: 'white' }}>
                <TextField
                    fullWidth
                    variant="outlined"
                    placeholder="Escribe tu consulta..."
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                    disabled={loading}
                    size="small"
                />
                <Button
                    variant="contained"
                    endIcon={<SendIcon />}
                    onClick={handleSend}
                    disabled={loading || !input.trim()}
                >
                    Enviar
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// Icon import fallback
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';

export default ChatInterface;

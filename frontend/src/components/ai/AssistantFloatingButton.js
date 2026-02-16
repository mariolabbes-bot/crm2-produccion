import React, { useState } from 'react';
import { Fab, Tooltip } from '@mui/material';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import ChatInterface from './ChatInterface';
import { useAuth } from '../../contexts/AuthContext';

const AssistantFloatingButton = () => {
    const { user } = useAuth();
    const [open, setOpen] = useState(false);

    // Verificar Feature Flag
    const isAiEnabled = user?.features?.ai_module?.enabled;

    if (!isAiEnabled) return null;

    return (
        <>
            <Tooltip title="Asistente IA" placement="left">
                <Fab
                    color="primary"
                    aria-label="asistente"
                    onClick={() => setOpen(true)}
                    sx={{
                        position: 'fixed',
                        bottom: 20,
                        right: 20,
                        zIndex: 1000,
                        background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                        boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
                        '&:hover': {
                            transform: 'scale(1.1)',
                            transition: 'transform 0.2s'
                        }
                    }}
                >
                    <AutoAwesomeIcon />
                </Fab>
            </Tooltip>

            {open && (
                <ChatInterface open={open} onClose={() => setOpen(false)} />
            )}
        </>
    );
};

export default AssistantFloatingButton;

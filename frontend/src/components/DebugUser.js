import React, { useState } from 'react';
import { Box, Typography, Button, Paper } from '@mui/material';
import { useAuth } from '../contexts/AuthContext';

const DebugUser = () => {
    const { user } = useAuth();
    const [show, setShow] = useState(false);

    if (!show) {
        return (
            <Button
                onClick={() => setShow(true)}
                variant="outlined"
                size="small"
                sx={{ position: 'fixed', bottom: 10, left: 10, zIndex: 9999, opacity: 0.5 }}
            >
                Debug
            </Button>
        );
    }

    return (
        <Paper sx={{
            position: 'fixed',
            bottom: 50,
            left: 10,
            zIndex: 9999,
            p: 2,
            maxWidth: 400,
            maxHeight: 400,
            overflow: 'auto',
            border: '2px solid red'
        }}>
            <Typography variant="h6">Debug User Info</Typography>
            <pre style={{ fontSize: '10px' }}>
                {JSON.stringify(user, null, 2)}
            </pre>
            <Typography variant="caption" display="block">
                Features: {user?.features ? 'Present' : 'Missing'}
            </Typography>
            <Typography variant="caption" display="block">
                AI Enabled: {user?.features?.ai_module?.enabled ? 'YES' : 'NO'}
            </Typography>
            <Button onClick={() => setShow(false)}>Close</Button>
        </Paper>
    );
};

export default DebugUser;

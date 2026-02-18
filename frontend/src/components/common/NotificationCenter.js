import React, { useState, useEffect, useRef } from 'react';
import {
    IconButton,
    Badge,
    Menu,
    MenuItem,
    Typography,
    Box,
    Divider,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Button
} from '@mui/material';
import {
    Notifications as NotificationsIcon,
    CheckCircle as SuccessIcon,
    Error as ErrorIcon,
    Info as InfoIcon,
    Warning as WarningIcon,
    DoneAll as MarkReadIcon
} from '@mui/icons-material';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const NotificationCenter = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const open = Boolean(anchorEl);

    // Polling for notifications
    useEffect(() => {
        const fetchNotifications = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) return;

                const res = await fetch(`${API_URL}/notifications`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                const data = await res.json();

                if (data.success) {
                    setNotifications(data.data);
                    setUnreadCount(data.data.length);
                }
            } catch (err) {
                console.error('Error fetching notifications:', err);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 30000); // Poll every 30s
        return () => clearInterval(interval);
    }, []);

    const handleClick = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
    };

    const handleMarkAsRead = async (id, event) => {
        event.stopPropagation();
        try {
            const token = localStorage.getItem('token');
            await fetch(`${API_URL}/notifications/${id}/read`, {
                method: 'PUT',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            // Optimistic update
            setNotifications(prev => prev.filter(n => n.id !== id));
            setUnreadCount(prev => Math.max(0, prev - 1));
        } catch (err) {
            console.error('Error marking as read', err);
        }
    };

    const getIcon = (type) => {
        switch (type) {
            case 'success': return <SuccessIcon color="success" />;
            case 'error': return <ErrorIcon color="error" />;
            case 'warning': return <WarningIcon color="warning" />;
            default: return <InfoIcon color="info" />;
        }
    };

    return (
        <>
            <IconButton
                onClick={handleClick}
                sx={{
                    color: '#6B7280',
                    '&:hover': {
                        backgroundColor: 'rgba(229, 122, 45, 0.1)',
                        color: '#E57A2D'
                    }
                }}
            >
                <Badge badgeContent={unreadCount} color="error">
                    <NotificationsIcon />
                </Badge>
            </IconButton>

            <Menu
                anchorEl={anchorEl}
                open={open}
                onClose={handleClose}
                PaperProps={{
                    elevation: 4,
                    sx: { width: 360, maxHeight: 480, mt: 1.5 }
                }}
                transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
            >
                <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" fontSize="1rem" fontWeight="bold">Notificaciones</Typography>
                    {notifications.length > 0 && (
                        <Typography variant="caption" color="text.secondary">{notifications.length} nuevas</Typography>
                    )}
                </Box>
                <Divider />

                {notifications.length === 0 ? (
                    <Box sx={{ p: 3, textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">
                            No tienes notificaciones nuevas.
                        </Typography>
                    </Box>
                ) : (
                    <List sx={{ p: 0 }}>
                        {notifications.map((notif) => (
                            <React.Fragment key={notif.id}>
                                <ListItem alignItems="flex-start"
                                    secondaryAction={
                                        <IconButton edge="end" size="small" onClick={(e) => handleMarkAsRead(notif.id, e)}>
                                            <MarkReadIcon fontSize="small" />
                                        </IconButton>
                                    }
                                >
                                    <ListItemIcon sx={{ minWidth: 40, mt: 0.5 }}>
                                        {getIcon(notif.type)}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={notif.title}
                                        secondary={
                                            <React.Fragment>
                                                <Typography
                                                    sx={{ display: 'inline' }}
                                                    component="span"
                                                    variant="body2"
                                                    color="text.primary"
                                                >
                                                    {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </Typography>
                                                {" — " + notif.message}
                                            </React.Fragment>
                                        }
                                    />
                                </ListItem>
                                <Divider component="li" />
                            </React.Fragment>
                        ))}
                    </List>
                )}
            </Menu>
        </>
    );
};

export default NotificationCenter;

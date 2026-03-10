
import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Paper, BottomNavigation, BottomNavigationAction, Box } from '@mui/material';
import {
    Home as HomeIcon,
    People as ClientsIcon,
    ShoppingCart as OrdersIcon,
    Menu as MenuIcon,
    Map as MapIcon
} from '@mui/icons-material';

const BottomNav = () => {
    const navigate = useNavigate();
    const location = useLocation();

    const getCurrentValue = () => {
        const path = location.pathname;
        if (path.startsWith('/ventas')) return 0;
        if (path === '/' || path.startsWith('/ruta') || path.startsWith('/mapa')) return 1;
        if (path.startsWith('/clientes')) return 2;
        if (path.startsWith('/dashboard') || path.startsWith('/home')) return 3; // Home/Dashboard
        return 1; // Default to Rutas if unknown
    };

    const [value, setValue] = React.useState(getCurrentValue());

    // Actualizar valor si cambia la ruta externamente
    React.useEffect(() => {
        setValue(getCurrentValue());
    }, [location.pathname]);

    return (
        <Paper
            sx={{
                position: 'fixed',
                bottom: 0,
                left: 0,
                right: 0,
                zIndex: 1000,
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}
            elevation={3}
        >
            <Box sx={{ position: 'relative' }}>
                <BottomNavigation
                    showLabels
                    value={value}
                    onChange={(event, newValue) => {
                        setValue(newValue);
                        switch (newValue) {
                            case 0:
                                navigate('/ventas');
                                break;
                            case 1:
                                navigate('/mapa-visitas');
                                break;
                            case 2:
                                navigate('/clientes');
                                break;
                            case 3:
                                navigate('/');
                                break;
                            default:
                                break;
                        }
                    }}
                    sx={{
                        height: 70,
                        bgcolor: '#FFFFFF',
                        '& .MuiBottomNavigationAction-root': {
                            minWidth: 'auto',
                            padding: '6px 0',
                        },
                        '& .Mui-selected': {
                            color: '#E57A2D !important', // Naranja Lubricar
                        },
                        '& .MuiBottomNavigationAction-label': {
                            fontSize: '0.7rem',
                            fontWeight: 600,
                        }
                    }}
                >
                    <BottomNavigationAction label="Ventas" icon={<OrdersIcon />} />

                    {/* Botón Central Rutas (Espaciador para el FAB si se usara, o estilizado directamente) */}
                    <BottomNavigationAction
                        label="Rutas"
                        icon={
                            <Box sx={{
                                bgcolor: value === 1 ? '#E57A2D' : '#1F2937',
                                color: 'white',
                                borderRadius: '50%',
                                p: 1.5,
                                mt: -4,
                                boxShadow: '0 4px 10px rgba(0,0,0,0.3)',
                                border: '4px solid white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <MapIcon sx={{ fontSize: '2rem' }} />
                            </Box>
                        }
                    />

                    <BottomNavigationAction label="Clientes" icon={<ClientsIcon />} />
                    <BottomNavigationAction label="Home" icon={<HomeIcon />} />
                </BottomNavigation>
            </Box>
        </Paper>
    );
};

export default BottomNav;

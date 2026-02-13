
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

    // Mapeo simple de rutas a índices o valores
    const getCurrentValue = () => {
        const path = location.pathname;
        if (path === '/' || path.startsWith('/ruta')) return 0;
        if (path.startsWith('/clientes')) return 1;
        if (path.startsWith('/pedidos') || path.startsWith('/ventas')) return 2;
        if (path.startsWith('/menu') || path.startsWith('/configuracion')) return 3;
        return 0;
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
                borderRadius: '16px 16px 0 0',
                overflow: 'hidden',
                boxShadow: '0 -4px 20px rgba(0,0,0,0.1)'
            }}
            elevation={3}
        >
            <BottomNavigation
                showLabels
                value={value}
                onChange={(event, newValue) => {
                    setValue(newValue);
                    switch (newValue) {
                        case 0:
                            navigate('/'); // Mi Ruta / Dashboard
                            break;
                        case 1:
                            navigate('/clientes');
                            break;
                        case 2:
                            navigate('/ventas'); // O '/pedidos' si creamos una vista específica
                            break;
                        case 3:
                            navigate('/configuracion'); // Menú expandido (pendiente)
                            break;
                        default:
                            break;
                    }
                }}
                sx={{
                    height: 65,
                    bgcolor: '#FFFFFF',
                    '& .Mui-selected': {
                        color: '#E57A2D !important', // Naranja Lubricar
                    },
                    '& .MuiBottomNavigationAction-label': {
                        fontSize: '0.75rem',
                        fontWeight: 600,
                        marginTop: '4px'
                    }
                }}
            >
                <BottomNavigationAction label="Mi Ruta" icon={<MapIcon />} />
                <BottomNavigationAction label="Clientes" icon={<ClientsIcon />} />
                <BottomNavigationAction label="Ventas" icon={<OrdersIcon />} />
                <BottomNavigationAction label="Menú" icon={<MenuIcon />} />
            </BottomNavigation>
        </Paper>
    );
};

export default BottomNav;

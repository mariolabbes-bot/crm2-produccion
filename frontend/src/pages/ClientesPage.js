import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  TextField,
  Grid,
  Paper,
  Typography,
  InputAdornment,
  Chip,
  CircularProgress,
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import WarningIcon from '@mui/icons-material/Warning';
import { getTopClientesByVentas, getClientesFacturasImpagas, searchClientes } from '../api';

const ClientesPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [topClientes, setTopClientes] = useState([]);
  const [facturasImpagas, setFacturasImpagas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchLoading, setSearchLoading] = useState(false);

  // Cargar datos iniciales
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [topData, impagasData] = await Promise.all([
        getTopClientesByVentas(),
        getClientesFacturasImpagas(),
      ]);
      setTopClientes(topData || []);
      setFacturasImpagas(impagasData || []);
    } catch (error) {
      console.error('Error cargando datos de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar clientes con debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchTerm.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const results = await searchClientes(searchTerm);
          setSearchResults(results || []);
        } catch (error) {
          console.error('Error buscando clientes:', error);
          setSearchResults([]);
        } finally {
          setSearchLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Formatear moneda
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  // Columnas para Top Clientes
  const topClientesColumns = [
    { 
      field: 'rut', 
      headerName: 'RUT', 
      width: 120,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'nombre', 
      headerName: 'Nombre', 
      flex: 1,
      minWidth: 200,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'ciudad', 
      headerName: 'Ciudad', 
      width: 130,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'total_ventas', 
      headerName: 'Ventas (12m)', 
      width: 150,
      headerClassName: 'data-grid-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    { 
      field: 'cantidad_ventas', 
      headerName: 'Transacciones', 
      width: 120,
      headerClassName: 'data-grid-header',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  // Columnas para Facturas Impagas
  const facturasImpagasColumns = [
    { 
      field: 'rut', 
      headerName: 'RUT', 
      width: 120,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'nombre', 
      headerName: 'Nombre', 
      flex: 1,
      minWidth: 180,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'monto_total_impago', 
      headerName: 'Monto Impago', 
      width: 140,
      headerClassName: 'data-grid-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#d32f2f' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    { 
      field: 'dias_mora', 
      headerName: 'Días Mora', 
      width: 110,
      headerClassName: 'data-grid-header',
      align: 'center',
      headerAlign: 'center',
      renderCell: (params) => (
        <Chip 
          label={`${Math.floor(params.value)} días`}
          color={params.value > 60 ? 'error' : 'warning'}
          size="small"
        />
      ),
    },
    { 
      field: 'cantidad_facturas_impagas', 
      headerName: 'Facturas', 
      width: 90,
      headerClassName: 'data-grid-header',
      align: 'center',
      headerAlign: 'center',
    },
  ];

  // Columnas para Búsqueda
  const searchColumns = [
    { 
      field: 'rut', 
      headerName: 'RUT', 
      width: 120,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'nombre', 
      headerName: 'Nombre', 
      flex: 1,
      minWidth: 200,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'ciudad', 
      headerName: 'Ciudad', 
      width: 130,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'telefono', 
      headerName: 'Teléfono', 
      width: 120,
      headerClassName: 'data-grid-header',
    },
    { 
      field: 'ventas_12m', 
      headerName: 'Ventas (12m)', 
      width: 150,
      headerClassName: 'data-grid-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#1976d2' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
  ];

  return (
    <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
      {/* Buscador */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Buscar cliente por nombre o RUT..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                {searchLoading ? <CircularProgress size={20} /> : <SearchIcon />}
              </InputAdornment>
            ),
          }}
          variant="outlined"
        />
        
        {/* Resultados de búsqueda */}
        {searchResults.length > 0 && (
          <Box sx={{ mt: 2, height: 400 }}>
            <Typography variant="subtitle2" gutterBottom>
              {searchResults.length} resultado(s) encontrado(s)
            </Typography>
            <DataGrid
              rows={searchResults}
              columns={searchColumns}
              getRowId={(row) => row.rut}
              pageSize={5}
              rowsPerPageOptions={[5, 10]}
              disableSelectionOnClick
              sx={{
                '& .data-grid-header': {
                  backgroundColor: '#f5f5f5',
                  fontWeight: 600,
                },
              }}
            />
          </Box>
        )}
      </Paper>

      {/* Grillas principales */}
      <Grid container spacing={3}>
        {/* Top 20 Clientes por Ventas */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <TrendingUpIcon sx={{ color: '#1976d2', mr: 1 }} />
              <Typography variant="h6" component="h2">
                Top 20 Clientes por Ventas
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Últimos 12 meses
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ flex: 1 }}>
                <DataGrid
                  rows={topClientes}
                  columns={topClientesColumns}
                  getRowId={(row) => row.rut}
                  pageSize={20}
                  rowsPerPageOptions={[20]}
                  disableSelectionOnClick
                  sx={{
                    '& .data-grid-header': {
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>

        {/* Clientes con Facturas Impagas */}
        <Grid item xs={12} lg={6}>
          <Paper sx={{ p: 3, height: '600px', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <WarningIcon sx={{ color: '#d32f2f', mr: 1 }} />
              <Typography variant="h6" component="h2">
                Clientes con Facturas Impagas
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Con ventas en últimos 3 meses y facturas pendientes &gt;30 días
            </Typography>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
                <CircularProgress />
              </Box>
            ) : (
              <Box sx={{ flex: 1 }}>
                <DataGrid
                  rows={facturasImpagas}
                  columns={facturasImpagasColumns}
                  getRowId={(row) => row.rut}
                  pageSize={20}
                  rowsPerPageOptions={[20]}
                  disableSelectionOnClick
                  sx={{
                    '& .data-grid-header': {
                      backgroundColor: '#f5f5f5',
                      fontWeight: 600,
                    },
                  }}
                />
              </Box>
            )}
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ClientesPage;

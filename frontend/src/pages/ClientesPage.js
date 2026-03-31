import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Container,
  Autocomplete,
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
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [inputValue, setInputValue] = useState('');
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
      console.log('🔍 Cargando datos de clientes...');
      const [topData, impagasData] = await Promise.all([
        getTopClientesByVentas(),
        getClientesFacturasImpagas(),
      ]);
      console.log('📊 Top Clientes recibidos:', topData);
      console.log('⚠️ Facturas Impagas recibidas:', impagasData);
      setTopClientes(topData || []);
      setFacturasImpagas(impagasData || []);
    } catch (error) {
      console.error('❌ Error cargando datos de clientes:', error);
    } finally {
      setLoading(false);
    }
  };

  // Buscar clientes con debounce (disparado por inputValue)
  useEffect(() => {
    const timer = setTimeout(async () => {
      const q = inputValue || '';
      if (q.trim().length >= 2) {
        setSearchLoading(true);
        try {
          const results = await searchClientes(q);
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
    }, 350);

    return () => clearTimeout(timer);
  }, [inputValue]);

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
      field: 'venta_mes_curso',
      headerName: 'Venta Mes Actual',
      width: 150,
      headerClassName: 'data-grid-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ fontWeight: 600, color: '#2e7d32' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
    },
    {
      field: 'venta_promedio_6m',
      headerName: 'Promedio (6m)',
      width: 150,
      headerClassName: 'data-grid-header',
      renderCell: (params) => (
        <Typography variant="body2" sx={{ color: '#666' }}>
          {formatCurrency(params.value)}
        </Typography>
      ),
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
          {params.value ? formatCurrency(params.value) : '-'}
        </Typography>
      ),
    },
  ];

  return (
    <Box sx={{ 
      height: 'calc(100vh - 110px)', // Ajuste para el TopBar y margin/padding
      display: 'flex', 
      flexDirection: 'column',
      overflow: 'hidden', // Bloquear scroll de página completo
      backgroundColor: '#f8fafc',
      p: 1
    }}>
      {/* Buscador */}
      <Paper elevation={0} sx={{ p: 2, mb: 3, borderRadius: 2, border: '1px solid #e2e8f0' }}>
        <Autocomplete
          freeSolo
          fullWidth
          options={searchResults}
          getOptionLabel={(option) => `${option.nombre} (${option.rut})`}
          inputValue={inputValue}
          onInputChange={(event, newInputValue) => setInputValue(newInputValue)}
          onChange={(event, value) => {
            if (value && value.rut) {
              navigate(`/cliente/${value.rut}`);
            }
          }}
          loading={searchLoading}
          renderInput={(params) => (
            <TextField
              {...params}
              placeholder="Buscar cliente por nombre o RUT..."
              InputProps={{
                ...params.InputProps,
                startAdornment: (
                  <InputAdornment position="start">
                    {searchLoading ? <CircularProgress size={20} /> : <SearchIcon color="primary" />}
                  </InputAdornment>
                ),
              }}
              variant="outlined"
              size="small"
            />
          )}
        />
      </Paper>

      {/* Contenedor Carrusel (Horizontal) */}
      <Box sx={{ 
        display: 'flex', 
        gap: { xs: 2, lg: 3 }, 
        flex: 1, 
        overflowX: 'auto', 
        pb: 2,
        scrollSnapType: 'x mandatory',
        '&::-webkit-scrollbar': { height: 8 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 4 },
        scrollbarWidth: 'thin'
      }}>
        {/* Top 20 Clientes por Ventas */}
        <Paper elevation={0} sx={{ 
          minWidth: { xs: '90%', sm: '80%', lg: 'calc(50% - 12px)' },
          scrollSnapAlign: 'center',
          flexShrink: 0,
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <TrendingUpIcon sx={{ color: '#1976d2', mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Top 20 Clientes por Ventas
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Últimos 12 meses
            </Typography>
          </Box>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <DataGrid
                rows={topClientes}
                columns={topClientesColumns}
                getRowId={(row) => row.rut}
                hideFooter
                onRowClick={(params) => navigate(`/cliente/${params.row.rut}`)}
                sx={{
                  border: 'none',
                  '& .data-grid-header': {
                    backgroundColor: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    textTransform: 'uppercase'
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            )}
          </Box>
        </Paper>

        {/* Clientes con Facturas Impagas */}
        <Paper elevation={0} sx={{ 
          minWidth: { xs: '90%', sm: '80%', lg: 'calc(50% - 12px)' },
          scrollSnapAlign: 'center',
          flexShrink: 0,
          display: 'flex', 
          flexDirection: 'column',
          borderRadius: 2,
          border: '1px solid #e2e8f0',
          overflow: 'hidden'
        }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #f1f5f9', bgcolor: '#fff' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
              <WarningIcon sx={{ color: '#d32f2f', mr: 1, fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700}>
                Clientes con Facturas Impagas
              </Typography>
            </Box>
            <Typography variant="caption" color="text.secondary">
              Ventas últimos 3 meses | Mora &gt; 30 días
            </Typography>
          </Box>
          <Box sx={{ flex: 1, width: '100%', minHeight: 0, overflow: 'hidden' }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
                <CircularProgress size={30} />
              </Box>
            ) : (
              <DataGrid
                rows={facturasImpagas}
                columns={facturasImpagasColumns}
                getRowId={(row) => row.rut}
                hideFooter
                onRowClick={(params) => navigate(`/cliente/${params.row.rut}`)}
                sx={{
                  border: 'none',
                  '& .data-grid-header': {
                    backgroundColor: '#f8fafc',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    color: '#64748b',
                    textTransform: 'uppercase'
                  },
                  '& .MuiDataGrid-cell': {
                    fontSize: '0.875rem'
                  }
                }}
              />
            )}
          </Box>
        </Paper>
      </Box>
    </Box>
  );
};

export default ClientesPage;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  Tabs,
  Tab,
  CircularProgress,
  Alert,
  Button,
  Typography,
  Container,
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

// API
import * as api from '../api';

// Sub-componentes
import ClientHeader from '../components/ClientDetail/ClientHeader';
import DeudaTab from '../components/ClientDetail/DeudaTab';
import VentasTab from '../components/ClientDetail/VentasTab';
import ProductosTab from '../components/ClientDetail/ProductosTab';
import ActividadesTab from '../components/ClientDetail/ActividadesTab';

/**
 * ClientDetailPage
 * Ficha de cliente con tabs para deuda, ventas, productos y actividades
 */
function ClientDetailPage() {
  const { rut } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Estado para cada tab
  const [cliente, setCliente] = useState(null);
  const [deuda, setDeuda] = useState(null);
  const [ventas, setVentas] = useState(null);
  const [productos, setProductos] = useState(null);
  const [actividades, setActividades] = useState(null);
  
  // Loading por tab
  const [loadingTabs, setLoadingTabs] = useState({
    deuda: false,
    ventas: false,
    productos: false,
    actividades: false,
  });

  // Cargar cliente info al montar
  useEffect(() => {
    const loadCliente = async () => {
      try {
        setLoading(true);
        setError(null);
        const result = await api.getClientDetail(rut);
        setCliente(result.data);
      } catch (err) {
        console.error('Error cargando cliente:', err);
        setError(err.message || 'Error al cargar información del cliente');
      } finally {
        setLoading(false);
      }
    };
    
    loadCliente();
  }, [rut]);

  // Cargar deuda cuando tab es 0
  useEffect(() => {
    if (tabValue === 0 && !deuda) {
      loadDeuda();
    }
  }, [tabValue]);

  // Cargar ventas cuando tab es 1
  useEffect(() => {
    if (tabValue === 1 && !ventas) {
      loadVentas();
    }
  }, [tabValue]);

  // Cargar productos cuando tab es 2
  useEffect(() => {
    if (tabValue === 2 && !productos) {
      loadProductos();
    }
  }, [tabValue]);

  // Cargar actividades cuando tab es 3
  useEffect(() => {
    if (tabValue === 3 && !actividades) {
      loadActividades();
    }
  }, [tabValue]);

  const loadDeuda = async () => {
    try {
      setLoadingTabs(prev => ({ ...prev, deuda: true }));
      const result = await api.getClientDeuda(rut);
      setDeuda(result.data);
    } catch (err) {
      console.error('Error cargando deuda:', err);
      setError(err.message);
    } finally {
      setLoadingTabs(prev => ({ ...prev, deuda: false }));
    }
  };

  const loadVentas = async () => {
    try {
      setLoadingTabs(prev => ({ ...prev, ventas: true }));
      const result = await api.getClientVentasMensual(rut);
      setVentas(result.data);
    } catch (err) {
      console.error('Error cargando ventas:', err);
      setError(err.message);
    } finally {
      setLoadingTabs(prev => ({ ...prev, ventas: false }));
    }
  };

  const loadProductos = async () => {
    try {
      setLoadingTabs(prev => ({ ...prev, productos: true }));
      const result = await api.getClientProductos6m(rut);
      setProductos(result.data);
    } catch (err) {
      console.error('Error cargando productos:', err);
      setError(err.message);
    } finally {
      setLoadingTabs(prev => ({ ...prev, productos: false }));
    }
  };

  const loadActividades = async () => {
    try {
      setLoadingTabs(prev => ({ ...prev, actividades: true }));
      const result = await api.getClientActividades(rut);
      setActividades(result.data);
    } catch (err) {
      console.error('Error cargando actividades:', err);
      setError(err.message);
    } finally {
      setLoadingTabs(prev => ({ ...prev, actividades: false }));
    }
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const handleActivityAdded = () => {
    // Recargar actividades
    setActividades(null);
    loadActividades();
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, display: 'flex', justifyContent: 'center' }}>
        <CircularProgress />
      </Container>
    );
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Volver
        </Button>
        <Alert severity="error">{error}</Alert>
      </Container>
    );
  }

  if (!cliente) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Button
          startIcon={<ArrowBackIcon />}
          onClick={() => navigate(-1)}
          sx={{ mb: 2 }}
        >
          Volver
        </Button>
        <Alert severity="warning">Cliente no encontrado</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Botón volver */}
      <Button
        startIcon={<ArrowBackIcon />}
        onClick={() => navigate(-1)}
        sx={{ mb: 2 }}
      >
        Volver
      </Button>

      {/* Header cliente */}
      <ClientHeader cliente={cliente} />

  {/* Card con tabs */}
  <Card className="card-unified" sx={{ mt: 3, boxShadow: 2 }}>
        <Tabs
          value={tabValue}
          onChange={handleTabChange}
          indicatorColor="primary"
          textColor="primary"
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: '1px solid #e0e0e0',
            backgroundColor: '#fafafa',
          }}
        >
          <Tab label="Deuda" />
          <Tab label="Ventas" />
          <Tab label="Productos" />
          <Tab label="Actividades" />
        </Tabs>

        <Box sx={{ p: 3 }}>
          {/* Tab 0: Deuda */}
          {tabValue === 0 && (
            <DeudaTab
              data={deuda}
              loading={loadingTabs.deuda}
              error={error}
            />
          )}

          {/* Tab 1: Ventas */}
          {tabValue === 1 && (
            <VentasTab
              data={ventas}
              loading={loadingTabs.ventas}
              error={error}
            />
          )}

          {/* Tab 2: Productos */}
          {tabValue === 2 && (
            <ProductosTab
              data={productos}
              loading={loadingTabs.productos}
              error={error}
            />
          )}

          {/* Tab 3: Actividades */}
          {tabValue === 3 && (
            <ActividadesTab
              rut={rut}
              data={actividades}
              loading={loadingTabs.actividades}
              error={error}
              onActivityAdded={handleActivityAdded}
            />
          )}
        </Box>
      </Card>
    </Container>
  );
}

export default ClientDetailPage;

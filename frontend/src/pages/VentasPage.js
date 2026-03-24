import React, { useState, useEffect } from 'react';
import {
    Container,
    Box,
    Typography,
    Paper,
    Grid,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    CircularProgress,
    Alert,
    Chip,
    TextField,
    InputAdornment,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    Divider,
    List,
    ListItem,
    ListItemText,
    Autocomplete
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import InventoryIcon from '@mui/icons-material/Inventory';
import { getVendedores, getVentasReport, searchProducts } from '../api';
import { useAuth } from '../contexts/AuthContext';
import ProductAnalyticsWidget from '../components/ProductAnalyticsWidget';
class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(error, info) { console.error('Error Boundary Caught:', error, info); }
  render() {
    if (this.state.hasError) return (
      <Box sx={{ p: 4, bgcolor: '#fee2e2', color: '#991b1b', borderRadius: 2 }}>
        <Typography variant="h4">🚨 React Frontend Crash</Typography>
        <Typography variant="body1" sx={{ mt: 2, fontFamily: 'monospace' }}>{this.state.error?.toString()}</Typography>
        <Typography variant="body2" sx={{ mt: 2 }}>Por favor copia este error y envíaselo al desarrollador.</Typography>
      </Box>
    );
    return this.props.children;
  }
}

const VentasPageContent = () => {
    const { user } = useAuth();
    const isManager = user?.rol?.toUpperCase() === 'MANAGER';

    const [vendedores, setVendedores] = useState([]);
    const [selectedVendedor, setSelectedVendedor] = useState('');
    const [categoria, setCategoria] = useState('TODOS LOS PRODUCTOS');
    const [sortBy, setSortBy] = useState('monto');
    const [searchTerm, setSearchTerm] = useState('');
    const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
    
    // Popup Ficha de Producto
    const [selectedProduct, setSelectedProduct] = useState(null);
    const [openDialog, setOpenDialog] = useState(false);

    const handleRowClick = (product) => {
        setSelectedProduct(product);
        setOpenDialog(true);
    };

    const handleCloseDialog = () => {
        setOpenDialog(false);
        setTimeout(() => setSelectedProduct(null), 300); // clear after animation
    };

    const [data, setData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (isManager) {
            getVendedores().then(res => {
                if (Array.isArray(res)) setVendedores(res);
                else if (res.success) setVendedores(res.data);
            });
        }
    }, [isManager]);

    // Timer logic to decouple keystrokes from backend search hits
    useEffect(() => {
        const timer = setTimeout(() => {
            setDebouncedSearchTerm(searchTerm);
        }, 500);
        return () => clearTimeout(timer);
    }, [searchTerm]);

    useEffect(() => {
        const loadReport = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await getVentasReport({
                    vendedor_id: selectedVendedor,
                    categoria: categoria,
                    sort_by: sortBy,
                    q: debouncedSearchTerm
                });
                if (res.success) {
                    setData(res.data);
                } else {
                    setError('Error al cargar el reporte');
                }
            } catch (err) {
                setError('Error de conexión con el servidor');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        loadReport();
    }, [selectedVendedor, categoria, sortBy, debouncedSearchTerm]);

    const formatMoney = (val) => {
        return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP' }).format(val);
    };

    const getVariationColor = (val) => {
        if (val > 0) return 'success.main';
        if (val < 0) return 'error.main';
        return 'text.secondary';
    };

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            {/* Header y Filtros */}
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 2 }}>
                <Box>
                    <Typography variant="h4" sx={{ fontWeight: 'bold', color: '#2B4F6F', mb: 1 }}>
                        Módulo de Ventas e Inventario
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Análisis detallado de rendimiento por producto, ventas históricas y stock global disponible.
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                    <Autocomplete
                        freeSolo
                        options={searchOptions}
                        getOptionLabel={(option) => typeof option === 'string' ? option : `${option.sku} - ${option.descripcion}`}
                        size="small"
                        sx={{ minWidth: 350, bgcolor: '#fff' }}
                        inputValue={searchTerm}
                        onInputChange={(event, newInputValue) => {
                            setSearchTerm(newInputValue);
                            if (newInputValue && newInputValue.length > 2) {
                                searchProducts({ q: newInputValue }).then(res => {
                                    if (res && res.success) setSearchOptions(res.data);
                                }).catch(err => console.error("Error global search", err));
                            } else {
                                setSearchOptions([]);
                            }
                        }}
                        onChange={(event, newValue) => {
                            if (newValue && typeof newValue === 'object') {
                                handleRowClick({
                                    descripcion: newValue.descripcion,
                                    cantidad_mes_actual: 'N/A (Búsqueda Directa)',
                                    volumen_dinero_mes_actual: null,
                                    stock_disponible: newValue.stock_disponible,
                                    stock_desglose: newValue.stock_desglose
                                });
                            }
                        }}
                        renderInput={(params) => (
                            <TextField
                                {...params}
                                placeholder="Buscar en toda la base de datos..."
                                InputProps={{
                                    ...params.InputProps,
                                    startAdornment: (
                                        <>
                                            <InputAdornment position="start" sx={{ ml: 1 }}>
                                                <SearchIcon />
                                            </InputAdornment>
                                            {params.InputProps.startAdornment}
                                        </>
                                    ),
                                }}
                            />
                        )}
                    />

                    {isManager && (
                        <FormControl sx={{ minWidth: 200 }} size="small">
                            <InputLabel>Vendedor</InputLabel>
                            <Select
                                value={selectedVendedor}
                                label="Vendedor"
                                onChange={(e) => setSelectedVendedor(e.target.value)}
                                sx={{ bgcolor: '#fff' }}
                            >
                                <MenuItem value="">Todos los Vendedores</MenuItem>
                                {vendedores.map(v => (
                                    <MenuItem key={v.id} value={v.rut}>{v.nombre || v.nombre_completo}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    )}

                    <FormControl sx={{ minWidth: 200 }} size="small">
                        <InputLabel>Categoría</InputLabel>
                        <Select
                            value={categoria}
                            label="Categoría"
                            onChange={(e) => setCategoria(e.target.value)}
                            sx={{ bgcolor: '#fff' }}
                        >
                            <MenuItem value="TODOS LOS PRODUCTOS">Todos los Productos</MenuItem>
                            <MenuItem value="APLUS TBR">APLUS TBR</MenuItem>
                            <MenuItem value="APLUS PCR">APLUS PCR</MenuItem>
                            <MenuItem value="LUBRICANTES">Lubricantes</MenuItem>
                            <MenuItem value="REENCAUCHE">Reencauche</MenuItem>
                        </Select>
                    </FormControl>

                    <FormControl sx={{ minWidth: 150 }} size="small">
                        <InputLabel>Orden por</InputLabel>
                        <Select
                            value={sortBy}
                            label="Orden por"
                            onChange={(e) => setSortBy(e.target.value)}
                            sx={{ bgcolor: '#fff' }}
                        >
                            <MenuItem value="monto">Monto ($)</MenuItem>
                            <MenuItem value="cantidad">Cantidad</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            {/* KPIs Cards */}
            <ProductAnalyticsWidget vendedorId={selectedVendedor} />

            {/* Tabla Detallada */}
            <Paper sx={{ p: 0, overflow: 'hidden', borderRadius: 2, boxShadow: 3 }}>
                <Box sx={{ p: 2, bgcolor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h6" sx={{ fontWeight: 'bold', color: '#2B4F6F' }}>
                        Top 20 Productos por {sortBy === 'monto' ? 'Volumen de Venta ($)' : 'Cantidad Vendida'}
                    </Typography>
                    {debouncedSearchTerm && (
                        <Typography variant="body2" color="primary" sx={{ fontWeight: 'bold' }}>
                            Filtrando resultados por: "{debouncedSearchTerm}"
                        </Typography>
                    )}
                </Box>

                {loading ? (
                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 8 }}>
                        <CircularProgress />
                    </Box>
                ) : error ? (
                    <Box sx={{ p: 4 }}><Alert severity="error">{error}</Alert></Box>
                ) : (
                    <TableContainer>
                        <Table sx={{ minWidth: 900 }}>
                            <TableHead sx={{ bgcolor: '#f1f5f9' }}>
                                <TableRow>
                                    <TableCell sx={{ fontWeight: 'bold' }}>Descripción de Producto</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Stock Disp.</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Mes Anterior</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#e2e8f0' }}>Mes Actual</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Litros (Act.)</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>% vs Año Ant.</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>% vs Prom. 6m</TableCell>
                                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Volumen Dinero</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {data.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                            No se encontraron ventas para los filtros seleccionados.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    data.map((row, index) => (
                                        <TableRow 
                                            key={index} 
                                            hover 
                                            onClick={() => handleRowClick(row)}
                                            sx={{ cursor: 'pointer' }}
                                        >
                                            <TableCell sx={{ fontWeight: 500 }}>{row.descripcion}</TableCell>
                                            <TableCell align="right">
                                                <Tooltip 
                                                    title={
                                                        row.stock_desglose 
                                                        ? <Box sx={{ p: 0.5 }}>{Object.entries(row.stock_desglose).map(([k,v]) => <Typography key={k} variant="body2" sx={{ fontSize: '0.8rem' }}>{k}: <strong>{v}</strong></Typography>)}</Box> 
                                                        : 'Sin stock en sucursales'
                                                    }
                                                    arrow
                                                    placement="top"
                                                >
                                                    <Chip 
                                                        size="small" 
                                                        label={row.stock_disponible || 0} 
                                                        color={row.stock_disponible > 0 ? 'success' : 'error'} 
                                                        variant={row.stock_disponible > 0 ? 'filled' : 'outlined'} 
                                                        sx={{ cursor: 'help' }}
                                                    />
                                                </Tooltip>
                                            </TableCell>
                                            <TableCell align="right">{row.cantidad_mes_anterior || 0}</TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', bgcolor: '#f8fafc' }}>
                                                {row.cantidad_mes_actual}
                                            </TableCell>
                                            <TableCell align="right">{row.litros_mes_actual > 0 ? row.litros_mes_actual.toLocaleString('es-CL') : '-'}</TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ color: getVariationColor(row.perc_vs_anio_ant), fontWeight: 'bold' }}>
                                                    {row.perc_vs_anio_ant > 0 ? '+' : ''}{row.perc_vs_anio_ant}%
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right">
                                                <Box sx={{ color: getVariationColor(row.perc_vs_prom_6m), fontWeight: 'bold' }}>
                                                    {row.perc_vs_prom_6m > 0 ? '+' : ''}{row.perc_vs_prom_6m}%
                                                </Box>
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
                                                {formatMoney(row.volumen_dinero_mes_actual)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Paper>

            {/* Modal de Ficha de Producto */}
            <Dialog 
                open={openDialog} 
                onClose={handleCloseDialog}
                maxWidth="sm"
                fullWidth
            >
                {selectedProduct && (
                    <>
                        <DialogTitle sx={{ bgcolor: '#2B4F6F', color: '#fff', fontWeight: 'bold' }}>
                            Ficha de Producto
                        </DialogTitle>
                        <DialogContent dividers>
                            <Box sx={{ mb: 3, mt: 1 }}>
                                <Typography variant="h6" gutterBottom>{selectedProduct.descripcion}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    Ventas Mes Actual: {selectedProduct.cantidad_mes_actual} | Volumen: {selectedProduct.volumen_dinero_mes_actual != null ? '$' + selectedProduct.volumen_dinero_mes_actual.toLocaleString('es-CL') : '$0'}
                                </Typography>
                            </Box>
                            
                            <Divider sx={{ my: 2 }} />
                            
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <InventoryIcon color="primary" /> Desglose de Stock en Bodegas
                            </Typography>
                            
                            {selectedProduct.stock_desglose ? (
                                <List dense sx={{ bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                    {Object.entries(selectedProduct.stock_desglose).map(([sucursal, cantidad], idx) => (
                                        <ListItem key={idx} divider={idx !== Object.keys(selectedProduct.stock_desglose).length - 1}>
                                            <ListItemText 
                                                primary={<Typography sx={{ fontWeight: 'bold' }}>{sucursal}</Typography>} 
                                            />
                                            <Chip label={`${cantidad} und`} size="small" color={cantidad > 0 ? "success" : "default"} variant={cantidad > 0 ? "filled" : "outlined"} />
                                        </ListItem>
                                    ))}
                                </List>
                            ) : (
                                <Alert severity="info" sx={{ mt: 2 }}>No hay inventario registrado en las bodegas para este producto.</Alert>
                            )}
                            
                            <Box sx={{ mt: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', px: 2, py: 1, bgcolor: '#e2e8f0', borderRadius: 2 }}>
                                    Stock Total Disponible: {selectedProduct.stock_disponible || 0}
                                </Typography>
                            </Box>
                        </DialogContent>
                        <DialogActions sx={{ px: 3, py: 2 }}>
                            <Button onClick={handleCloseDialog} color="primary" variant="contained" disableElevation>
                                Cerrar
                            </Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Container>
    );
};

const VentasPage = (props) => (
  <ErrorBoundary>
    <VentasPageContent {...props} />
  </ErrorBoundary>
);

export default VentasPage;

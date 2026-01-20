import React, { useState, useEffect } from 'react';
import { Grid, Box, FormControl, InputLabel, Select, MenuItem, Typography, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import {
  ShoppingCart as VentasIcon,
  Payment as AbonosIcon,
  People as ClientesIcon,
  Inventory as ProductosIcon,
} from '@mui/icons-material';
import KPICard from '../components/KPICard';
import ImportStatsWidget from '../components/ImportStatsWidget';
import ChartContainer from '../components/ChartContainer';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getKpisMesActual, getEvolucionMensual, getVentasPorFamilia, getVendedores, getSaldoCreditoTotal, getRankingVendedores, API_URL } from '../api';
import { useAuth } from '../contexts/AuthContext';

const DashboardPage = () => {
  const { user, isManager } = useAuth();
  const [vendedores, setVendedores] = useState([]);
  const [vendedorSeleccionado, setVendedorSeleccionado] = useState('todos');
  const [kpis, setKpis] = useState({
    ventasMes: 0,
    abonosMes: 0,
    promedioTrimestre: 0,
    clientesActivos: 0,
    saldoCreditoTotal: 0,
    trendVentas: 0,
    trendAbonos: 0,
    trendPromedioTrimestre: 0,
  });
  const [evolucionMensual, setEvolucionMensual] = useState([]);
  const [ventasPorFamilia, setVentasPorFamilia] = useState([]);
  const [rankingVendedores, setRankingVendedores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista de vendedores si es manager
  useEffect(() => {
    const fetchVendedores = async () => {
      if (isManager()) {
        try {
          const vendedoresData = await getVendedores();
          console.log('📋 Vendedores recibidos:', vendedoresData);
          console.log('📋 Cantidad:', vendedoresData?.length);
          setVendedores(vendedoresData || []);
        } catch (error) {
          console.error('Error cargando vendedores:', error);
        }
      }
    };
    fetchVendedores();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        // Construir parámetros según el vendedor seleccionado
        const params = {};
        if (isManager() && vendedorSeleccionado !== 'todos') {
          params.vendedor_id = vendedorSeleccionado;
        }

        console.log('🔄 Cargando dashboard con params:', params);
        console.log('🔄 Vendedor seleccionado:', vendedorSeleccionado);

        // KPIs del mes actual
        // Añadir timestamp para evitar caché
        params._t = Date.now();

        const kpisResponse = await getKpisMesActual(params);
        const kpisData = kpisResponse.data || kpisResponse; // Manejar ambos formatos

        // Saldo Crédito Total
        const saldoCreditoResponse = await getSaldoCreditoTotal(params);
        const saldoCreditoData = saldoCreditoResponse.data || saldoCreditoResponse;

        console.log('📊 KPIs recibidos:', kpisData);
        console.log('💳 Saldo Crédito recibido:', saldoCreditoData);

        setKpis({
          ventasMes: kpisData.monto_ventas_mes || 0,
          abonosMes: kpisData.monto_abonos_mes || 0,
          promedioTrimestre: kpisData.promedio_ventas_trimestre_anterior || 0,
          clientesActivos: kpisData.numero_clientes_con_venta_mes || 0,
          saldoCreditoTotal: saldoCreditoData.total_saldo_credito || 0,
          trendVentas: kpisData.variacion_vs_anio_anterior_pct || 0,
          // Calcular % de abonos respecto a ventas del mes
          trendAbonos: kpisData.monto_ventas_mes > 0
            ? (kpisData.monto_abonos_mes / kpisData.monto_ventas_mes) * 100
            : 0,
          // Calcular % de ventas mes actual vs promedio trimestre anterior
          trendPromedioTrimestre: kpisData.promedio_ventas_trimestre_anterior > 0
            ? ((kpisData.monto_ventas_mes - kpisData.promedio_ventas_trimestre_anterior) / kpisData.promedio_ventas_trimestre_anterior) * 100
            : 0,
        });

        // Evolución mensual (últimos 12 meses)
        const evolucion = await getEvolucionMensual();
        setEvolucionMensual(evolucion || []);

        // Ventas por familia de productos
        const familias = await getVentasPorFamilia();
        setVentasPorFamilia(familias || []);

        // Ranking de Vendedores
        if (isManager()) {
          const rankingData = await getRankingVendedores();
          if (rankingData && rankingData.success && rankingData.data) {
            setRankingVendedores(rankingData.data);
          } else {
            setRankingVendedores([]);
          }
        }
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vendedorSeleccionado]); // Re-cargar cuando cambie el vendedor seleccionado

  // Formatear números como moneda chilena
  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Box className="dashboard-page-container">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Dashboard General (v2.9)</Typography>

      {/* Widget de última importación */}
      <div className="card-unified">
        <ImportStatsWidget />
      </div>

      {/* Selector de vendedor (solo para managers) */}
      {isManager() && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth>
            <InputLabel id="vendedor-select-label">Filtrar por Vendedor</InputLabel>
            <Select
              labelId="vendedor-select-label"
              id="vendedor-select"
              value={vendedorSeleccionado}
              label="Filtrar por Vendedor"
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
            >
              <MenuItem value="todos">Todos los vendedores</MenuItem>
              {vendedores.map((v) => (
                <MenuItem key={v.id} value={v.id}>
                  {v.nombre}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Fila 1: KPIs principales */}
      <Grid container spacing={3} sx={{ mb: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(kpis.ventasMes)}
            subtitle="vs mes anterior"
            trend={kpis.trendVentas}
            color="#10B981"
            icon={<VentasIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Abonos del Mes"
            value={formatCurrency(kpis.abonosMes)}
            subtitle="de las ventas"
            trend={kpis.trendAbonos}
            trendAsPercentage={true}
            color="#3478C3"
            icon={<AbonosIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Promedio Trimestre"
            value={formatCurrency(kpis.promedioTrimestre)}
            subtitle={kpis.promedioTrimestre > 0 ? (
              ((kpis.ventasMes - kpis.promedioTrimestre) / kpis.promedioTrimestre * 100).toFixed(1) + '% vs mes actual'
            ) : 'vs mes actual'
            }
            trend={kpis.trendPromedioTrimestre}
            color="#A855F7"
            icon={<ClientesIcon />}
            loading={loading}
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <KPICard
            title="Saldo Crédito Total"
            value={formatCurrency(kpis.saldoCreditoTotal)}
            subtitle={isManager() && vendedorSeleccionado !== 'todos' ? 'del vendedor' : (isManager() ? 'global' : 'tu cartera')}
            color="#E57A2D"
            icon={<ProductosIcon />}
            loading={loading}
          />
        </Grid>
      </Grid>

      {/* Fila 2: Gráficos */}
      <Grid container spacing={3}>
        {/* Evolución Mensual */}
        <Grid item xs={12} md={8}>
          <ChartContainer
            title="Evolución Mensual"
            subtitle="Ventas y Abonos últimos 12 meses"
            loading={loading}
            height={350}
          >
            <ResponsiveContainer width="100%" height="100%">
              {evolucionMensual.length > 0 ? (
                <LineChart data={evolucionMensual}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                  <XAxis
                    dataKey="mes"
                    stroke="#6B7280"
                    style={{ fontSize: '0.875rem' }}
                  />
                  <YAxis
                    stroke="#6B7280"
                    style={{ fontSize: '0.875rem' }}
                    tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                  />
                  <Tooltip
                    formatter={(value) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      border: '1px solid #E5E7EB',
                      borderRadius: 8,
                    }}
                  />
                  <Legend
                    wrapperStyle={{ fontSize: '0.875rem' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="ventas"
                    stroke="#10B981"
                    strokeWidth={3}
                    name="Ventas"
                    dot={{ fill: '#10B981', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="abonos"
                    stroke="#3478C3"
                    strokeWidth={3}
                    name="Abonos"
                    dot={{ fill: '#3478C3', r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              ) : (
                <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', color: 'text.secondary' }}>
                  No hay datos históricos disponibles
                </Box>
              )}
            </ResponsiveContainer>
          </ChartContainer>
        </Grid>

        {/* Ventas por Familia */}
        <Grid item xs={12} md={4}>
          <ChartContainer
            title="Ventas por Familia"
            subtitle="Top 5 este mes"
            loading={loading}
            height={350}
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={ventasPorFamilia.slice(0, 5)} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis
                  type="number"
                  stroke="#6B7280"
                  style={{ fontSize: '0.75rem' }}
                  tickFormatter={(value) => `$${(value / 1000000).toFixed(1)}M`}
                />
                <YAxis
                  type="category"
                  dataKey="familia"
                  stroke="#6B7280"
                  style={{ fontSize: '0.75rem' }}
                  width={100}
                />
                <Tooltip
                  formatter={(value) => formatCurrency(value)}
                  contentStyle={{
                    backgroundColor: '#FFFFFF',
                    border: '1px solid #E5E7EB',
                    borderRadius: 8,
                  }}
                />
                <Bar
                  dataKey="total"
                  fill="#E57A2D"
                  radius={[0, 8, 8, 0]}
                  name="Total Ventas"
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Grid>
      </Grid>

      {/* Fila 3: Ranking de Vendedores (Solo Manager) */}
      {isManager() && (
        <Box sx={{ mt: 3 }}>
          <Paper className="card-unified chart-card" sx={{ p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
            <Typography variant="h6" sx={{ mb: 2 }}>Ranking Vendedores (Mes Actual)</Typography>
            <TableContainer sx={{ maxHeight: 400 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell sx={{ fontWeight: 'bold' }}>Vendedor</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ventas <br /><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Mes Actual)</span></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Abonos <br /><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Mes Actual)</span></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Prom. Ventas <br /><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Trim. Ant.)</span></TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold' }}>Ventas <br /><span style={{ fontSize: '0.75rem', fontWeight: 'normal' }}>(Año Ant.)</span></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {rankingVendedores.map((row) => (
                    <TableRow key={row.rut} hover>
                      <TableCell component="th" scope="row" sx={{ fontSize: '0.85rem' }}>
                        {row.nombre_vendedor}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#10B981', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {formatCurrency(row.ventas_mes_actual)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#3478C3', fontWeight: 'bold', fontSize: '0.85rem' }}>
                        {formatCurrency(row.abonos_mes_actual)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#A855F7', fontSize: '0.85rem' }}>
                        {formatCurrency(row.prom_ventas_trimestre_ant)}
                      </TableCell>
                      <TableCell align="right" sx={{ color: '#6B7280', fontSize: '0.85rem' }}>
                        {formatCurrency(row.ventas_anio_anterior)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {rankingVendedores.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} align="center">No hay datos disponibles</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Box>
      )}
    </Box>
  );
};

export default DashboardPage;

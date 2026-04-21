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
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { getKpisMesActual, getEvolucionMensual, getEvolucionYoy, getVendedores, getSaldoCreditoTotal, getRankingVendedores } from '../api';
import { useAuth } from '../contexts/AuthContext';

import MobileHomePage from './MobileHomePage';
import MobileManagerDashboard from './MobileManagerDashboard';
import useIsMobile from '../hooks/useIsMobile';

const DashboardPage = () => {
  const { isManager } = useAuth();
  const isMobile = useIsMobile();

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
  const [evolucionYoy, setEvolucionYoy] = useState([]);
  const [rankingVendedores, setRankingVendedores] = useState([]);
  const [loading, setLoading] = useState(true);

  // Cargar lista de vendedores si es manager
  useEffect(() => {
    const fetchVendedores = async () => {
      if (isManager()) {
        try {
          const vendedoresRes = await getVendedores();
          const vendedoresData = vendedoresRes.data || vendedoresRes;
          setVendedores(Array.isArray(vendedoresData) ? vendedoresData : []);
        } catch (error) {
          console.error('Error cargando vendedores:', error);
        }
      }
    };
    fetchVendedores();
  }, [isManager]);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const params = {};
        if (isManager() && vendedorSeleccionado !== 'todos') {
          params.vendedor_id = vendedorSeleccionado;
        }
        params._t = Date.now();

        // 1. Fetch KPIs
        const kpisResponse = await getKpisMesActual(params);
        const kpisData = kpisResponse.data || kpisResponse;

        // 2. Fetch Saldo Crédito
        const saldoCreditoResponse = await getSaldoCreditoTotal(params);
        const saldoCreditoData = saldoCreditoResponse.data || saldoCreditoResponse;

        setKpis({
          ventasMes: kpisData.monto_ventas_mes || 0,
          abonosMes: kpisData.monto_abonos_mes || 0,
          promedioTrimestre: kpisData.promedio_ventas_trimestre_anterior || 0,
          clientesActivos: kpisData.numero_clientes_con_venta_mes || 0,
          saldoCreditoTotal: saldoCreditoData.total_saldo_credito || 0,
          trendVentas: kpisData.variacion_vs_anio_anterior_pct || 0,
          trendAbonos: kpisData.monto_ventas_mes > 0
            ? (kpisData.monto_abonos_mes / kpisData.monto_ventas_mes) * 100
            : 0,
          trendPromedioTrimestre: kpisData.promedio_ventas_trimestre_anterior > 0
            ? ((kpisData.monto_ventas_mes - kpisData.promedio_ventas_trimestre_anterior) / kpisData.promedio_ventas_trimestre_anterior) * 100
            : 0,
        });

        // 3. Evolución mensual (Últimos 6 meses)
        const evolucion = await getEvolucionMensual(params);
        if (evolucion && Array.isArray(evolucion)) {
          const now = new Date();
          const currentMonthStr = now.toISOString().slice(0, 7);
          const pastMonths = evolucion.filter(item => item.mes < currentMonthStr);
          setEvolucionMensual(pastMonths.slice(-6));
        }

        // 4. Evolución YoY
        const yoyResponse = await getEvolucionYoy({ ...params, meses: 6 }).catch(() => []);
        setEvolucionYoy(Array.isArray(yoyResponse) ? yoyResponse : []);

        // 5. Ranking (Admin)
        if (isManager()) {
          const rankingData = await getRankingVendedores();
          if (rankingData && rankingData.success && rankingData.data) {
            setRankingVendedores(rankingData.data);
          }
        }
      } catch (error) {
        console.error('Error cargando datos del dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [vendedorSeleccionado, isManager]);

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency', currency: 'CLP',
      minimumFractionDigits: 0, maximumFractionDigits: 0,
    }).format(value);
  };

  if (isMobile) {
    return isManager() ? <MobileManagerDashboard /> : <MobileHomePage />;
  }

  return (
    <Box className="dashboard-page-container" sx={{ p: 2 }}>
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Dashboard General (v3.1)</Typography>

      {/* Ticker de importaciones */}
      <Box sx={{ mb: 3 }}>
        <ImportStatsWidget />
      </Box>

      {/* Carrusel de KPIs */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        gap: 2, 
        mb: 3,
        pb: 1,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,.15)', borderRadius: 3 }
      }}>
        <Box sx={{ minWidth: 280, flex: 1 }}>
          <KPICard
            title="Ventas del Mes"
            value={formatCurrency(kpis.ventasMes)}
            subtitle="vs mes anterior"
            trend={kpis.trendVentas}
            color="#10B981"
            icon={<VentasIcon />}
            loading={loading}
          />
        </Box>
        <Box sx={{ minWidth: 280, flex: 1 }}>
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
        </Box>
        <Box sx={{ minWidth: 280, flex: 1 }}>
          <KPICard
            title="Promedio Trimestre"
            value={formatCurrency(kpis.promedioTrimestre)}
            trend={kpis.trendPromedioTrimestre}
            color="#A855F7"
            icon={<ClientesIcon />}
            loading={loading}
          />
        </Box>
        <Box sx={{ minWidth: 280, flex: 1 }}>
          <KPICard
            title="Saldo Crédito Total"
            value={formatCurrency(kpis.saldoCreditoTotal)}
            subtitle={vendedorSeleccionado !== 'todos' ? 'del vendedor' : 'global'}
            color="#E57A2D"
            icon={<ProductosIcon />}
            loading={loading}
          />
        </Box>
      </Box>

      {/* Selector de vendedor */}
      {isManager() && (
        <Box sx={{ mb: 3 }}>
          <FormControl fullWidth size="small" sx={{ maxWidth: 300 }}>
            <InputLabel>Filtrar por Vendedor</InputLabel>
            <Select
              value={vendedorSeleccionado}
              label="Filtrar por Vendedor"
              onChange={(e) => setVendedorSeleccionado(e.target.value)}
            >
              <MenuItem value="todos">Todos los vendedores</MenuItem>
              {vendedores.map((v) => (
                <MenuItem key={v.rut} value={v.rut}>{v.nombre}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      )}

      {/* Carrusel de Gráficos */}
      <Box sx={{ 
        display: 'flex', 
        flexWrap: 'nowrap',
        overflowX: 'auto',
        overflowY: 'hidden',
        gap: 3, 
        mb: 3,
        pb: 2,
        '&::-webkit-scrollbar': { height: 6 },
        '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,.15)', borderRadius: 3 }
      }}>
        {/* Gráfico 1: Evolución Mensual */}
        <Box sx={{ minWidth: { xs: '100%', md: 700 }, flexShrink: 0 }}>
          <ChartContainer title="Evolución Mensual (Últimos 6 meses)" loading={loading} height={350}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucionMensual}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes" />
                <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="ventas" stroke="#10B981" strokeWidth={3} name="Ventas" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="abonos" stroke="#3478C3" strokeWidth={3} name="Abonos" dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Box>

        {/* Gráfico 2: Comparativo YoY */}
        <Box sx={{ minWidth: { xs: '100%', md: 700 }, flexShrink: 0 }}>
          <ChartContainer title="Comparativo YoY (Este Año vs Año Pasado)" loading={loading} height={350}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={evolucionYoy.length > 0 ? evolucionYoy : [
                { mes_actual_str: 'Sin Datos', ventas_actual: 0, ventas_anterior: 0 }
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="mes_actual_str" />
                <YAxis tickFormatter={(v) => `$${(v / 1000000).toFixed(1)}M`} />
                <Tooltip formatter={(v) => formatCurrency(v)} />
                <Legend />
                <Line type="monotone" dataKey="ventas_actual" stroke="#10B981" strokeWidth={3} name="Este Año" dot={{ r: 4 }} />
                <Line type="monotone" dataKey="ventas_anterior" stroke="#9CA3AF" strokeDasharray="5 5" name="Año Pasado" dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </ChartContainer>
        </Box>
      </Box>

      {/* TABLA RANKING (Admin) */}
      {isManager() && (
        <Paper sx={{ p: 2 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Ranking Vendedores (Mes Actual)</Typography>
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ backgroundColor: '#f9fafb' }}>
                  <TableCell sx={{ fontWeight: 700 }}>Vendedor</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Ventas</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Abonos</TableCell>
                  <TableCell align="right" sx={{ fontWeight: 700 }}>Prom. Trim</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {rankingVendedores.map((row) => (
                  <TableRow key={row.rut} hover>
                    <TableCell>{row.nombre_vendedor}</TableCell>
                    <TableCell align="right" sx={{ color: '#10B981', fontWeight: 600 }}>{formatCurrency(row.ventas_mes_actual)}</TableCell>
                    <TableCell align="right" sx={{ color: '#3478C3', fontWeight: 600 }}>{formatCurrency(row.abonos_mes_actual)}</TableCell>
                    <TableCell align="right">{formatCurrency(row.prom_ventas_trimestre_ant)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      )}
    </Box>
  );
};

export default DashboardPage;

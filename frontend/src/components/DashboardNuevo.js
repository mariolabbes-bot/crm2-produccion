import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, Avatar, Paper, Button, TextField, MenuItem, FormControl, InputLabel, Select, useTheme, useMediaQuery, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import VisionCard from './ui/VisionCard';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getVendedores, getSalesSummary, getEvolucionMensual, getEvolucionYoy, getClientsInactivosMesActual, getKPIsMesActual, getSaldoCreditoTotal, getRankingVendedores } from '../api';
import { removeToken, getUser } from '../utils/auth';
import './DashboardNuevo.css';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';

const COLORS = ['#667eea', '#43e97b', '#f093fb', '#fa709a', '#764ba2', '#38f9d7', '#f5576c', '#fee140'];


// Helper para calcular rango de fechas
const getDateRange = (months = 3) => {
  const now = new Date();
  const hasta = now.toISOString().split('T')[0];
  const desde = new Date(now.getFullYear(), now.getMonth() - months, 1).toISOString().split('T')[0];
  return { desde, hasta };
};

const DashboardNuevo = () => {
  const navigate = useNavigate();
  const user = getUser();
  const isManager = user?.rol?.toUpperCase() === 'MANAGER';
  const theme = useTheme();
  const isMdUp = useMediaQuery(theme.breakpoints.up('md'));
  const chartHeights = {
    line: isMdUp ? 300 : 220,
    pie: isMdUp ? 240 : 200,
    bar: isMdUp ? 220 : 200,
  };
  const tableMaxHeight = isMdUp ? 360 : 300;
  // Estado para clientes inactivos
  const [clientesInactivos, setClientesInactivos] = useState([]);
  const [loadingInactivos, setLoadingInactivos] = useState(false);
  const [errorInactivos, setErrorInactivos] = useState(null);
  const fetchInactivos = useCallback(async () => {
    console.log('[Inactivos] Cargando clientes inactivos...');
    setLoadingInactivos(true);
    setErrorInactivos(null);
    try {
      const params = {};
      if (isManager && filtroVendedor) {
        params.vendedor_id = filtroVendedor;
      }
      const data = await getClientsInactivosMesActual(params);
      console.log('[Inactivos] Respuesta:', data);
      setClientesInactivos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('[Inactivos] Error:', err);
      setErrorInactivos('Error al cargar clientes inactivos: ' + (err.message || ''));
      setClientesInactivos([]);
    } finally {
      setLoadingInactivos(false);
    }
  }, [isManager, filtroVendedor]);

  // Cargar clientes inactivos al montar
  useEffect(() => {
    fetchInactivos();
  }, [fetchInactivos]);

  const [stats, setStats] = useState(null);
  const [comparativo, setComparativo] = useState([]);
  const [evolucionYoy, setEvolucionYoy] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [comparativasMensuales, setComparativasMensuales] = useState(null);
  const [kpisMesActual, setKpisMesActual] = useState(null); // KPIs personalizados del mes actual
  const [saldoCreditoTotal, setSaldoCreditoTotal] = useState(null);
  const [ventasPorVendedor, setVentasPorVendedor] = useState([]); // Gráfico Admin
  const [rankingVendedores, setRankingVendedores] = useState([]); // Tabla Ranking
  const [loadingRanking, setLoadingRanking] = useState(false);
  // Datos pivoteados para la tabla inferior
  const [pivotMonths, setPivotMonths] = useState([]); // ['YYYY-MM', ...]
  const [pivotRows, setPivotRows] = useState([]);     // [{ vendedor_id, vendedor_nombre, 'YYYY-MM': {ventas, abonos}, totalVentas, totalAbonos }, ...]
  const [pivoteModo, setPivoteModo] = useState('ventas'); // 'ventas' | 'abonos' | 'ambos'
  const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'

  // Reordenar cuando cambie el orden o la métrica
  useEffect(() => {
    setPivotRows(prev => {
      const sorted = [...prev].sort((a, b) => {
        const getTotal = (r) => pivoteModo === 'abonos' ? (r.totalAbonos || 0) : (r.totalVentas || 0);
        const av = getTotal(a);
        const bv = getTotal(b);
        return sortDir === 'asc' ? av - bv : bv - av;
      });
      return sorted;
    });
  }, [sortDir, pivoteModo]);

  // Max por mes para heatmap
  const monthMax = React.useMemo(() => {
    const acc = {};
    pivotMonths.forEach(m => { acc[m] = 0; });
    pivotRows.forEach(row => {
      pivotMonths.forEach(m => {
        const v = row[m]?.ventas || 0;
        const a = row[m]?.abonos || 0;
        if (pivoteModo === 'ventas') acc[m] = Math.max(acc[m], v);
        else if (pivoteModo === 'abonos') acc[m] = Math.max(acc[m], a);
        else acc[m] = Math.max(acc[m], v + a);
      });
    });
    return acc;
  }, [pivotMonths, pivotRows, pivoteModo]);

  const getHeatStyle = (modo, month, valV, valA) => {
    // Para 'ambos' usamos intensidad cero para evitar ambigüedad visual
    if (modo === 'ambos') return { bgColor: 'transparent', color: 'inherit' };
    const max = monthMax[month] || 0;
    const val = modo === 'ventas' ? (valV || 0) : (valA || 0);
    if (!max || !val) return { bgColor: 'transparent', color: 'inherit' };
    // Intensidad 0.1 a 0.6
    const ratio = Math.min(1, val / max);
    const alpha = 0.1 + ratio * 0.5;
    const bgColor = modo === 'ventas' ? `rgba(102, 126, 234, ${alpha})` : `rgba(67, 233, 123, ${alpha})`;
    return { bgColor, color: '#111' };
  };

  const exportPivotCSV = () => {
    if (!pivotRows.length) return;
    let headers = ['Vendedor'];
    if (pivoteModo === 'ambos') {
      headers = headers.concat(pivotMonths.flatMap(m => [`${m} Ventas`, `${m} Abonos`]));
      headers.push('Total Ventas', 'Total Abonos');
    } else {
      headers = headers.concat(pivotMonths);
      headers.push('Total');
    }

    const data = pivotRows.map(r => {
      const row = { Vendedor: r.vendedor_nombre };
      if (pivoteModo === 'ambos') {
        pivotMonths.forEach(m => {
          row[`${m} Ventas`] = r[m]?.ventas || 0;
          row[`${m} Abonos`] = r[m]?.abonos || 0;
        });
        row['Total Ventas'] = r.totalVentas || 0;
        row['Total Abonos'] = r.totalAbonos || 0;
      } else if (pivoteModo === 'ventas') {
        pivotMonths.forEach(m => { row[m] = r[m]?.ventas || 0; });
        row['Total'] = r.totalVentas || 0;
      } else {
        pivotMonths.forEach(m => { row[m] = r[m]?.abonos || 0; });
        row['Total'] = r.totalAbonos || 0;
      }
      return row;
    });

    const csv = Papa.unparse({ fields: headers, data: data.map(d => headers.map(h => d[h] ?? '')) });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const prefix = pivoteModo === 'ambos' ? 'ventas_abonos' : pivoteModo;
    link.download = `pivote_${prefix}_${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportPivotXLSX = () => {
    if (!pivotRows.length) return;
    let headers = ['Vendedor'];
    if (pivoteModo === 'ambos') {
      headers = headers.concat(pivotMonths.flatMap(m => [`${m} Ventas`, `${m} Abonos`]));
      headers.push('Total Ventas', 'Total Abonos');
    } else {
      headers = headers.concat(pivotMonths);
      headers.push('Total');
    }

    const aoa = [headers];

    // Filas por vendedor
    pivotRows.forEach(r => {
      const row = [r.vendedor_nombre || ''];
      if (pivoteModo === 'ambos') {
        pivotMonths.forEach(m => {
          row.push(r[m]?.ventas || 0);
          row.push(r[m]?.abonos || 0);
        });
        row.push(r.totalVentas || 0);
        row.push(r.totalAbonos || 0);
      } else if (pivoteModo === 'ventas') {
        pivotMonths.forEach(m => { row.push(r[m]?.ventas || 0); });
        row.push(r.totalVentas || 0);
      } else {
        pivotMonths.forEach(m => { row.push(r[m]?.abonos || 0); });
        row.push(r.totalAbonos || 0);
      }
      aoa.push(row);
    });

    // Fila de totales al final
    const totalsRow = ['Total'];
    if (pivoteModo === 'ambos') {
      pivotMonths.forEach(m => {
        const totV = pivotRows.reduce((acc, r) => acc + (r[m]?.ventas || 0), 0);
        const totA = pivotRows.reduce((acc, r) => acc + (r[m]?.abonos || 0), 0);
        totalsRow.push(totV);
        totalsRow.push(totA);
      });
      totalsRow.push(pivotRows.reduce((a, r) => a + (r.totalVentas || 0), 0));
      totalsRow.push(pivotRows.reduce((a, r) => a + (r.totalAbonos || 0), 0));
    } else if (pivoteModo === 'ventas') {
      pivotMonths.forEach(m => {
        const totV = pivotRows.reduce((acc, r) => acc + (r[m]?.ventas || 0), 0);
        totalsRow.push(totV);
      });
      totalsRow.push(pivotRows.reduce((a, r) => a + (r.totalVentas || 0), 0));
    } else {
      pivotMonths.forEach(m => {
        const totA = pivotRows.reduce((acc, r) => acc + (r[m]?.abonos || 0), 0);
        totalsRow.push(totA);
      });
      totalsRow.push(pivotRows.reduce((a, r) => a + (r.totalAbonos || 0), 0));
    }
    aoa.push(totalsRow);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Pivote');
    const prefix = pivoteModo === 'ambos' ? 'ventas_abonos' : pivoteModo;
    XLSX.writeFile(wb, `pivote_${prefix}_${new Date().toISOString().slice(0, 10)}.xlsx`);
  };
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filtros
  const defaultRange = getDateRange(3);
  const [filtroVendedor, setFiltroVendedor] = useState('');
  const [filtroFechaDesde, setFiltroFechaDesde] = useState(defaultRange.desde);
  const [filtroFechaHasta, setFiltroFechaHasta] = useState(defaultRange.hasta);
  const [rangoRapido, setRangoRapido] = useState('3'); // meses

  useEffect(() => {
    loadData();
  }, [filtroVendedor, filtroFechaDesde, filtroFechaHasta]);

  const handleLogout = () => {
    removeToken();
    navigate('/login');
  };

  const handleRangoRapido = (meses) => {
    setRangoRapido(meses);
    const range = getDateRange(parseInt(meses, 10));
    setFiltroFechaDesde(range.desde);
    setFiltroFechaHasta(range.hasta);
  };

  const loadData = async () => {
    try {
      setLoading(true);
      // Construir parámetros de filtro
      const params = {
        agrupar: 'mes',
        fecha_desde: filtroFechaDesde,
        fecha_hasta: filtroFechaHasta
      };
      // Si es manager y seleccionó un vendedor, filtra por ese vendedor
      if (isManager && filtroVendedor) {
        params.vendedor_id = filtroVendedor;
      }
      // Si NO es manager, filtra por su propio RUT (backend espera RUT en vendedor_id)
      if (!isManager && user?.rut) {
        params.vendedor_id = user.rut;
      }
      const [vendedoresData, comparativasData, kpisMesData, saldoCreditoData, rankingData, yoyData] = await Promise.all([
        getVendedores().catch(e => { console.warn('⚠️ Falló getVendedores'); return []; }),
        getEvolucionMensual({ meses: 6 }).catch(e => { console.warn('⚠️ Falló getEvolucionMensual'); return []; }),
        getKPIsMesActual(params).catch(e => { console.warn('⚠️ Falló getKPIsMesActual'); return { success: false }; }),
        getSaldoCreditoTotal(params).catch(e => { console.warn('⚠️ Falló getSaldoCreditoTotal'); return { success: false }; }),
        (isManager ? getRankingVendedores().catch(e => ({ success: false, data: [] })) : Promise.resolve({ success: true, data: [] })),
        getEvolucionYoy({ meses: 6 }).catch(e => { console.warn('⚠️ Falló getEvolucionYoy'); return []; })
      ]);

      const validVendedores = Array.isArray(vendedoresData) ? vendedoresData : [];
      setVendedores(validVendedores);
      setComparativo(Array.isArray(comparativasData) ? comparativasData : []);
      setEvolucionYoy(Array.isArray(yoyData) ? yoyData : []);

      if (kpisMesData?.success && kpisMesData?.data) {
        setKpisMesActual(kpisMesData.data);
      } else {
        setKpisMesActual(null);
      }

      if (saldoCreditoData?.success && saldoCreditoData?.data) {
        setSaldoCreditoTotal(parseFloat(saldoCreditoData.data.total_saldo_credito || 0));
      } else {
        setSaldoCreditoTotal(0);
      }

      if (rankingData?.success && rankingData?.data) {
        setRankingVendedores(rankingData.data);
      } else {
        setRankingVendedores([]);
      }

      // Construir pivote: filas = vendedores, columnas = meses en rango, celdas = total_ventas
      const detalleComparativo = Array.isArray(comparativasData) ? comparativasData : [];

      // Generar lista de meses desde el rango seleccionado (YYYY-MM)
      const genMonthsInRange = (desdeStr, hastaStr) => {
        if (!desdeStr || !hastaStr) return [];
        const start = new Date(desdeStr + 'T00:00:00');
        const end = new Date(hastaStr + 'T00:00:00');
        const months = [];
        const d = new Date(start.getFullYear(), start.getMonth(), 1);
        while (d <= end) {
          const y = d.getFullYear();
          const m = String(d.getMonth() + 1).padStart(2, '0');
          months.push(`${y}-${m}`);
          d.setMonth(d.getMonth() + 1);
        }
        return months;
      };

      const months = genMonthsInRange(filtroFechaDesde, filtroFechaHasta);
      setPivotMonths(months);

      // Preparar mapas por (vendedor_id, periodo)
      const ventasMap = new Map(); // key: `${vendedor_id}|${periodo}` => total_ventas
      const abonosMap = new Map(); // key: `${vendedor_id}|${periodo}` => total_abonos
      for (const r of detalleComparativo) {
        const key = `${r.vendedor_id}|${r.periodo}`;
        const valV = parseFloat(r.total_ventas || 0) || 0;
        const valA = parseFloat(r.total_abonos || 0) || 0;
        ventasMap.set(key, (ventasMap.get(key) || 0) + valV);
        abonosMap.set(key, (abonosMap.get(key) || 0) + valA);
      }

      // Determinar filas: si manager y filtroVendedor, solo ese; si manager sin filtro, todos; si vendedor, solo el propio
      const vendorRowsBase = (() => {
        if (isManager) {
          if (params.vendedor_id) {
            const v = validVendedores.find(x => String(x.id) === String(params.vendedor_id));
            return v ? [v] : [];
          }
          return validVendedores;
        }
        // rol vendedor: solo el usuario
        return user ? [{ id: user.id, nombre: user.nombre }] : [];
      })();

      const rows = vendorRowsBase.map(v => {
        const row = { vendedor_id: v.id, vendedor_nombre: v.nombre };
        let totalV = 0;
        let totalA = 0;
        months.forEach(mm => {
          const key = `${v.id}|${mm}`;
          const valV = ventasMap.get(key) || 0;
          const valA = abonosMap.get(key) || 0;
          row[mm] = { ventas: valV, abonos: valA };
          totalV += valV;
          totalA += valA;
        });
        row.totalVentas = totalV;
        row.totalAbonos = totalA;
        return row;
      });

      // Ordenar por total según modo
      const sorted = [...rows].sort((a, b) => {
        const getTotal = (r) => pivoteModo === 'abonos' ? (r.totalAbonos || 0) : (r.totalVentas || 0);
        const av = getTotal(a);
        const bv = getTotal(b);
        return sortDir === 'asc' ? av - bv : bv - av;
      });

      setPivotRows(sorted);
    } catch (err) {
      console.error('❌ Error al cargar datos:', err);
      setError('Error al cargar datos: ' + (err.message || 'Error desconocido'));
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount || 0);
  };

  const dummyLine = [
    { mes: '2025-04', ventas: 10000000, abonos: 8000000 },
    { mes: '2025-05', ventas: 12000000, abonos: 9000000 },
    { mes: '2025-06', ventas: 11000000, abonos: 9500000 },
    { mes: '2025-07', ventas: 13000000, abonos: 11000000 },
    { mes: '2025-08', ventas: 14000000, abonos: 12000000 },
    { mes: '2025-09', ventas: 13500000, abonos: 12500000 },
  ];

  const dummyYoy = [
    { mes_actual_str: '2025-04', ventas_actual: 10000000, ventas_anterior: 8500000 },
    { mes_actual_str: '2025-05', ventas_actual: 12000000, ventas_anterior: 9500000 },
    { mes_actual_str: '2025-06', ventas_actual: 11000000, ventas_anterior: 10000000 },
    { mes_actual_str: '2025-07', ventas_actual: 13000000, ventas_anterior: 11500000 },
    { mes_actual_str: '2025-08', ventas_actual: 14000000, ventas_anterior: 12000000 },
    { mes_actual_str: '2025-09', ventas_actual: 13500000, ventas_anterior: 12500000 },
  ];

  const dummyPie = [
    { name: 'Cheque', value: 4000000 },
    { name: 'Transferencia', value: 7000000 },
    { name: 'Efectivo', value: 2000000 },
    { name: 'Crédito', value: 1000000 },
  ];

  return (
    <Box className="dashboard-nuevo-container">
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>Dashboard General (v2.3)</Typography>
        <Box>
          {isManager && (
            <Button
              variant="contained"
              onClick={() => navigate('/import-data')}
              sx={{ fontWeight: 600, mr: 2 }}
            >
              📊 Importar Datos
            </Button>
          )}
          <Button
            variant="outlined"
            color="error"
            onClick={handleLogout}
            sx={{ fontWeight: 600 }}
          >
            Cerrar Sesión
          </Button>
        </Box>
      </Box>

      {/* Filtros */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="h6" gutterBottom>Filtros</Typography>
        <Grid container spacing={2} alignItems="center">
          {/* Rango rápido */}
          <Grid item xs={12} sm={6} md={3}>
            <FormControl fullWidth size="small">
              <InputLabel>Rango rápido</InputLabel>
              <Select value={rangoRapido} onChange={(e) => handleRangoRapido(e.target.value)} label="Rango rápido">
                <MenuItem value="1">Último mes</MenuItem>
                <MenuItem value="3">Últimos 3 meses</MenuItem>
                <MenuItem value="6">Últimos 6 meses</MenuItem>
                <MenuItem value="12">Último año</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          {/* Fechas personalizadas */}
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Desde"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filtroFechaDesde}
              onChange={(e) => setFiltroFechaDesde(e.target.value)}
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              label="Hasta"
              type="date"
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
              value={filtroFechaHasta}
              onChange={(e) => setFiltroFechaHasta(e.target.value)}
            />
          </Grid>

          {/* Filtro vendedor (solo manager) */}
          {isManager && (
            <Grid item xs={12} sm={6} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Vendedor</InputLabel>
                <Select value={filtroVendedor} onChange={(e) => setFiltroVendedor(e.target.value)} label="Vendedor">
                  <MenuItem value="">Todos</MenuItem>
                  {vendedores.map(v => (
                    <MenuItem key={v.id} value={v.id}>{v.nombre}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          )}
        </Grid>
      </Paper>

      {error && <Typography color="error">{error}</Typography>}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Cargando dashboard...</Typography>
        </Box>
      ) : (
        <>
          {/* DEBUG: Mostrar estado de kpisMesActual */}
          {console.log('[RENDER VisionCards] kpisMesActual:', kpisMesActual)}
          {console.log('[RENDER VisionCards] kpisMesActual es null?:', kpisMesActual === null)}
          {console.log('[RENDER VisionCards] kpisMesActual es undefined?:', kpisMesActual === undefined)}

          {/* Métricas principales - KPIs del mes actual en CARRUSEL */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'nowrap',
            overflowX: 'auto', 
            gap: 3, 
            pb: 2, 
            mb: 1,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 6 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 3 }
          }}>
            {/* VisionCard #1: Venta Actual con % vs Año Anterior */}
            <Box sx={{ flex: 1, minWidth: { xs: '280px', lg: '300px' }, scrollSnapAlign: 'start', flexShrink: 0 }}>
              <VisionCard
                title="Venta Mes Actual"
                value={kpisMesActual ? formatMoney(kpisMesActual.monto_ventas_mes) : '—'}
                subtitle={kpisMesActual ? (
                  <span style={{
                    color: kpisMesActual.variacion_vs_anio_anterior_pct >= 0 ? '#27ae60' : '#e74c3c',
                    fontWeight: 600
                  }}>
                    {kpisMesActual.variacion_vs_anio_anterior_pct >= 0 ? '↑' : '↓'}
                    {' '}
                    {Math.abs(kpisMesActual.variacion_vs_anio_anterior_pct).toFixed(1)}% vs año anterior
                  </span>
                ) : '—'}
                trend={kpisMesActual && kpisMesActual.variacion_vs_anio_anterior_pct >= 0 ? 'up' : 'down'}
                icon="💰"
                gradient="primary"
              />
            </Box>

            {/* VisionCard #2: Abonos con % vs Ventas del Mes */}
            <Box sx={{ flex: 1, minWidth: { xs: '280px', lg: '300px' }, scrollSnapAlign: 'start', flexShrink: 0 }}>
              {console.log('[DEBUG Abonos]', {
                kpisMesActual,
                ventas: kpisMesActual?.monto_ventas_mes,
                abonos: kpisMesActual?.monto_abonos_mes,
                condicion: kpisMesActual && kpisMesActual.monto_ventas_mes > 0,
                calculo: kpisMesActual && kpisMesActual.monto_ventas_mes > 0
                  ? ((kpisMesActual.monto_abonos_mes / kpisMesActual.monto_ventas_mes) * 100).toFixed(1)
                  : 'N/A'
              })}
              <VisionCard
                title="Abonos Mes Actual"
                value={kpisMesActual ? formatMoney(kpisMesActual.monto_abonos_mes) : '—'}
                subtitle={
                  kpisMesActual && kpisMesActual.monto_ventas_mes > 0
                    ? `${((kpisMesActual.monto_abonos_mes / kpisMesActual.monto_ventas_mes) * 100).toFixed(1)}% de las ventas`
                    : 'Sin datos de ventas'
                }
                subtitleColor="#667eea"
                trend="neutral"
                icon="📊"
                gradient="success"
              />
            </Box>

            {/* VisionCard #3: Promedio Ventas Trimestre Anterior */}
            <Box sx={{ flex: 1, minWidth: { xs: '280px', lg: '300px' }, scrollSnapAlign: 'start', flexShrink: 0 }}>
              <VisionCard
                title="Promedio Ventas Trimestre"
                value={kpisMesActual ? formatMoney(kpisMesActual.promedio_ventas_trimestre_anterior) : '—'}
                subtitle={kpisMesActual && kpisMesActual.promedio_ventas_trimestre_anterior > 0 ? (
                  (() => {
                    const avg = kpisMesActual.promedio_ventas_trimestre_anterior;
                    const current = kpisMesActual.monto_ventas_mes || 0;
                    const diffPct = ((current - avg) / avg) * 100;
                    return (
                      <span style={{
                        color: diffPct >= 0 ? '#27ae60' : '#e74c3c',
                        fontWeight: 600
                      }}>
                        {diffPct >= 0 ? '↑' : '↓'} {Math.abs(diffPct).toFixed(1)}% vs mes actual
                      </span>
                    );
                  })()
                ) : '3 meses anteriores'}
                trend={kpisMesActual && (kpisMesActual.monto_ventas_mes || 0) >= kpisMesActual.promedio_ventas_trimestre_anterior ? 'up' : 'down'}
                icon="📈"
                gradient="warning"
              />
            </Box>

            {/* VisionCard #4: Saldos (Saldo Crédito Total) */}
            <Box sx={{ flex: 1, minWidth: { xs: '280px', lg: '300px' }, scrollSnapAlign: 'start', flexShrink: 0 }}>
              <VisionCard
                title="Saldo Crédito Total"
                value={saldoCreditoTotal != null ? formatMoney(saldoCreditoTotal) : '—'}
                subtitle={isManager && filtroVendedor ? 'Filtrado por vendedor' : (isManager ? 'Global' : 'Tu cartera')}
                trend="neutral"
                icon="💳"
                gradient="info"
              />
            </Box>
          </Box>

          {/* Gráficos en Carrusel Horizontal */}
          <Box sx={{ 
            display: 'flex', 
            flexWrap: 'nowrap',
            overflowX: 'auto', 
            gap: 3, 
            pb: 2, 
            mb: 3,
            scrollSnapType: 'x mandatory',
            '&::-webkit-scrollbar': { height: 8 },
            '&::-webkit-scrollbar-thumb': { backgroundColor: 'rgba(0,0,0,.2)', borderRadius: 4 }
          }}>
            {/* Gráfico 1: Ventas vs Abonos */}
            <Box sx={{ flex: '0 0 auto', width: { xs: '90vw', md: '600px', lg: '800px' }, scrollSnapAlign: 'start' }}>
              <Paper className="card-unified chart-card" sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Evolución Mensual (Últimos 6 meses)</Typography>
                <ResponsiveContainer width="100%" height={chartHeights.line}>
                  <LineChart data={comparativo?.length ? comparativo : dummyLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes"
                      tick={{ fontSize: isMdUp ? 12 : 10 }}
                      interval={isMdUp ? 0 : 'preserveStartEnd'}
                      angle={isMdUp ? 0 : -25}
                      dy={isMdUp ? 0 : 10}
                    />
                    <YAxis tick={{ fontSize: isMdUp ? 12 : 10 }} width={isMdUp ? 44 : 34} />
                    <Tooltip formatter={formatMoney} />
                    {isMdUp && <Legend />}
                    <Line type="monotone" dataKey="ventas" stroke="#10B981" strokeWidth={3} name="Ventas" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="abonos" stroke="#3478C3" strokeWidth={3} name="Abonos" dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Box>

            {/* Gráfico 2: Evolución Ventas YoY */}
            <Box sx={{ flex: '0 0 auto', width: { xs: '90vw', md: '600px', lg: '800px' }, scrollSnapAlign: 'start' }}>
              <Paper className="card-unified chart-card" sx={{ p: { xs: 2, md: 3 }, height: '100%' }}>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>Comparativo Ventas (Este Año vs Año Anterior)</Typography>
                <ResponsiveContainer width="100%" height={chartHeights.line}>
                  <LineChart data={(evolucionYoy && evolucionYoy.length > 0) ? evolucionYoy : dummyYoy}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="mes_actual_str"
                      tick={{ fontSize: isMdUp ? 12 : 10 }}
                      interval={isMdUp ? 0 : 'preserveStartEnd'}
                      angle={isMdUp ? 0 : -25}
                      dy={isMdUp ? 0 : 10}
                    />
                    <YAxis tick={{ fontSize: isMdUp ? 12 : 10 }} width={isMdUp ? 44 : 34} />
                    <Tooltip formatter={formatMoney} />
                    {isMdUp && <Legend />}
                    <Line type="monotone" dataKey="ventas_actual" stroke="#10B981" strokeWidth={3} name="Ventas Este Año" dot={{ r: 4 }} />
                    <Line type="monotone" dataKey="ventas_anterior" stroke="#A0AEC0" strokeDasharray="5 5" strokeWidth={2} name="Ventas Año Pasado" dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Box>
          </Box>

          {/* Top Vendedores (dummy) */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 }, overflow: 'hidden' }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Ranking Vendedores (Mes Actual)</Typography>
                <TableContainer sx={{ maxHeight: 300 }}>
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
                          <TableCell align="right" sx={{ color: '#667eea', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {formatMoney(row.ventas_mes_actual)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#43e97b', fontWeight: 'bold', fontSize: '0.85rem' }}>
                            {formatMoney(row.abonos_mes_actual)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#f6ad55', fontSize: '0.85rem' }}>
                            {formatMoney(row.prom_ventas_trimestre_ant)}
                          </TableCell>
                          <TableCell align="right" sx={{ color: '#a0aec0', fontSize: '0.85rem' }}>
                            {formatMoney(row.ventas_anio_anterior)}
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
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 } }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top Clientes (próximamente)</Typography>
                <Box sx={{ textAlign: 'center', color: '#aaa', mt: 6 }}>
                  <Typography variant="body1">En desarrollo...</Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>

          {/* Tabla: Top 20 Clientes Inactivos este Mes con Mayor Venta */}
          <Box sx={{ mt: 4 }}>
            <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                💤 Top 20 Clientes Inactivos este Mes (Mayor Venta Últimos 12 Meses)
                <Typography variant="caption" sx={{ ml: 2, color: '#666' }}>
                  {isManager ? 'Clientes con mayores ventas en los últimos 12 meses pero sin ventas este mes' : 'Tus mejores clientes que no han comprado este mes'}
                </Typography>
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="caption" sx={{ color: '#999' }}>
                  Build: {new Date().toISOString()}
                </Typography>
                <Button size="small" variant="outlined" onClick={fetchInactivos}>Recargar</Button>
              </Box>
              {errorInactivos && <Typography color="error">{errorInactivos}</Typography>}
              {loadingInactivos ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <LinearProgress />
                  <Typography sx={{ mt: 2 }}>Cargando clientes inactivos...</Typography>
                </Box>
              ) : (
                <div style={{ overflowX: 'auto', maxHeight: `${tableMaxHeight}px`, overflowY: 'auto' }}>
                  <table className="table-compact" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: isMdUp ? '0.95rem' : '0.9rem' }}>
                    <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                      <tr>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600, width: '38px' }}>#</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600, width: isMdUp ? '40%' : '46%' }}>Nombre</th>
                        <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600, width: isMdUp ? '22%' : '28%' }}>RUT</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600, width: isMdUp ? '14%' : '26%' }}>Monto Total</th>
                        <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600, width: isMdUp ? '14%' : '0' }}>Monto Promedio</th>
                        <th style={{ padding: '10px', textAlign: 'center', borderBottom: '2px solid #ddd', fontWeight: 600, width: '90px' }}>N° Facturas</th>
                        {isManager && (
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Vendedor</th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {clientesInactivos.length === 0 ? (
                        <tr>
                          <td colSpan={isManager ? 7 : 6} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                            <Typography variant="body1">❌ No hay clientes inactivos este mes</Typography>
                          </td>
                        </tr>
                      ) : (
                        clientesInactivos.map((cli, idx) => (
                          <tr key={cli.rut || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', fontWeight: 600, color: idx < 3 ? '#ff6b6b' : '#666' }}>{idx + 1}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }} title={cli.nombre}>{cli.nombre}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee' }} title={cli.rut}>{cli.rut}</td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 600, color: '#2196f3' }}>
                              ${parseFloat(cli.monto_total || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'right', color: '#666' }}>
                              {isMdUp ? `$${parseFloat(cli.monto_promedio || 0).toLocaleString('es-CL', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}` : ''}
                            </td>
                            <td style={{ padding: '10px', borderBottom: '1px solid #eee', textAlign: 'center' }}>{cli.num_ventas || 0}</td>
                            {isManager && (
                              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{isMdUp ? (cli.vendedor_nombre || '-') : ''}</td>
                            )}
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </Paper>
          </Box>

          {/* TABLAS COMPARATIVAS */}
          {comparativasMensuales && comparativasMensuales.comparativas && (
            <Grid container spacing={3} sx={{ mt: 2 }}>
              {/* Tabla 1: Mes actual vs promedio últimos 3 meses */}
              <Grid item xs={12} md={6}>
                <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    📈 Mes Actual vs Promedio 3 Meses
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666', mb: 2, display: 'block' }}>
                    Comparación del mes {comparativasMensuales.mes_actual} contra el promedio de {comparativasMensuales.meses_comparacion.join(', ')}
                  </Typography>
                  <div style={{ overflowX: 'auto', maxHeight: `${tableMaxHeight}px`, overflowY: 'auto' }}>
                    <table className="table-compact" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: isMdUp ? '0.85rem' : '0.82rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Vendedor</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Mes Actual</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Prom. 3M</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Var. $</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Var. %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparativasMensuales.comparativas.map((comp, idx) => {
                          const varPct = comp.variacion_promedio_porcentaje || 0;
                          const isPositive = varPct >= 0;
                          const colorPct = isPositive ? '#27ae60' : '#e74c3c';
                          const iconPct = isPositive ? '↑' : '↓';
                          return (
                            <tr key={comp.vendedor_id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{comp.vendedor_nombre}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatMoney(comp.mes_actual)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(comp.promedio_3_meses)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: colorPct }}>{formatMoney(comp.variacion_promedio_pesos)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: colorPct, fontWeight: 700 }}>
                                {iconPct} {Math.abs(varPct).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Paper>
              </Grid>

              {/* Tabla 2: Mes actual vs mismo mes año anterior */}
              <Grid item xs={12} md={6}>
                <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 } }}>
                  <Typography variant="h6" sx={{ mb: 2, fontWeight: 700 }}>
                    📅 Mes Actual vs Mismo Mes Año Anterior
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#666', mb: 2, display: 'block' }}>
                    Comparación del mes {comparativasMensuales.mes_actual} vs {comparativasMensuales.mes_anio_anterior}
                  </Typography>
                  <div style={{ overflowX: 'auto', maxHeight: `${tableMaxHeight}px`, overflowY: 'auto' }}>
                    <table className="table-compact" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: isMdUp ? '0.85rem' : '0.82rem' }}>
                      <thead style={{ position: 'sticky', top: 0, background: '#f5f5f5', zIndex: 1 }}>
                        <tr>
                          <th style={{ padding: '10px', textAlign: 'left', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Vendedor</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>2025</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>2024</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Var. $</th>
                          <th style={{ padding: '10px', textAlign: 'right', borderBottom: '2px solid #ddd', fontWeight: 600 }}>Var. %</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comparativasMensuales.comparativas.map((comp, idx) => {
                          const varPct = comp.variacion_anio_anterior_porcentaje || 0;
                          const isPositive = varPct >= 0;
                          const colorPct = isPositive ? '#27ae60' : '#e74c3c';
                          const iconPct = isPositive ? '↑' : '↓';
                          return (
                            <tr key={comp.vendedor_id} style={{ background: idx % 2 === 0 ? '#fff' : '#fafafa' }}>
                              <td style={{ padding: '10px', borderBottom: '1px solid #eee' }}>{comp.vendedor_nombre}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', fontWeight: 600 }}>{formatMoney(comp.mes_actual)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee' }}>{formatMoney(comp.mes_anio_anterior)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: colorPct }}>{formatMoney(comp.variacion_anio_anterior_pesos)}</td>
                              <td style={{ padding: '10px', textAlign: 'right', borderBottom: '1px solid #eee', color: colorPct, fontWeight: 700 }}>
                                {iconPct} {Math.abs(varPct).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Paper>
              </Grid>
            </Grid>
          )}

          {/* Tabla pivote: filas = vendedores, columnas = meses (ventas/abonos) */}
          <Box sx={{ mt: 4 }}>
            <Paper className="chart-card" sx={{ p: { xs: 2, md: 3 } }}>
              <Typography variant="h6" sx={{ mb: 2 }}>
                📊 Ventas por Vendedor por Mes
                <Typography variant="caption" sx={{ ml: 2, color: '#666' }}>
                  {pivotRows.length} vendedores mostrados
                </Typography>
              </Typography>
              {/* Selector de métrica para la tabla pivote */}
              <Box sx={{ mb: 2 }}>
                <FormControl size="small">
                  <InputLabel>Métrica</InputLabel>
                  <Select label="Métrica" value={pivoteModo} onChange={(e) => setPivoteModo(e.target.value)}>
                    <MenuItem value="ventas">Ventas</MenuItem>
                    <MenuItem value="abonos">Abonos</MenuItem>
                    <MenuItem value="ambos">Ambos</MenuItem>
                  </Select>
                </FormControl>
                <Button onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')} size="small" sx={{ ml: 2 }} variant="outlined">
                  Orden Total: {sortDir === 'asc' ? 'Asc' : 'Desc'}
                </Button>
                <Button onClick={() => exportPivotCSV()} size="small" sx={{ ml: 2 }} variant="contained">
                  Exportar CSV
                </Button>
                <Button onClick={() => exportPivotXLSX()} size="small" sx={{ ml: 1 }} variant="outlined">
                  Exportar XLSX
                </Button>
              </Box>
              <div style={{ overflowX: 'auto', maxHeight: `${isMdUp ? 500 : 360}px`, overflowY: 'auto' }}>
                <table className="table-compact" style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', fontSize: isMdUp ? '0.9rem' : '0.85rem' }}>
                  <thead style={{ position: 'sticky', top: 0, background: '#f3e5f5', zIndex: 1 }}>
                    <tr>
                      <th style={{ position: 'sticky', left: 0, zIndex: 2, background: '#f3e5f5', padding: '12px', borderBottom: '2px solid #667eea', textAlign: 'left', fontWeight: 600 }}>Vendedor</th>
                      {pivotMonths.map(m => (
                        <th key={m} style={{ padding: '12px', borderBottom: '2px solid #667eea', textAlign: 'right', fontWeight: 600 }}>{m}</th>
                      ))}
                      <th style={{ cursor: 'pointer', padding: '12px', borderBottom: '2px solid #667eea', textAlign: 'right', fontWeight: 600 }} onClick={() => setSortDir(sortDir === 'asc' ? 'desc' : 'asc')}>Total {sortDir === 'asc' ? '↑' : '↓'}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pivotRows.length === 0 ? (
                      <tr>
                        <td colSpan={pivotMonths.length + 2} style={{ textAlign: 'center', padding: '32px', color: '#999' }}>
                          <Typography variant="body1">❌ Sin datos en el rango seleccionado</Typography>
                          <Typography variant="caption">Ajusta el rango de fechas o revisa filtros</Typography>
                        </td>
                      </tr>
                    ) : (
                      pivotRows.map((row, idx) => (
                        <tr key={row.vendedor_id || idx} style={{ background: idx % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                          <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fff', padding: '12px', borderBottom: '1px solid #eee' }}>{row.vendedor_nombre || 'Sin vendedor'}</td>
                          {pivotMonths.map(m => {
                            const valV = row[m]?.ventas || 0;
                            const valA = row[m]?.abonos || 0;
                            const { bgColor, color } = getHeatStyle(pivoteModo, m, valV, valA);
                            return (
                              <td key={m} style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 500, backgroundColor: bgColor, color }}>
                                {pivoteModo === 'ventas' && (
                                  <span style={{ color: '#667eea', fontWeight: 600 }}>{formatMoney(valV)}</span>
                                )}
                                {pivoteModo === 'abonos' && (
                                  <span style={{ color: '#43e97b', fontWeight: 600 }}>{formatMoney(valA)}</span>
                                )}
                                {pivoteModo === 'ambos' && (
                                  <span>
                                    <span style={{ display: 'block', color: '#667eea', fontWeight: 600 }}>V: {formatMoney(valV)}</span>
                                    <span style={{ display: 'block', color: '#43e97b', fontWeight: 600 }}>A: {formatMoney(valA)}</span>
                                  </span>
                                )}
                              </td>
                            );
                          })}
                          <td style={{ padding: '12px', borderBottom: '1px solid #eee', textAlign: 'right', fontWeight: 700 }}>
                            {pivoteModo === 'ventas' && (
                              <span style={{ color: '#667eea' }}>{formatMoney(row.totalVentas || 0)}</span>
                            )}
                            {pivoteModo === 'abonos' && (
                              <span style={{ color: '#43e97b' }}>{formatMoney(row.totalAbonos || 0)}</span>
                            )}
                            {pivoteModo === 'ambos' && (
                              <span>
                                <span style={{ display: 'block', color: '#667eea' }}>V: {formatMoney(row.totalVentas || 0)}</span>
                                <span style={{ display: 'block', color: '#43e97b' }}>A: {formatMoney(row.totalAbonos || 0)}</span>
                              </span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                    {/* Fila de totales por mes */}
                    {pivotRows.length > 0 && (
                      <tr style={{ background: '#fafafa' }}>
                        <td style={{ position: 'sticky', left: 0, zIndex: 1, background: '#fafafa', padding: '12px', borderTop: '2px solid #ccc', fontWeight: 700 }}>Total</td>
                        {pivotMonths.map(m => {
                          const totV = pivotRows.reduce((acc, r) => acc += (r[m]?.ventas || 0), 0);
                          const totA = pivotRows.reduce((acc, r) => acc += (r[m]?.abonos || 0), 0);
                          return (
                            <td key={`tot-${m}`} style={{ padding: '12px', borderTop: '2px solid #ccc', textAlign: 'right', fontWeight: 700 }}>
                              {pivoteModo === 'ventas' && <span style={{ color: '#667eea' }}>{formatMoney(totV)}</span>}
                              {pivoteModo === 'abonos' && <span style={{ color: '#43e97b' }}>{formatMoney(totA)}</span>}
                              {pivoteModo === 'ambos' && (
                                <span>
                                  <span style={{ display: 'block', color: '#667eea' }}>V: {formatMoney(totV)}</span>
                                  <span style={{ display: 'block', color: '#43e97b' }}>A: {formatMoney(totA)}</span>
                                </span>
                              )}
                            </td>
                          );
                        })}
                        <td style={{ padding: '12px', borderTop: '2px solid #ccc', textAlign: 'right', fontWeight: 900 }}>
                          {pivoteModo === 'ventas' && <span style={{ color: '#667eea' }}>{formatMoney(pivotRows.reduce((a, r) => a + (r.totalVentas || 0), 0))}</span>}
                          {pivoteModo === 'abonos' && <span style={{ color: '#43e97b' }}>{formatMoney(pivotRows.reduce((a, r) => a + (r.totalAbonos || 0), 0))}</span>}
                          {pivoteModo === 'ambos' && (
                            <span>
                              <span style={{ display: 'block', color: '#667eea' }}>V: {formatMoney(pivotRows.reduce((a, r) => a + (r.totalVentas || 0), 0))}</span>
                              <span style={{ display: 'block', color: '#43e97b' }}>A: {formatMoney(pivotRows.reduce((a, r) => a + (r.totalAbonos || 0), 0))}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </Paper>
          </Box>
        </>
      )}
    </Box>
  );
};

export default DashboardNuevo;

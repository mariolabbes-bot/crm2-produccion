import React, { useEffect, useState } from 'react';
import { Box, Grid, Card, CardContent, Typography, LinearProgress, Avatar, Paper } from '@mui/material';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { getAbonosEstadisticas, getAbonosComparativo, getVendedores, getSalesSummary } from '../api';
import './DashboardNuevo.css';

const COLORS = ['#667eea', '#43e97b', '#f093fb', '#fa709a', '#764ba2', '#38f9d7', '#f5576c', '#fee140'];

const DashboardNuevo = () => {
  const [stats, setStats] = useState(null);
  const [comparativo, setComparativo] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [abonosStats, comparativoData, vendedoresData] = await Promise.all([
        getAbonosEstadisticas(),
        getAbonosComparativo({ agrupar: 'mes' }),
        getVendedores()
      ]);
      setStats(abonosStats.data);
      setComparativo(comparativoData.data);
      setVendedores(vendedoresData);
    } catch (err) {
      setError('Error al cargar datos');
    } finally {
      setLoading(false);
    }
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', minimumFractionDigits: 0 }).format(amount || 0);
  };

  // Dummy data fallback
  const dummyLine = [
    { periodo: '2025-04', ventas: 10000000, abonos: 8000000 },
    { periodo: '2025-05', ventas: 12000000, abonos: 9000000 },
    { periodo: '2025-06', ventas: 11000000, abonos: 9500000 },
    { periodo: '2025-07', ventas: 13000000, abonos: 11000000 },
    { periodo: '2025-08', ventas: 14000000, abonos: 12000000 },
    { periodo: '2025-09', ventas: 13500000, abonos: 12500000 },
  ];

  const dummyPie = [
    { name: 'Cheque', value: 4000000 },
    { name: 'Transferencia', value: 7000000 },
    { name: 'Efectivo', value: 2000000 },
    { name: 'Crédito', value: 1000000 },
  ];

  return (
    <Box className="dashboard-nuevo-container">
      <Typography variant="h4" sx={{ mb: 3, fontWeight: 700 }}>Dashboard General</Typography>
      {error && <Typography color="error">{error}</Typography>}
      {loading ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <LinearProgress />
          <Typography sx={{ mt: 2 }}>Cargando dashboard...</Typography>
        </Box>
      ) : (
        <>
          {/* Métricas principales */}
          <Grid container spacing={3} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="metric-card ventas">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">Total Ventas</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatMoney(comparativo?.resumen?.total_ventas)}</Typography>
                  <Typography variant="caption" color="primary">Últimos 6 meses</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="metric-card abonos">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">Total Abonos</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700 }}>{formatMoney(comparativo?.resumen?.total_abonos)}</Typography>
                  <Typography variant="caption" color="primary">Últimos 6 meses</Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="metric-card porcentaje">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">% Cobrado</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#27ae60' }}>{comparativo?.resumen?.porcentaje_cobrado_total}%</Typography>
                  <LinearProgress variant="determinate" value={parseFloat(comparativo?.resumen?.porcentaje_cobrado_total) || 0} sx={{ height: 8, borderRadius: 4, mt: 1 }} />
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Card className="metric-card saldo">
                <CardContent>
                  <Typography variant="subtitle2" color="textSecondary">Saldo Pendiente</Typography>
                  <Typography variant="h5" sx={{ fontWeight: 700, color: '#e74c3c' }}>{formatMoney(comparativo?.resumen?.saldo_pendiente)}</Typography>
                  <Typography variant="caption" color="primary">Por cobrar</Typography>
                </CardContent>
              </Card>
            </Grid>
          </Grid>

          {/* Gráficos principales */}
          <Grid container spacing={3}>
            <Grid item xs={12} md={8}>
              <Paper className="chart-card" sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Ventas vs Abonos (últimos 6 meses)</Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={comparativo?.detalle?.length ? comparativo.detalle.map(row => ({ periodo: row.periodo, ventas: row.total_ventas, abonos: row.total_abonos })) : dummyLine}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="periodo" />
                    <YAxis />
                    <Tooltip formatter={formatMoney} />
                    <Legend />
                    <Line type="monotone" dataKey="ventas" stroke="#667eea" strokeWidth={3} name="Ventas" />
                    <Line type="monotone" dataKey="abonos" stroke="#43e97b" strokeWidth={3} name="Abonos" />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
              <Paper className="chart-card" sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Distribución por Tipo de Pago</Typography>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie data={stats?.por_tipo_pago?.length ? stats.por_tipo_pago.map(tp => ({ name: tp.tipo_pago, value: tp.monto_total })) : dummyPie} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
                      {(stats?.por_tipo_pago?.length ? stats.por_tipo_pago : dummyPie).map((entry, idx) => (
                        <Cell key={`cell-${idx}`} fill={COLORS[idx % COLORS.length]} />
                      ))}
                    </Pie>
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
          </Grid>

          {/* Top Vendedores (dummy) */}
          <Grid container spacing={3} sx={{ mt: 1 }}>
            <Grid item xs={12} md={6}>
              <Paper className="chart-card" sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top Vendedores</Typography>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={vendedores?.length ? vendedores.map(v => ({ name: v.nombre, abonos: v.total_abonos || Math.random() * 10000000 })) : []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip formatter={formatMoney} />
                    <Bar dataKey="abonos" fill="#764ba2" name="Abonos" />
                  </BarChart>
                </ResponsiveContainer>
              </Paper>
            </Grid>
            <Grid item xs={12} md={6}>
              <Paper className="chart-card" sx={{ p: 3 }}>
                <Typography variant="h6" sx={{ mb: 2 }}>Top Clientes (próximamente)</Typography>
                <Box sx={{ textAlign: 'center', color: '#aaa', mt: 6 }}>
                  <Typography variant="body1">En desarrollo...</Typography>
                </Box>
              </Paper>
            </Grid>
          </Grid>
        </>
      )}
    </Box>
  );
};

export default DashboardNuevo;

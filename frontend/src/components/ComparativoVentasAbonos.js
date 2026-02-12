import React, { useState, useEffect } from 'react';
import { getAbonosComparativo, getVendedores } from '../api';
import { getUser } from '../utils/auth';
import './ComparativoVentasAbonos.css';

const ComparativoVentasAbonos = () => {
  const [comparativo, setComparativo] = useState(null);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [filtros, setFiltros] = useState({
    vendedor_id: '',
    fecha_desde: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0], // Inicio del año
    fecha_hasta: new Date().toISOString().split('T')[0], // Hoy
    agrupar: 'mes'
  });

  const user = getUser();
  const isManager = user?.rol === 'manager';

  useEffect(() => {
    if (isManager) {
      loadVendedores();
    }
  }, []);

  useEffect(() => {
    loadComparativo();
  }, [filtros]);

  const loadVendedores = async () => {
    try {
      const data = await getVendedores();
      setVendedores(data || []);
    } catch (err) {
      console.error('Error loading vendedores:', err);
    }
  };

  const loadComparativo = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {};
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== '') {
          params[key] = filtros[key];
        }
      });

      const data = await getAbonosComparativo(params);
      setComparativo(data.data);
    } catch (err) {
      console.error('Error loading comparativo:', err);
      setError('Error al cargar comparativo');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(amount || 0);
  };

  const getPercentageColor = (percentage) => {
    const pct = parseFloat(percentage);
    if (pct >= 90) return '#27ae60'; // Verde
    if (pct >= 70) return '#f39c12'; // Naranja
    return '#e74c3c'; // Rojo
  };

  const getPeriodoLabel = (periodo, agrupar) => {
    if (!periodo) return '-';
    
    if (agrupar === 'mes') {
      const [year, month] = periodo.split('-');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      return `${months[parseInt(month) - 1]} ${year}`;
    }
    
    return periodo;
  };

  return (
    <div className="comparativo-container">
      <div className="comparativo-header">
        <h1>📊 Comparativo Ventas vs Abonos</h1>
        <p className="subtitle">Análisis de cobranza y saldos pendientes</p>
      </div>

      {/* Filtros */}
      <div className="filters-section">
        <h3>🔍 Filtros</h3>
        <div className="filters-grid">
          {isManager && (
            <div className="filter-group">
              <label>Vendedor</label>
              <select 
                name="vendedor_id" 
                value={filtros.vendedor_id} 
                onChange={handleFilterChange}
              >
                <option value="">Todos los vendedores</option>
                {vendedores.map(v => (
                  <option key={v.id} value={v.id}>{v.nombre}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="filter-group">
            <label>Desde</label>
            <input 
              type="date" 
              name="fecha_desde" 
              value={filtros.fecha_desde} 
              onChange={handleFilterChange}
            />
          </div>
          
          <div className="filter-group">
            <label>Hasta</label>
            <input 
              type="date" 
              name="fecha_hasta" 
              value={filtros.fecha_hasta} 
              onChange={handleFilterChange}
            />
          </div>

          <div className="filter-group">
            <label>Agrupar por</label>
            <select 
              name="agrupar" 
              value={filtros.agrupar} 
              onChange={handleFilterChange}
            >
              <option value="dia">Día</option>
              <option value="mes">Mes</option>
              <option value="anio">Año</option>
            </select>
          </div>
        </div>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {loading ? (
        <div className="loading">
          <div className="spinner"></div>
          <p>Cargando comparativo...</p>
        </div>
      ) : comparativo ? (
        <>
          {/* Resumen General */}
          <div className="resumen-section">
            <h3>📈 Resumen General</h3>
            <div className="resumen-grid">
              <div className="resumen-card ventas">
                <div className="resumen-icon">🛒</div>
                <div className="resumen-content">
                  <div className="resumen-label">Total Ventas</div>
                  <div className="resumen-value">{formatMoney(comparativo.resumen.total_ventas)}</div>
                  <div className="resumen-count">{parseInt(comparativo.resumen.cantidad_ventas || 0).toLocaleString()} facturas</div>
                </div>
              </div>

              <div className="resumen-card abonos">
                <div className="resumen-icon">💰</div>
                <div className="resumen-content">
                  <div className="resumen-label">Total Abonos</div>
                  <div className="resumen-value">{formatMoney(comparativo.resumen.total_abonos)}</div>
                  <div className="resumen-count">{parseInt(comparativo.resumen.cantidad_abonos || 0).toLocaleString()} abonos</div>
                </div>
              </div>

              <div className="resumen-card saldo">
                <div className="resumen-icon">📊</div>
                <div className="resumen-content">
                  <div className="resumen-label">Saldo Pendiente</div>
                  <div className="resumen-value">{formatMoney(comparativo.resumen.saldo_pendiente)}</div>
                  <div className="resumen-subtitle">
                    {parseFloat(comparativo.resumen.saldo_pendiente) > 0 ? 'Por cobrar' : 'Superávit'}
                  </div>
                </div>
              </div>

              <div className="resumen-card porcentaje">
                <div className="resumen-icon">🎯</div>
                <div className="resumen-content">
                  <div className="resumen-label">% Cobrado</div>
                  <div 
                    className="resumen-value" 
                    style={{ color: getPercentageColor(comparativo.resumen.porcentaje_cobrado_total) }}
                  >
                    {comparativo.resumen.porcentaje_cobrado_total}%
                  </div>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ 
                        width: `${Math.min(parseFloat(comparativo.resumen.porcentaje_cobrado_total), 100)}%`,
                        backgroundColor: getPercentageColor(comparativo.resumen.porcentaje_cobrado_total)
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Detalle por Periodo */}
          <div className="detalle-section">
            <h3>📋 Detalle por {filtros.agrupar === 'mes' ? 'Mes' : filtros.agrupar === 'dia' ? 'Día' : 'Año'}</h3>
            <div className="table-container">
              <table className="comparativo-table">
                <thead>
                  <tr>
                    <th>Periodo</th>
                    {isManager && <th>Vendedor</th>}
                    <th>Ventas</th>
                    <th>Cant.</th>
                    <th>Abonos</th>
                    <th>Cant.</th>
                    <th>Diferencia</th>
                    <th>% Cobrado</th>
                  </tr>
                </thead>
                <tbody>
                  {comparativo.detalle.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 8 : 7} className="no-data">
                        No hay datos para el periodo seleccionado
                      </td>
                    </tr>
                  ) : (
                    comparativo.detalle.map((row, index) => (
                      <tr key={index}>
                        <td className="periodo">{getPeriodoLabel(row.periodo, filtros.agrupar)}</td>
                        {isManager && <td className="vendedor">{row.vendedor_nombre || 'N/A'}</td>}
                        <td className="monto ventas">{formatMoney(row.total_ventas)}</td>
                        <td className="cantidad">{parseInt(row.cantidad_ventas || 0).toLocaleString()}</td>
                        <td className="monto abonos">{formatMoney(row.total_abonos)}</td>
                        <td className="cantidad">{parseInt(row.cantidad_abonos || 0).toLocaleString()}</td>
                        <td className={`monto diferencia ${parseFloat(row.diferencia) < 0 ? 'negativo' : 'positivo'}`}>
                          {formatMoney(row.diferencia)}
                        </td>
                        <td>
                          <div className="porcentaje-cell">
                            <span style={{ color: getPercentageColor(row.porcentaje_cobrado) }}>
                              {row.porcentaje_cobrado}%
                            </span>
                            <div className="mini-progress">
                              <div 
                                className="mini-progress-fill"
                                style={{ 
                                  width: `${Math.min(parseFloat(row.porcentaje_cobrado), 100)}%`,
                                  backgroundColor: getPercentageColor(row.porcentaje_cobrado)
                                }}
                              ></div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Análisis */}
          <div className="analisis-section">
            <h3>💡 Análisis</h3>
            <div className="analisis-cards">
              {parseFloat(comparativo.resumen.porcentaje_cobrado_total) >= 90 ? (
                <div className="analisis-card success">
                  <div className="analisis-icon">✅</div>
                  <div className="analisis-content">
                    <h4>Excelente Gestión de Cobranza</h4>
                    <p>La eficiencia de cobro es superior al 90%. ¡Sigue así!</p>
                  </div>
                </div>
              ) : parseFloat(comparativo.resumen.porcentaje_cobrado_total) >= 70 ? (
                <div className="analisis-card warning">
                  <div className="analisis-icon">⚠️</div>
                  <div className="analisis-content">
                    <h4>Cobranza Moderada</h4>
                    <p>El porcentaje de cobro está entre 70-90%. Se recomienda revisar saldos pendientes.</p>
                  </div>
                </div>
              ) : (
                <div className="analisis-card danger">
                  <div className="analisis-icon">🚨</div>
                  <div className="analisis-content">
                    <h4>Atención Requerida</h4>
                    <p>El porcentaje de cobro es menor al 70%. Es urgente revisar la gestión de cobranza.</p>
                  </div>
                </div>
              )}

              {parseFloat(comparativo.resumen.total_abonos) > parseFloat(comparativo.resumen.total_ventas) && (
                <div className="analisis-card info">
                  <div className="analisis-icon">ℹ️</div>
                  <div className="analisis-content">
                    <h4>Abonos Mayores a Ventas</h4>
                    <p>Los abonos superan las ventas del periodo. Esto puede incluir pagos de periodos anteriores.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};

export default ComparativoVentasAbonos;

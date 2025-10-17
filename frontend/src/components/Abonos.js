import React, { useState, useEffect } from 'react';
import { 
  getAbonos, 
  getAbonosEstadisticas, 
  getTiposPago,
  getVendedores 
} from '../api';
import { getUserFromToken } from '../utils/auth';
import './Abonos.css';

const Abonos = () => {
  const [abonos, setAbonos] = useState([]);
  const [estadisticas, setEstadisticas] = useState(null);
  const [tiposPago, setTiposPago] = useState([]);
  const [vendedores, setVendedores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filtros
  const [filtros, setFiltros] = useState({
    vendedor_id: '',
    fecha_desde: '',
    fecha_hasta: '',
    tipo_pago: '',
    limit: 50,
    offset: 0
  });

  // Paginación
  const [pagination, setPagination] = useState({
    total: 0,
    pages: 0,
    currentPage: 1
  });

  const user = getUserFromToken();
  const isManager = user?.rol === 'manager';

  useEffect(() => {
    loadInitialData();
  }, []);

  useEffect(() => {
    loadAbonos();
  }, [filtros]);

  const loadInitialData = async () => {
    try {
      const [tiposData, statsData] = await Promise.all([
        getTiposPago(),
        getAbonosEstadisticas()
      ]);
      
      setTiposPago(tiposData.data || []);
      setEstadisticas(statsData.data);

      // Solo cargar vendedores si es manager
      if (isManager) {
        const vendedoresData = await getVendedores();
        setVendedores(vendedoresData || []);
      }
    } catch (err) {
      console.error('Error loading initial data:', err);
      setError('Error al cargar datos iniciales');
    }
  };

  const loadAbonos = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params = {};
      Object.keys(filtros).forEach(key => {
        if (filtros[key] !== '' && filtros[key] !== null) {
          params[key] = filtros[key];
        }
      });

      const data = await getAbonos(params);
      setAbonos(data.data || []);
      setPagination({
        total: data.pagination?.total || 0,
        pages: data.pagination?.pages || 0,
        currentPage: Math.floor(filtros.offset / filtros.limit) + 1
      });
    } catch (err) {
      console.error('Error loading abonos:', err);
      setError('Error al cargar abonos');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFiltros(prev => ({
      ...prev,
      [name]: value,
      offset: 0 // Reset pagination when filters change
    }));
  };

  const handlePageChange = (newPage) => {
    setFiltros(prev => ({
      ...prev,
      offset: (newPage - 1) * prev.limit
    }));
  };

  const clearFilters = () => {
    setFiltros({
      vendedor_id: '',
      fecha_desde: '',
      fecha_hasta: '',
      tipo_pago: '',
      limit: 50,
      offset: 0
    });
  };

  const formatMoney = (amount) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('es-CL');
  };

  return (
    <div className="abonos-container">
      <div className="abonos-header">
        <h1>💰 Abonos</h1>
        <p className="subtitle">Gestión y consulta de pagos recibidos</p>
      </div>

      {/* Estadísticas Resumen */}
      {estadisticas && (
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon">📊</div>
            <div className="stat-content">
              <div className="stat-label">Total Abonos</div>
              <div className="stat-value">{parseInt(estadisticas.resumen.total_abonos || 0).toLocaleString()}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">💵</div>
            <div className="stat-content">
              <div className="stat-label">Monto Total</div>
              <div className="stat-value">{formatMoney(estadisticas.resumen.monto_total)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">📈</div>
            <div className="stat-content">
              <div className="stat-label">Promedio</div>
              <div className="stat-value">{formatMoney(estadisticas.resumen.promedio_abono)}</div>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon">🏆</div>
            <div className="stat-content">
              <div className="stat-label">Abono Máximo</div>
              <div className="stat-value">{formatMoney(estadisticas.resumen.abono_maximo)}</div>
            </div>
          </div>
        </div>
      )}

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
            <label>Tipo de Pago</label>
            <select 
              name="tipo_pago" 
              value={filtros.tipo_pago} 
              onChange={handleFilterChange}
            >
              <option value="">Todos</option>
              {tiposPago.map(tipo => (
                <option key={tipo} value={tipo}>{tipo}</option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label>Registros por página</label>
            <select 
              name="limit" 
              value={filtros.limit} 
              onChange={handleFilterChange}
            >
              <option value="25">25</option>
              <option value="50">50</option>
              <option value="100">100</option>
              <option value="200">200</option>
            </select>
          </div>
        </div>
        
        <button className="btn-clear-filters" onClick={clearFilters}>
          🗑️ Limpiar Filtros
        </button>
      </div>

      {/* Lista de Abonos */}
      <div className="abonos-list-section">
        <div className="list-header">
          <h3>📋 Lista de Abonos</h3>
          <div className="pagination-info">
            Mostrando {abonos.length} de {pagination.total.toLocaleString()} registros
            {pagination.pages > 1 && ` (Página ${pagination.currentPage} de ${pagination.pages})`}
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
            <p>Cargando abonos...</p>
          </div>
        ) : (
          <>
            <div className="table-container">
              <table className="abonos-table">
                <thead>
                  <tr>
                    <th>Folio</th>
                    <th>Fecha</th>
                    <th>Cliente</th>
                    {isManager && <th>Vendedor</th>}
                    <th>Tipo Pago</th>
                    <th>Monto</th>
                    <th>Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {abonos.length === 0 ? (
                    <tr>
                      <td colSpan={isManager ? 7 : 6} className="no-data">
                        No se encontraron abonos con los filtros seleccionados
                      </td>
                    </tr>
                  ) : (
                    abonos.map(abono => (
                      <tr key={abono.id}>
                        <td className="folio">{abono.folio || '-'}</td>
                        <td>{formatDate(abono.fecha_abono)}</td>
                        <td className="cliente-nombre">{abono.cliente_nombre || '-'}</td>
                        {isManager && <td className="vendedor">{abono.vendedor_nombre}</td>}
                        <td>
                          <span className={`tipo-pago tipo-${abono.tipo_pago?.toLowerCase().replace(/[^a-z]/g, '')}`}>
                            {abono.tipo_pago || '-'}
                          </span>
                        </td>
                        <td className="monto">{formatMoney(abono.monto)}</td>
                        <td>
                          <span className="estado">{abono.descripcion || '-'}</span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginación */}
            {pagination.pages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => handlePageChange(1)}
                  disabled={pagination.currentPage === 1}
                >
                  ⏮️ Primera
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                >
                  ◀️ Anterior
                </button>
                
                <span className="page-info">
                  Página {pagination.currentPage} de {pagination.pages}
                </span>
                
                <button 
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.pages}
                >
                  Siguiente ▶️
                </button>
                <button 
                  onClick={() => handlePageChange(pagination.pages)}
                  disabled={pagination.currentPage === pagination.pages}
                >
                  Última ⏭️
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Distribución por Tipo de Pago */}
      {estadisticas?.por_tipo_pago && (
        <div className="tipo-pago-section">
          <h3>💳 Distribución por Tipo de Pago</h3>
          <div className="tipo-pago-grid">
            {estadisticas.por_tipo_pago.map(tp => (
              <div key={tp.tipo_pago} className="tipo-pago-card">
                <div className="tipo-pago-name">{tp.tipo_pago}</div>
                <div className="tipo-pago-amount">{formatMoney(tp.monto_total)}</div>
                <div className="tipo-pago-count">{parseInt(tp.cantidad).toLocaleString()} abonos</div>
                <div className="tipo-pago-avg">Promedio: {formatMoney(tp.promedio)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Abonos;

import { getToken } from './utils/auth';

// API URL con fallback para desarrollo y producción
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

const getAuthHeaders = () => {
  const token = getToken();
  return token ? { 'Authorization': `Bearer ${token}` } : {};
};

const apiFetch = async (url, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
    ...options.headers,
  };

  const response = await fetch(url, { ...options, headers });

  if (!response.ok) {
    let errorData = {};
    try { errorData = await response.json(); } catch (_) {}
    if (response.status === 401 || response.status === 403) {
      // Token inválido o expirado: limpiar y redirigir
      try { localStorage.removeItem('token'); } catch (_) {}
    }
    const error = new Error(errorData.msg || errorData.message || `API request failed (${response.status})`);
    error.status = response.status;
    error.response = { data: errorData };
    throw error;
  }

  // Handle responses with no content
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.indexOf('application/json') !== -1) {
    return await response.json();
  }
  return {}; // Return an empty object for non-JSON responses
};

// USERS - Vendedores
export const getVendedores = () => apiFetch(`${API_URL}/users/vendedores`);

// AUTH
export const login = (credentials) => apiFetch(`${API_URL}/users/login`, { method: 'POST', body: JSON.stringify(credentials) });
export const register = (userData) => apiFetch(`${API_URL}/users/register`, { method: 'POST', body: JSON.stringify(userData) });

// CLIENTS
export const getClients = () => apiFetch(`${API_URL}/clients`);
export const getClient = (id) => apiFetch(`${API_URL}/clients/${id}`);
export const addClient = (client) => apiFetch(`${API_URL}/clients`, { method: 'POST', body: JSON.stringify(client) });
export const updateClient = (id, client) => apiFetch(`${API_URL}/clients/${id}`, { method: 'PUT', body: JSON.stringify(client) });
export const deleteClient = (id) => apiFetch(`${API_URL}/clients/${id}`, { method: 'DELETE' });
export const bulkAddClients = (clients) => apiFetch(`${API_URL}/clients/bulk`, { method: 'POST', body: JSON.stringify(clients) });
export const getClientsInactivosMesActual = (params = {}) => {
  const qs = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/clients/inactivos-mes-actual${qs ? `?${qs}` : ''}`);
};

// ACTIVITIES (New generalized workflow)
export const getActivities = () => apiFetch(`${API_URL}/activities`);
export const getActivity = (id) => apiFetch(`${API_URL}/activities/${id}`);
export const createActivity = (activityData) => apiFetch(`${API_URL}/activities`, { method: 'POST', body: JSON.stringify(activityData) });
export const updateActivity = (id, activityData) => apiFetch(`${API_URL}/activities/${id}`, { method: 'PUT', body: JSON.stringify(activityData) });
export const closeActivity = (id, closureData) => apiFetch(`${API_URL}/activities/${id}/close`, { method: 'PUT', body: JSON.stringify(closureData) });
export const deleteActivity = (id) => apiFetch(`${API_URL}/activities/${id}`, { method: 'DELETE' });
export const getOverdueActivities = () => apiFetch(`${API_URL}/activities/overdue`);

// KPIS
export const getTopClients = () => apiFetch(`${API_URL}/kpis/top-clients`);
export const getSalesSummary = () => apiFetch(`${API_URL}/kpis/sales-summary`);
export const getKPIsMesActual = () => apiFetch(`${API_URL}/kpis/mes-actual`);
export const getKpisMesActual = () => apiFetch(`${API_URL}/kpis/mes-actual`);
export const getEvolucionMensual = () => apiFetch(`${API_URL}/kpis/evolucion-mensual`);
export const getVentasPorFamilia = () => apiFetch(`${API_URL}/kpis/ventas-por-familia`);

// ACTIVITY TYPES
export const getActivityTypes = () => apiFetch(`${API_URL}/activity-types`);
export const addActivityType = (type) => apiFetch(`${API_URL}/activity-types`, { method: 'POST', body: JSON.stringify(type) });
export const updateActivityType = (id, type) => apiFetch(`${API_URL}/activity-types/${id}`, { method: 'PUT', body: JSON.stringify(type) });
export const deleteActivityType = (id) => apiFetch(`${API_URL}/activity-types/${id}`, { method: 'DELETE' });

// GOALS
export const getGoalsForActivity = (activityId) => apiFetch(`${API_URL}/goals/activity/${activityId}`);
export const getGoals = () => apiFetch(`${API_URL}/goals`);
export const addGoal = (goalData) => apiFetch(`${API_URL}/goals`, { method: 'POST', body: JSON.stringify(goalData) });
export const updateGoal = (id, goalData) => apiFetch(`${API_URL}/goals/${id}`, { method: 'PUT', body: JSON.stringify(goalData) });
export const deleteGoal = (id) => apiFetch(`${API_URL}/goals/${id}`, { method: 'DELETE' });

// GOAL TYPES
export const getGoalTypes = () => apiFetch(`${API_URL}/goal-types`);
export const addGoalType = (type) => apiFetch(`${API_URL}/goal-types`, { method: 'POST', body: JSON.stringify(type) });
export const updateGoalType = (id, type) => apiFetch(`${API_URL}/goal-types/${id}`, { method: 'PUT', body: JSON.stringify(type) });
export const deleteGoalType = (id) => apiFetch(`${API_URL}/goal-types/${id}`, { method: 'DELETE' });

// SALES
export const uploadSales = async (file) => {
  const token = getToken();
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/sales/bulk`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const errorData = await response.json();
    const error = new Error(errorData.msg || 'API request failed');
    error.response = { data: errorData };
    throw error;
  }

  return await response.json();
};

// Importar ventas desde JSON [{rut, invoice_number, invoice_date, net_amount}]
export const importSalesJson = (rows) => apiFetch(`${API_URL}/sales/import-json`, {
  method: 'POST',
  body: JSON.stringify(rows)
});

// ABONOS
export const getAbonos = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/abonos${queryString ? `?${queryString}` : ''}`);
};

export const getAbonosEstadisticas = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/abonos/estadisticas${queryString ? `?${queryString}` : ''}`);
};

export const getAbonosComparativo = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/abonos/comparativo${queryString ? `?${queryString}` : ''}`);
};

export const getAbonosPorVendedor = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/abonos/por-vendedor${queryString ? `?${queryString}` : ''}`);
};

export const getTiposPago = () => apiFetch(`${API_URL}/abonos/tipos-pago`);

// COMPARATIVAS
export const getComparativasMensuales = (params = {}) => {
  const queryString = new URLSearchParams(params).toString();
  return apiFetch(`${API_URL}/comparativas/mensuales${queryString ? `?${queryString}` : ''}`);
};

// IMPORTACIÓN

// Función auxiliar para polling del status de job
const pollJobStatus = async (jobId, maxMinutes = 15) => {
  const maxAttempts = (maxMinutes * 60) / 3; // Poll cada 3 segundos
  
  for (let i = 0; i < maxAttempts; i++) {
    await new Promise(resolve => setTimeout(resolve, 3000)); // 3s entre polls
    
    const token = getToken();
    const response = await fetch(`${API_URL}/import/status/${jobId}`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    if (!response.ok) {
      throw new Error('Error al consultar estado del job');
    }

    const job = await response.json();
    console.log(`📊 [Job ${jobId}] Status: ${job.status} | Progreso: ${job.importedRows || 0}/${job.totalRows || '?'}`);

    if (job.status === 'completed') {
      console.log('✅ Job completado:', job);
      return job.result || job;
    }
    
    if (job.status === 'failed') {
      console.error('❌ Job falló:', job.errorMessage);
      throw new Error(job.errorMessage || 'La importación falló');
    }

    // Si el status es 'processing' o 'pending', continuar polling
  }

  throw new Error(`Timeout: El job tardó más de ${maxMinutes} minutos en completarse`);
};

export const uploadVentasFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getToken();
  console.log('📤 Iniciando upload de ventas:', file.name, 'Tamaño:', (file.size / 1024).toFixed(2), 'KB');
  
  try {
    // 1. Subir archivo y recibir jobId
    const response = await fetch(`${API_URL}/import/ventas`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error response:', response.status, errorData);
      const err = new Error(errorData.msg || 'Error al subir archivo');
      err.status = response.status;
      err.data = errorData;
      throw err;
    }

    const result = await response.json();
    
    // 2. Si es respuesta asíncrona (202), hacer polling
    if (response.status === 202 && result.jobId) {
      console.log('⏳ Importación iniciada (job:', result.jobId, ') - Polling status...');
      return await pollJobStatus(result.jobId, 15); // 15 minutos máximo
    }
    
    // 3. Si es respuesta síncrona (200), retornar directamente
    console.log('✅ Upload exitoso (síncrono):', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error en import:', error);
    throw error;
  }
};

export const uploadAbonosFile = async (file) => {
  const formData = new FormData();
  formData.append('file', file);
  
  const token = getToken();
  console.log('📤 Iniciando upload de abonos:', file.name, 'Tamaño:', (file.size / 1024).toFixed(2), 'KB');
  
  try {
    // 1. Subir archivo y recibir jobId
    const response = await fetch(`${API_URL}/import/abonos`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ Error response:', response.status, errorData);
      const err = new Error(errorData.msg || 'Error al subir archivo');
      err.status = response.status;
      err.data = errorData;
      throw err;
    }

    const result = await response.json();
    
    // 2. Si es respuesta asíncrona (202), hacer polling (aunque abonos aún es síncrono)
    if (response.status === 202 && result.jobId) {
      console.log('⏳ Importación de abonos iniciada (job:', result.jobId, ') - Polling status...');
      return await pollJobStatus(result.jobId, 15);
    }
    
    // 3. Si es respuesta síncrona (200), retornar directamente
    console.log('✅ Upload exitoso:', result);
    return result;
    
  } catch (error) {
    console.error('❌ Error en import:', error);
    throw error;
  }
};

export const downloadPlantillaVentas = () => {
  const token = getToken();
  window.open(`${API_URL}/import/plantilla/ventas?token=${token}`, '_blank');
};

export const downloadPlantillaAbonos = () => {
  const token = getToken();
  window.open(`${API_URL}/import/plantilla/abonos?token=${token}`, '_blank');
};

export const downloadInformePendientes = (filename) => {
  const token = getToken();
  window.open(`${API_URL}/import/download-report/${filename}?token=${token}`, '_blank');
};

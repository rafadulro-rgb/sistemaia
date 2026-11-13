const API_URL = import.meta.env.PUBLIC_API_URL || 'http://localhost:4000';

async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers
  };

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Error de red' }));
    throw new Error(error.error || 'Error en la petición');
  }

  return response.json();
}

export const geofencesApi = {
  // Listar todas las geocercas
  list: () => apiRequest('/api/geofences'),
  
  // Crear una nueva geocerca
  create: (data) => apiRequest('/api/geofences', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  
  // Actualizar una geocerca
  update: (id, data) => apiRequest(`/api/geofences/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  
  // Eliminar una geocerca
  delete: (id) => apiRequest(`/api/geofences/${id}`, {
    method: 'DELETE'
  }),
  
  // Obtener eventos de una geocerca específica
  getEvents: (id, params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/geofences/${id}/events${queryString ? `?${queryString}` : ''}`);
  },
  
  // Obtener todos los eventos del usuario
  getAllEvents: (params = {}) => {
    const queryString = new URLSearchParams(params).toString();
    return apiRequest(`/api/geofences/events/all${queryString ? `?${queryString}` : ''}`);
  },
  
  // Registrar un evento de entrada/salida
  createEvent: (data) => apiRequest('/api/geofences/events', {
    method: 'POST',
    body: JSON.stringify(data)
  })
};

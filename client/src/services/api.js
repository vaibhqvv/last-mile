import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// attach the token to every request if we have one
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// handle 401s globally - kick user to login if token expired
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      // only redirect if we're not already on the login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// --- Auth ---
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// --- Orders ---
export const orderAPI = {
  calculate: (data) => api.post('/orders/calculate', data),
  create: (data) => api.post('/orders', data),
  getAll: (params) => api.get('/orders', { params }),
  getOne: (id) => api.get(`/orders/${id}`),
  assign: (id, agentId) => api.put(`/orders/${id}/assign`, { agentId }),
  autoAssign: (id) => api.put(`/orders/${id}/auto-assign`),
  updateStatus: (id, data) => api.put(`/orders/${id}/status`, data),
  reschedule: (id, date) => api.put(`/orders/${id}/reschedule`, { rescheduledDate: date }),
  override: (id, data) => api.put(`/orders/${id}/override`, data),
};

// --- Zones ---
export const zoneAPI = {
  getAll: () => api.get('/zones'),
  create: (data) => api.post('/zones', data),
  update: (id, data) => api.put(`/zones/${id}`, data),
  delete: (id) => api.delete(`/zones/${id}`),
};

// --- Rate Cards ---
export const rateCardAPI = {
  getAll: () => api.get('/rate-cards'),
  create: (data) => api.post('/rate-cards', data),
  update: (id, data) => api.put(`/rate-cards/${id}`, data),
  delete: (id) => api.delete(`/rate-cards/${id}`),
};

// --- Agents ---
export const agentAPI = {
  getAll: () => api.get('/agents'),
  toggleAvailability: (id) => api.put(`/agents/${id}/availability`),
  updateLocation: (id, data) => api.put(`/agents/${id}/location`, data),
  assignZone: (id, zoneId) => api.put(`/agents/${id}/zone`, { zoneId }),
};

export default api;

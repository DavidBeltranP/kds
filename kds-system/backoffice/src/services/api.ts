import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor para agregar token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor para manejar errores de autenticación
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = localStorage.getItem('refreshToken');
      if (refreshToken) {
        try {
          const { data } = await api.post('/auth/refresh', {
            refreshToken,
          });
          localStorage.setItem('accessToken', data.accessToken);
          originalRequest.headers.Authorization = `Bearer ${data.accessToken}`;
          return api(originalRequest);
        } catch {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

// Auth
export const authApi = {
  login: (email: string, password: string) =>
    api.post('/auth/login', { email, password }),
  refresh: (refreshToken: string) =>
    api.post('/auth/refresh', { refreshToken }),
  me: () => api.get('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    api.post('/auth/change-password', { currentPassword, newPassword }),
};

// Screens
export const screensApi = {
  getAll: () => api.get('/screens'),
  get: (id: string) => api.get(`/screens/${id}`),
  create: (data: any) => api.post('/screens', data),
  update: (id: string, data: any) => api.put(`/screens/${id}`, data),
  delete: (id: string) => api.delete(`/screens/${id}`),
  getConfig: (id: string) => api.get(`/screens/${id}/config`),
  updateAppearance: (id: string, data: any) =>
    api.put(`/screens/${id}/appearance`, data),
  updateKeyboard: (id: string, data: any) =>
    api.put(`/screens/${id}/keyboard`, data),
  setStandby: (id: string) => api.post(`/screens/${id}/standby`),
  activate: (id: string) => api.post(`/screens/${id}/activate`),
  regenerateKey: (id: string) => api.post(`/screens/${id}/regenerate-key`),
  updatePreference: (id: string, data: any) =>
    api.put(`/screens/${id}/preference`, data),
  updatePrinter: (id: string, data: any) =>
    api.put(`/screens/${id}/printer`, data),
  deletePrinter: (id: string) => api.delete(`/screens/${id}/printer`),
  testPrinter: (id: string) => api.post(`/screens/${id}/printer/test`),
};

// Queues
export const queuesApi = {
  getAll: () => api.get('/queues'),
  get: (id: string) => api.get(`/queues/${id}`),
  create: (data: any) => api.post('/queues', data),
  update: (id: string, data: any) => api.put(`/queues/${id}`, data),
  delete: (id: string) => api.delete(`/queues/${id}`),
  addChannel: (queueId: string, data: any) =>
    api.post(`/queues/${queueId}/channels`, data),
  updateChannel: (queueId: string, channelId: string, data: any) =>
    api.put(`/queues/${queueId}/channels/${channelId}`, data),
  deleteChannel: (queueId: string, channelId: string) =>
    api.delete(`/queues/${queueId}/channels/${channelId}`),
  addFilter: (queueId: string, data: any) =>
    api.post(`/queues/${queueId}/filters`, data),
  deleteFilter: (queueId: string, filterId: string) =>
    api.delete(`/queues/${queueId}/filters/${filterId}`),
  getStats: (id: string) => api.get(`/queues/${id}/stats`),
  resetBalance: (id: string) => api.post(`/queues/${id}/reset-balance`),
};

// Orders
export const ordersApi = {
  getAll: (params?: any) => api.get('/orders', { params }),
  get: (id: string) => api.get(`/orders/${id}`),
  getByScreen: (screenId: string) => api.get(`/orders/screen/${screenId}`),
  finish: (id: string, screenId: string) =>
    api.post(`/orders/${id}/finish`, { screenId }),
  undo: (id: string) => api.post(`/orders/${id}/undo`),
  cancel: (id: string, reason?: string) =>
    api.post(`/orders/${id}/cancel`, { reason }),
  getStats: () => api.get('/orders/stats'),
  getDashboardStats: (timeLimit?: number) =>
    api.get('/orders/dashboard-stats', { params: { timeLimit } }),
  cleanup: (hours?: number) => api.delete('/orders/cleanup', { params: { hours } }),
  generateTest: (count: number, includeLong?: boolean) =>
    api.post('/orders/generate-test', { count, includeLong }),
  deleteTestOrders: () => api.delete('/orders/test-orders'),
};

// Users
export const usersApi = {
  getAll: () => api.get('/users'),
  get: (id: string) => api.get(`/users/${id}`),
  create: (data: { email: string; password: string; name: string; role: string }) =>
    api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  delete: (id: string) => api.delete(`/users/${id}`),
  toggleActive: (id: string) => api.post(`/users/${id}/toggle-active`),
};

// Config
export const configApi = {
  getGeneral: () => api.get('/config/general'),
  updateGeneral: (data: any) => api.put('/config/general', data),
  getMxp: () => api.get('/config/mxp'),
  updateMxp: (data: any) => api.put('/config/mxp', data),
  testMxpConnection: (data: {
    mxpHost: string;
    mxpPort?: number;
    mxpUser: string;
    mxpPassword: string;
    mxpDatabase: string;
  }) => api.post('/config/mxp/test', data),
  getPollingStatus: () => api.get('/config/polling'),
  startPolling: () => api.post('/config/polling/start'),
  stopPolling: () => api.post('/config/polling/stop'),
  forcePoll: () => api.post('/config/polling/force'),
  health: () => api.get('/config/health'),
  stats: () => api.get('/config/stats'),
  // Modos de configuración (Tickets e Impresión)
  getModes: () => api.get('/config/modes'),
  updateModes: (data: {
    ticketMode?: 'POLLING' | 'API';
    printMode?: 'LOCAL' | 'CENTRALIZED';
    centralizedPrintUrl?: string;
    centralizedPrintPort?: number;
  }) => api.put('/config/modes', data),
  testCentralizedPrint: () => api.post('/config/print/test-centralized'),
};

// Mirror KDS (Espejo de órdenes del local - SOLO LECTURA)
export const mirrorApi = {
  configure: (data: {
    host: string;
    port?: number;
    user: string;
    password: string;
    database: string;
  }) => api.post('/mirror/configure', data),
  test: () => api.get('/mirror/test'),
  stats: () => api.get('/mirror/stats'),
  getOrders: (params?: { screen?: string; queue?: string }) =>
    api.get('/mirror/orders', { params }),
  getScreens: () => api.get('/mirror/screens'),
  getQueues: () => api.get('/mirror/queues'),
  disconnect: () => api.post('/mirror/disconnect'),
};

export default api;

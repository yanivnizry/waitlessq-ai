import axios, { AxiosInstance, AxiosResponse } from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Create axios instance
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  setToken: (token: string) => {
    localStorage.setItem('token', token);
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  },

  removeToken: () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
  },

  login: async (email: string, password: string) => {
    const formData = new FormData();
    formData.append('username', email);
    formData.append('password', password);
    
    const response = await api.post('/auth/login', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  getCurrentUser: async () => {
    const response = await api.get('/auth/me');
    return response.data;
  },

  refreshToken: async () => {
    const response = await api.post('/auth/refresh');
    return response.data;
  },
};

// Providers API
export const providersAPI = {
  getProviders: async () => {
    const response = await api.get('/providers');
    return response.data;
  },

  getProvider: async (id: number) => {
    const response = await api.get(`/providers/${id}`);
    return response.data;
  },

  createProvider: async (providerData: any) => {
    const response = await api.post('/providers', providerData);
    return response.data;
  },

  updateProvider: async (id: number, providerData: any) => {
    const response = await api.put(`/providers/${id}`, providerData);
    return response.data;
  },

  deleteProvider: async (id: number) => {
    const response = await api.delete(`/providers/${id}`);
    return response.data;
  },
};

// Appointments API
export const appointmentsAPI = {
  getAppointments: async (params?: any) => {
    const response = await api.get('/appointments', { params });
    return response.data;
  },

  getAppointment: async (id: number) => {
    const response = await api.get(`/appointments/${id}`);
    return response.data;
  },

  createAppointment: async (appointmentData: any) => {
    const response = await api.post('/appointments', appointmentData);
    return response.data;
  },

  updateAppointment: async (id: number, appointmentData: any) => {
    const response = await api.put(`/appointments/${id}`, appointmentData);
    return response.data;
  },

  deleteAppointment: async (id: number) => {
    const response = await api.delete(`/appointments/${id}`);
    return response.data;
  },
};

// Queues API
export const queuesAPI = {
  getQueues: async (providerId?: number) => {
    const params = providerId ? { provider_id: providerId } : {};
    const response = await api.get('/queues', { params });
    return response.data;
  },

  getQueue: async (id: number) => {
    const response = await api.get(`/queues/${id}`);
    return response.data;
  },

  createQueue: async (queueData: any) => {
    const response = await api.post('/queues', queueData);
    return response.data;
  },

  updateQueue: async (id: number, queueData: any) => {
    const response = await api.put(`/queues/${id}`, queueData);
    return response.data;
  },

  deleteQueue: async (id: number) => {
    const response = await api.delete(`/queues/${id}`);
    return response.data;
  },

  // Queue Entries
  getQueueEntries: async (queueId: number) => {
    const response = await api.get(`/queues/${queueId}/entries`);
    return response.data;
  },

  addQueueEntry: async (queueId: number, entryData: any) => {
    const response = await api.post(`/queues/${queueId}/entries`, entryData);
    return response.data;
  },

  updateQueueEntry: async (queueId: number, entryId: number, entryData: any) => {
    const response = await api.put(`/queues/${queueId}/entries/${entryId}`, entryData);
    return response.data;
  },

  removeQueueEntry: async (queueId: number, entryId: number) => {
    const response = await api.delete(`/queues/${queueId}/entries/${entryId}`);
    return response.data;
  },
};

// PWA API
export const pwaAPI = {
  getPWAConfig: async (providerId: number) => {
    const response = await api.get(`/pwa/config/${providerId}`);
    return response.data;
  },

  updatePWAConfig: async (providerId: number, configData: any) => {
    const response = await api.put(`/pwa/config/${providerId}`, configData);
    return response.data;
  },

  generatePWA: async (providerId: number) => {
    const response = await api.post(`/pwa/generate/${providerId}`);
    return response.data;
  },
};

export default api; 
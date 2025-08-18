import axios, { AxiosInstance, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

// Determine API base URL based on environment
const getApiBaseUrl = (): string => {
  const envUrl = process.env.REACT_APP_API_URL;
  
  if (envUrl) {
    return envUrl;
  }
  
  // Default to localhost for development
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:8000';
  }
  
  // Force HTTPS in production
  if (process.env.NODE_ENV === 'production') {
    const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
    const host = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    return `${protocol}//${host}${port}`;
  }
  
  return 'http://localhost:8000';
};

const API_BASE_URL = getApiBaseUrl();

// Create axios instance with security configurations
const api: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 second timeout
  withCredentials: true, // Include credentials for CORS
});

// Request interceptor to add auth token and security headers
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔐 API Request: ${config.url} Token: ${token.substring(0, 50)}...`);
    } else {
      console.log(`🔐 API Request: ${config.url} (No token)`);
    }
    
    // Add security headers
    if (config.headers) {
      config.headers['X-Requested-With'] = 'XMLHttpRequest';
    }
    
    return config;
  },
  (error: any) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors and token refresh
api.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: any) => {
    const originalRequest = error.config;
    
    // Handle 401 Unauthorized
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      
      // Clear invalid token
      localStorage.removeItem('token');
      
      // Redirect to login
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
      
      return Promise.reject(error);
    }
    
    // Handle 403 Forbidden
    if (error.response?.status === 403) {
      // Redirect to unauthorized page or show message
      console.error('Access forbidden');
    }
    
    // Handle 429 Rate Limited
    if (error.response?.status === 429) {
      const retryAfter = error.response.headers['retry-after'];
      console.error(`Rate limited. Retry after ${retryAfter} seconds`);
    }
    
    // Handle network errors
    if (!error.response) {
      console.error('Network error - please check your connection');
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
    console.log('🔐 Starting login process...');
    
    // Validate input
    if (!email || !password) {
      throw new Error('Email and password are required');
    }
    
    // Sanitize email
    const sanitizedEmail = email.toLowerCase().trim();
    console.log('🔐 Calling login API...');
    
    // Use URLSearchParams for application/x-www-form-urlencoded
    const formData = new URLSearchParams();
    formData.append('username', sanitizedEmail);
    formData.append('password', password);
    
    try {
      const response = await api.post('/auth/login', formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      });
      
      console.log('🔐 Login response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔐 Login error:', error);
      if (error.response?.status === 401) {
        throw new Error('Invalid email or password');
      }
      if (error.response?.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      throw new Error('Login failed. Please try again.');
    }
  },

  register: async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
  }) => {
    // Validate input
    if (!userData.email || !userData.password || !userData.full_name) {
      throw new Error('Email, password, and full name are required');
    }
    
    // Sanitize input
    const sanitizedData = {
      ...userData,
      email: userData.email.toLowerCase().trim(),
      full_name: userData.full_name.trim(),
      phone: userData.phone?.trim() || undefined,
    };
    
    try {
      const response = await api.post('/auth/register', sanitizedData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Registration failed. Please try again.');
    }
  },

  getCurrentUser: async () => {
    try {
      console.log('🔐 Getting current user...');
      const response = await api.get('/auth/me');
      console.log('🔐 Current user response:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('🔐 getCurrentUser error:', error);
      if (error.response?.status === 401) {
        console.log('🔐 401 error - removing token');
        localStorage.removeItem('token');
        throw new Error('Session expired. Please login again.');
      }
      throw new Error('Failed to get user information');
    }
  },

  refreshToken: async () => {
    try {
      const response = await api.post('/auth/refresh');
      return response.data;
    } catch (error: any) {
      localStorage.removeItem('token');
      throw new Error('Token refresh failed. Please login again.');
    }
  },
};

// Providers API
export const providersAPI = {
  getProviders: async (params?: { skip?: number; limit?: number; search?: string }) => {
    try {
      const response = await api.get('/providers', { params });
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 401) {
        throw new Error('Authentication required');
      }
      throw new Error('Failed to fetch providers');
    }
  },

  getProvider: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.get(`/providers/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      throw new Error('Failed to fetch provider');
    }
  },

  createProvider: async (providerData: any) => {
    // Validate required fields
    if (!providerData.business_name || !providerData.contact_email) {
      throw new Error('Business name and contact email are required');
    }
    
    try {
      const response = await api.post('/providers', providerData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create provider');
    }
  },

  updateProvider: async (id: number, providerData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.put(`/providers/${id}`, providerData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to update provider');
    }
  },

  deleteProvider: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.delete(`/providers/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      throw new Error('Failed to delete provider');
    }
  },
};

// Appointments API
export const appointmentsAPI = {
  getAppointments: async (params?: { skip?: number; limit?: number; provider_id?: number }) => {
    try {
      const response = await api.get('/appointments', { params });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch appointments');
    }
  },

  getAppointment: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid appointment ID');
    }
    
    try {
      const response = await api.get(`/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Appointment not found');
      }
      throw new Error('Failed to fetch appointment');
    }
  },

  createAppointment: async (appointmentData: any) => {
    try {
      const response = await api.post('/appointments', appointmentData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create appointment');
    }
  },

  updateAppointment: async (id: number, appointmentData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid appointment ID');
    }
    
    try {
      const response = await api.put(`/appointments/${id}`, appointmentData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Appointment not found');
      }
      throw new Error('Failed to update appointment');
    }
  },

  deleteAppointment: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid appointment ID');
    }
    
    try {
      const response = await api.delete(`/appointments/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Appointment not found');
      }
      throw new Error('Failed to delete appointment');
    }
  },
};

// Queues API
export const queuesAPI = {
  getQueues: async (params?: { skip?: number; limit?: number; provider_id?: number }) => {
    try {
      const response = await api.get('/queues', { params });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch queues');
    }
  },

  getQueue: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid queue ID');
    }
    
    try {
      const response = await api.get(`/queues/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue not found');
      }
      throw new Error('Failed to fetch queue');
    }
  },

  createQueue: async (queueData: any) => {
    try {
      const response = await api.post('/queues', queueData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create queue');
    }
  },

  updateQueue: async (id: number, queueData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid queue ID');
    }
    
    try {
      const response = await api.put(`/queues/${id}`, queueData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue not found');
      }
      throw new Error('Failed to update queue');
    }
  },

  deleteQueue: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid queue ID');
    }
    
    try {
      const response = await api.delete(`/queues/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue not found');
      }
      throw new Error('Failed to delete queue');
    }
  },

  // Queue Entries API
  getQueueEntries: async (queueId: number) => {
    if (!queueId || queueId <= 0) {
      throw new Error('Invalid queue ID');
    }
    
    try {
      const response = await api.get(`/queues/${queueId}/entries`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue not found');
      }
      throw new Error('Failed to fetch queue entries');
    }
  },

  addQueueEntry: async (queueId: number, entryData: any) => {
    if (!queueId || queueId <= 0) {
      throw new Error('Invalid queue ID');
    }
    
    try {
      const response = await api.post(`/queues/${queueId}/entries`, entryData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to add queue entry');
    }
  },

  updateQueueEntry: async (queueId: number, entryId: number, entryData: any) => {
    if (!queueId || queueId <= 0 || !entryId || entryId <= 0) {
      throw new Error('Invalid queue or entry ID');
    }
    
    try {
      const response = await api.put(`/queues/${queueId}/entries/${entryId}`, entryData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue entry not found');
      }
      throw new Error('Failed to update queue entry');
    }
  },

  removeQueueEntry: async (queueId: number, entryId: number) => {
    if (!queueId || queueId <= 0 || !entryId || entryId <= 0) {
      throw new Error('Invalid queue or entry ID');
    }
    
    try {
      const response = await api.delete(`/queues/${queueId}/entries/${entryId}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Queue entry not found');
      }
      throw new Error('Failed to remove queue entry');
    }
  },
};

// Services API
export const servicesAPI = {
  getServices: async (params?: { 
    page?: number; 
    per_page?: number; 
    search?: string; 
    category?: string;
    provider_id?: number;
    is_active?: boolean;
  }) => {
    try {
      const response = await api.get('/services/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch services');
    }
  },

  getService: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid service ID');
    }
    
    try {
      const response = await api.get(`/services/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Service not found');
      }
      throw new Error('Failed to fetch service');
    }
  },

  createService: async (serviceData: any) => {
    try {
      const response = await api.post('/services/', serviceData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create service');
    }
  },

  updateService: async (id: number, serviceData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid service ID');
    }
    
    try {
      const response = await api.put(`/services/${id}/`, serviceData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Service not found');
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to update service');
    }
  },

  deleteService: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid service ID');
    }
    
    try {
      const response = await api.delete(`/services/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Service not found');
      }
      throw new Error('Failed to delete service');
    }
  },

  getServiceStats: async () => {
    try {
      const response = await api.get('/services/stats/');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch service statistics');
    }
  },

  getCategories: async () => {
    try {
      const response = await api.get('/services/categories/list/');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch service categories');
    }
  },

  getTimeSlots: async (providerId: number, date: string) => {
    if (!providerId || providerId <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.get(`/services/timeslots/${providerId}/?date=${date}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      throw new Error('Failed to fetch time slots');
    }
  },
};

// Availability API
export const availabilityAPI = {
  getWeeklySchedule: async (providerId: number) => {
    if (!providerId || providerId <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.get(`/availability/provider/${providerId}/weekly`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      throw new Error('Failed to fetch weekly schedule');
    }
  },

  createAvailability: async (availabilityData: any) => {
    try {
      const response = await api.post('/availability', availabilityData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create availability');
    }
  },

  updateAvailability: async (id: number, availabilityData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid availability ID');
    }
    
    try {
      const response = await api.put(`/availability/${id}`, availabilityData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Availability rule not found');
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to update availability');
    }
  },

  deleteAvailability: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid availability ID');
    }
    
    try {
      const response = await api.delete(`/availability/${id}`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Availability rule not found');
      }
      throw new Error('Failed to delete availability');
    }
  },

  createBulkAvailability: async (bulkData: any) => {
    try {
      const response = await api.post('/availability/bulk', bulkData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create bulk availability');
    }
  },

  createException: async (exceptionData: any) => {
    try {
      const response = await api.post('/availability/exceptions', exceptionData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create availability exception');
    }
  },

  getStats: async (providerId: number) => {
    if (!providerId || providerId <= 0) {
      throw new Error('Invalid provider ID');
    }
    
    try {
      const response = await api.get(`/availability/provider/${providerId}/stats`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Provider not found');
      }
      throw new Error('Failed to fetch availability statistics');
    }
  },
};

// Clients API
export const clientsAPI = {
  getClients: async (params?: { 
    page?: number; 
    per_page?: number; 
    search?: string; 
    is_active?: boolean;
  }) => {
    try {
      const response = await api.get('/clients/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch clients');
    }
  },

  getClientsSummary: async (params?: { 
    search?: string; 
    limit?: number;
  }) => {
    try {
      const response = await api.get('/clients/summary/', { params });
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch clients summary');
    }
  },

  getClient: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid client ID');
    }
    
    try {
      const response = await api.get(`/clients/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Client not found');
      }
      throw new Error('Failed to fetch client');
    }
  },

  createClient: async (clientData: any) => {
    try {
      const response = await api.post('/clients/', clientData);
      return response.data;
    } catch (error: any) {
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to create client');
    }
  },

  updateClient: async (id: number, clientData: any) => {
    if (!id || id <= 0) {
      throw new Error('Invalid client ID');
    }
    
    try {
      const response = await api.put(`/clients/${id}/`, clientData);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Client not found');
      }
      if (error.response?.data?.detail) {
        throw new Error(error.response.data.detail);
      }
      throw new Error('Failed to update client');
    }
  },

  deleteClient: async (id: number) => {
    if (!id || id <= 0) {
      throw new Error('Invalid client ID');
    }
    
    try {
      const response = await api.delete(`/clients/${id}/`);
      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('Client not found');
      }
      throw new Error('Failed to delete client');
    }
  },

  getClientStats: async () => {
    try {
      const response = await api.get('/clients/stats/overview/');
      return response.data;
    } catch (error: any) {
      throw new Error('Failed to fetch client statistics');
    }
  },
};

export default api; 
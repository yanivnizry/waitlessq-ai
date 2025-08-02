import React from 'react';
import { render } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';

// Custom render function that includes providers
export const renderWithRouter = (ui, { route = '/' } = {}) => {
  window.history.pushState({}, 'Test page', route);

  return render(ui, { wrapper: BrowserRouter });
};

// Mock user data
export const mockUser = {
  id: 1,
  name: 'John Doe',
  email: 'john@example.com',
  is_active: true
};

// Mock provider data
export const mockProviders = [
  {
    id: 1,
    name: 'Dr. Smith',
    email: 'dr.smith@clinic.com',
    phone: '+1234567890',
    specialty: 'Cardiology',
    address: '123 Medical Center Dr',
    is_active: true
  },
  {
    id: 2,
    name: 'Dr. Johnson',
    email: 'dr.johnson@clinic.com',
    phone: '+1234567891',
    specialty: 'Dermatology',
    address: '456 Health Ave',
    is_active: true
  }
];

// Mock appointment data
export const mockAppointments = [
  {
    id: 1,
    patient_name: 'Alice Johnson',
    patient_email: 'alice@example.com',
    patient_phone: '+1234567890',
    provider_id: 1,
    appointment_date: '2024-01-15',
    appointment_time: '10:00',
    notes: 'Regular checkup',
    status: 'scheduled'
  },
  {
    id: 2,
    patient_name: 'Bob Smith',
    patient_email: 'bob@example.com',
    patient_phone: '+1234567891',
    provider_id: 2,
    appointment_date: '2024-01-16',
    appointment_time: '14:30',
    notes: 'Follow-up appointment',
    status: 'confirmed'
  }
];

// Mock queue data
export const mockQueues = [
  {
    id: 1,
    name: 'Cardiology Queue',
    provider_id: 1,
    current_size: 5,
    max_capacity: 20,
    is_active: true,
    provider: mockProviders[0]
  },
  {
    id: 2,
    name: 'Dermatology Queue',
    provider_id: 2,
    current_size: 3,
    max_capacity: 15,
    is_active: true,
    provider: mockProviders[1]
  }
];

// Mock PWA config data
export const mockPWAConfigs = [
  {
    id: 1,
    provider_id: 1,
    app_name: 'Cardiology Clinic App',
    app_description: 'Patient portal for cardiology services',
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    logo_url: 'https://example.com/logo.png',
    custom_domain: 'cardiology.app',
    features: {
      appointments: true,
      queues: true,
      notifications: true
    },
    provider: mockProviders[0]
  }
];

// Helper function to mock successful API responses
export const mockApiResponse = (data, status = 200) => {
  return Promise.resolve({
    ok: status < 400,
    status,
    json: () => Promise.resolve(data)
  });
};

// Helper function to mock failed API responses
export const mockApiError = (error = 'Network error', status = 500) => {
  return Promise.resolve({
    ok: false,
    status,
    json: () => Promise.resolve({ detail: error })
  });
}; 
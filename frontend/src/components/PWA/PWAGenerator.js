import React, { useState, useEffect } from 'react';

const PWAGenerator = () => {
  const [pwaConfigs, setPwaConfigs] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    provider_id: '',
    app_name: '',
    app_description: '',
    primary_color: '#3B82F6',
    secondary_color: '#1F2937',
    logo_url: '',
    custom_domain: '',
    features: {
      appointments: true,
      queues: true,
      notifications: true
    }
  });

  useEffect(() => {
    fetchPWAConfigs();
    fetchProviders();
  }, []);

  const fetchPWAConfigs = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/pwa/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setPwaConfigs(data);
      }
    } catch (error) {
      console.error('Error fetching PWA configs:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProviders = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/providers/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setProviders(data);
      }
    } catch (error) {
      console.error('Error fetching providers:', error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch('http://localhost:8000/api/v1/pwa/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowAddModal(false);
        setFormData({
          provider_id: '',
          app_name: '',
          app_description: '',
          primary_color: '#3B82F6',
          secondary_color: '#1F2937',
          logo_url: '',
          custom_domain: '',
          features: {
            appointments: true,
            queues: true,
            notifications: true
          }
        });
        fetchPWAConfigs();
      }
    } catch (error) {
      console.error('Error creating PWA config:', error);
    }
  };

  const generatePWA = async (configId) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/pwa/${configId}/generate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Open the generated PWA in a new tab
        window.open(data.pwa_url, '_blank');
      }
    } catch (error) {
      console.error('Error generating PWA:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-900">PWA Generator</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create PWA Config
        </button>
      </div>

      {/* PWA Configs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pwaConfigs.map((config) => (
          <div key={config.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{config.app_name}</h3>
                <p className="text-sm text-gray-500">
                  Provider: {config.provider?.name || 'Unknown'}
                </p>
              </div>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: config.primary_color }}></div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{config.app_description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" />
                </svg>
                {config.custom_domain || 'Default Domain'}
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Features: {Object.keys(config.features || {}).filter(f => config.features[f]).join(', ')}
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => generatePWA(config.id)}
                className="flex-1 px-3 py-2 text-sm font-medium text-blue-600 hover:text-blue-700 border border-blue-600 rounded-md hover:bg-blue-50"
              >
                Generate PWA
              </button>
              <button
                onClick={() => window.open(config.pwa_url, '_blank')}
                className="flex-1 px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 border border-green-600 rounded-md hover:bg-green-50"
              >
                View PWA
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add PWA Config Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create PWA Configuration</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Provider</label>
                  <select
                    value={formData.provider_id}
                    onChange={(e) => setFormData({...formData, provider_id: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Select a provider</option>
                    {providers.map((provider) => (
                      <option key={provider.id} value={provider.id}>
                        {provider.name} - {provider.specialty}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">App Name</label>
                  <input
                    type="text"
                    value={formData.app_name}
                    onChange={(e) => setFormData({...formData, app_name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={formData.app_description}
                    onChange={(e) => setFormData({...formData, app_description: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    rows="3"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Primary Color</label>
                    <input
                      type="color"
                      value={formData.primary_color}
                      onChange={(e) => setFormData({...formData, primary_color: e.target.value})}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Secondary Color</label>
                    <input
                      type="color"
                      value={formData.secondary_color}
                      onChange={(e) => setFormData({...formData, secondary_color: e.target.value})}
                      className="mt-1 block w-full h-10 border border-gray-300 rounded-md"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Logo URL</label>
                  <input
                    type="url"
                    value={formData.logo_url}
                    onChange={(e) => setFormData({...formData, logo_url: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://example.com/logo.png"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Custom Domain (Optional)</label>
                  <input
                    type="text"
                    value={formData.custom_domain}
                    onChange={(e) => setFormData({...formData, custom_domain: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    placeholder="app.provider.com"
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="block text-sm font-medium text-gray-700">Features</label>
                  <div className="space-y-2">
                    {Object.keys(formData.features).map((feature) => (
                      <div key={feature} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.features[feature]}
                          onChange={(e) => setFormData({
                            ...formData, 
                            features: {
                              ...formData.features,
                              [feature]: e.target.checked
                            }
                          })}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label className="ml-2 block text-sm text-gray-900 capitalize">
                          {feature}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create PWA Config
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PWAGenerator; 
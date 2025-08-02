import React, { useState, useEffect } from 'react';

const Queues = () => {
  const [queues, setQueues] = useState([]);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    provider_id: '',
    max_capacity: 50,
    is_active: true
  });

  useEffect(() => {
    fetchQueues();
    fetchProviders();
  }, []);

  const fetchQueues = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:8000/api/v1/queues/', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setQueues(data);
      }
    } catch (error) {
      console.error('Error fetching queues:', error);
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
      const response = await fetch('http://localhost:8000/api/v1/queues/', {
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
          name: '',
          provider_id: '',
          max_capacity: 50,
          is_active: true
        });
        fetchQueues();
      }
    } catch (error) {
      console.error('Error creating queue:', error);
    }
  };

  const handleQueueAction = async (queueId, action) => {
    const token = localStorage.getItem('token');
    
    try {
      const response = await fetch(`http://localhost:8000/api/v1/queues/${queueId}/${action}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        fetchQueues();
      }
    } catch (error) {
      console.error(`Error ${action} queue:`, error);
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
        <h1 className="text-2xl font-bold text-gray-900">Queue Management</h1>
        <button
          onClick={() => setShowAddModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
        >
          <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Create Queue
        </button>
      </div>

      {/* Queues Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {queues.map((queue) => (
          <div key={queue.id} className="bg-white shadow rounded-lg p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{queue.name}</h3>
                <p className="text-sm text-gray-500">
                  Provider: {queue.provider?.name || 'Unknown'}
                </p>
              </div>
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                queue.is_active 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {queue.is_active ? 'Active' : 'Inactive'}
              </span>
            </div>
            
            <div className="space-y-3 mb-4">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Current Size:</span>
                <span className="font-medium">{queue.current_size || 0}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Max Capacity:</span>
                <span className="font-medium">{queue.max_capacity}</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full" 
                  style={{ width: `${((queue.current_size || 0) / queue.max_capacity) * 100}%` }}
                ></div>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button
                onClick={() => handleQueueAction(queue.id, 'start')}
                className="flex-1 px-3 py-2 text-sm font-medium text-green-600 hover:text-green-700 border border-green-600 rounded-md hover:bg-green-50"
              >
                Start
              </button>
              <button
                onClick={() => handleQueueAction(queue.id, 'pause')}
                className="flex-1 px-3 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 border border-yellow-600 rounded-md hover:bg-yellow-50"
              >
                Pause
              </button>
              <button
                onClick={() => handleQueueAction(queue.id, 'stop')}
                className="flex-1 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-600 rounded-md hover:bg-red-50"
              >
                Stop
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add Queue Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Queue</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Queue Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
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
                  <label className="block text-sm font-medium text-gray-700">Max Capacity</label>
                  <input
                    type="number"
                    value={formData.max_capacity}
                    onChange={(e) => setFormData({...formData, max_capacity: parseInt(e.target.value)})}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    min="1"
                    required
                  />
                </div>
                
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-sm text-gray-900">Active</label>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Queue
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

export default Queues; 
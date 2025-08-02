import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';

function App() {
  return (
    <Router>
      <div className="min-h-screen bg-gray-50">
        <div className="container mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-8">
            🚀 WaitLessQ Dashboard
          </h1>
          
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to WaitLessQ
            </h2>
            
            <p className="text-gray-600 mb-6">
              Your service provider platform is running successfully! 
              The backend API is available at <code className="bg-gray-100 px-2 py-1 rounded">http://localhost:8000</code>
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-800 mb-2">API Status</h3>
                <p className="text-blue-600">✅ Backend running on port 8000</p>
                <a 
                  href="http://localhost:8000/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 underline"
                >
                  View API Documentation →
                </a>
              </div>
              
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-800 mb-2">Features</h3>
                <ul className="text-green-600 space-y-1">
                  <li>• Provider Management</li>
                  <li>• Appointment Scheduling</li>
                  <li>• Real-time Queues</li>
                  <li>• PWA Generation</li>
                </ul>
              </div>
              
              <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-purple-800 mb-2">Scaling Ready</h3>
                <ul className="text-purple-600 space-y-1">
                  <li>• Database Optimization</li>
                  <li>• Redis Caching</li>
                  <li>• Rate Limiting</li>
                  <li>• Load Balancing</li>
                </ul>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-800 mb-2">Quick Links</h3>
              <div className="flex flex-wrap gap-4">
                <a 
                  href="http://localhost:8000/docs" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  API Docs
                </a>
                <a 
                  href="http://localhost:8000/health" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                >
                  Health Check
                </a>
                <a 
                  href="http://localhost:8000/redoc" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  ReDoc
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App; 
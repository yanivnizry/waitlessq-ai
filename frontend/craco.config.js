const path = require('path');

module.exports = {
  webpack: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  typescript: {
    enableTypeChecking: false, // Disable TypeScript checking during development for stability
  },
}; 
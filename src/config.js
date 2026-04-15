// API Configuration for different environments
const config = {
  development: {
    apiUrl: 'http://localhost:3000/api',
    mlApiUrl: 'http://127.0.0.1:5000'
  },
  production: {
    apiUrl: import.meta.env.VITE_API_URL || 'https://sustainadish.vercel.app/api',
    mlApiUrl: import.meta.env.VITE_ML_API_URL || 'https://your-ml-service.onrender.com'
  }
};

// Get current environment (default to development)
const env = import.meta.env.MODE || 'development';

// Export configuration based on current environment
export const { apiUrl, mlApiUrl } = config[env];

// Export entire config object if needed
export default config;
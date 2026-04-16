import axios from 'axios';

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

// Create axios instance with credentials support (for httpOnly cookies)
export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true, // Important for httpOnly cookies
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging (optional)
if (env === 'development') {
  apiClient.interceptors.request.use(
    (config) => {
      console.log(`[API Request] ${config.method.toUpperCase()} ${config.url}`);
      return config;
    },
    (error) => {
      console.error('[API Request Error]', error);
      return Promise.reject(error);
    }
  );

  apiClient.interceptors.response.use(
    (response) => {
      console.log(`[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`, response.status);
      return response;
    },
    (error) => {
      console.error('[API Response Error]', error.response?.status, error.config?.url);
      return Promise.reject(error);
    }
  );
}

// Export entire config object if needed
export default config;
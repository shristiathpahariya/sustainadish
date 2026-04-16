import axios from 'axios';

/**
 * When using `vite preview` or a production build opened on localhost, MODE is still
 * "production" — but the API must point at the local Node server, not the deployed URL.
 * VITE_API_URL overrides everything when set.
 */
function resolveApiUrl() {
  if (import.meta.env.VITE_API_URL) return import.meta.env.VITE_API_URL;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://localhost:3000/api';
    }
  }
  return 'https://sustainadish.vercel.app/api';
}

function resolveMlApiUrl() {
  if (import.meta.env.VITE_ML_API_URL) return import.meta.env.VITE_ML_API_URL;
  if (typeof window !== 'undefined') {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') {
      return 'http://127.0.0.1:5000';
    }
  }
  return 'https://your-ml-service.onrender.com';
}

export const apiUrl = resolveApiUrl();
export const mlApiUrl = resolveMlApiUrl();

/** Google OAuth 2.0 Web client ID (set `VITE_GOOGLE_CLIENT_ID` in `.env`; exposed in the client bundle). */
export const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

// Create axios instance with credentials support (for httpOnly cookies)
export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor for debugging (development server only)
if (import.meta.env.DEV) {
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
      console.log(
        `[API Response] ${response.config.method.toUpperCase()} ${response.config.url}`,
        response.status
      );
      return response;
    },
    (error) => {
      console.error('[API Response Error]', error.response?.status, error.config?.url);
      return Promise.reject(error);
    }
  );
}

// Backwards-compatible default export for any `import config from './config'`
const config = {
  development: { apiUrl: 'http://localhost:3000/api', mlApiUrl: 'http://127.0.0.1:5000' },
  production: { apiUrl: resolveApiUrl(), mlApiUrl: resolveMlApiUrl() },
};

export default config;

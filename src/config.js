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
  // Vercel hosts only the static SPA — there is no /api on *.vercel.app. Point at your Node API
  // (e.g. Render). Override with VITE_API_URL in Vercel → Environment Variables (Production).
  return 'https://sustainadish-backend.onrender.com/api';
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

/** JWT for cross-origin API calls (Vercel → Render). Browsers often block third-party cookies; backend also accepts `x-auth-token`. */
const AUTH_TOKEN_KEY = 'sustainadish_auth_token';

export function getAuthToken() {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(AUTH_TOKEN_KEY);
}

export function setAuthToken(token) {
  if (typeof window === 'undefined') return;
  if (token) localStorage.setItem(AUTH_TOKEN_KEY, token);
  else localStorage.removeItem(AUTH_TOKEN_KEY);
}

// Create axios instance with credentials support (for httpOnly cookies)
export const apiClient = axios.create({
  baseURL: apiUrl,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
    const h = config.headers;
    if (h) {
      if (typeof h.delete === 'function') {
        h.delete('Content-Type');
      } else {
        delete h['Content-Type'];
      }
      if (h.common && typeof h.common === 'object') {
        delete h.common['Content-Type'];
      }
    }
  }
  const t = getAuthToken();
  if (t) {
    config.headers = config.headers ?? {};
    config.headers['x-auth-token'] = t;
  }
  return config;
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

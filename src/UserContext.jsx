import React, { createContext, useState, useContext, useEffect } from 'react';
import { apiClient } from './config';

const UserContext = createContext();

/** Normalize /auth/me payload for UI (navbar expects `name`). */
function mergeServerUser(u) {
  if (!u) return u;
  return {
    ...u,
    name:
      (typeof u.name === 'string' && u.name.trim()) ||
      [u.firstName, u.lastName].filter(Boolean).join(' ').trim() ||
      u.email,
  };
}

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    return JSON.parse(localStorage.getItem('user')) || null;
  });
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return !!localStorage.getItem('user');
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Update localStorage whenever user state changes
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      setIsAuthenticated(true);
    } else {
      localStorage.removeItem('user');
      setIsAuthenticated(false);
    }
  }, [user]);

  // Sync context with DB as soon as we have a server-backed account (e.g. after login or refresh).
  // Login payload alone may omit or truncate fields like profilePicture; navbar needs this on landing.
  useEffect(() => {
    const id = user?._id ?? user?.id;
    if (id == null || id === '') return;

    let cancelled = false;
    (async () => {
      try {
        const res = await apiClient.get('/auth/me');
        if (cancelled || !res.data?.user) return;
        setUser(mergeServerUser(res.data.user));
      } catch (err) {
        if (err.response?.status === 401 && !cancelled) {
          localStorage.removeItem('user');
          setUser(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?._id, user?.id]);

  // Function to verify authentication status with backend
  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get('/auth/me');
      if (response.data && response.data.user) {
        setUser(mergeServerUser(response.data.user));
        setIsAuthenticated(true);
        return true;
      }
    } catch (error) {
      // If authentication fails, clear user state
      logout();
      return false;
    }
    return false;
  };

  // Function to logout user
  const logout = async () => {
    try {
      // Call backend logout endpoint to clear cookies
      await apiClient.post('/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local storage and state
      localStorage.removeItem('user');
      setUser(null);
      setIsAuthenticated(false);
      setError(null);
    }
  };

  // Function to update user data
  const updateUser = (userData) => {
    setUser((prevUser) => ({
      ...prevUser,
      ...userData
    }));
  };

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        setUser, 
        isAuthenticated, 
        loading,
        error,
        logout,
        checkAuthStatus,
        updateUser
      }}
    >
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);

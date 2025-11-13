import React, { createContext, useContext, useState, useEffect } from 'react';
import { getUser, getToken, setToken, removeToken } from '../utils/auth';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe ser usado dentro de AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Cargar usuario al iniciar
  useEffect(() => {
    const loadUser = () => {
      const currentUser = getUser();
      setUser(currentUser);
      setLoading(false);
    };
    loadUser();
  }, []);

  // Login
  const login = (token) => {
    setToken(token);
    const userData = getUser();
    setUser(userData);
  };

  // Logout
  const logout = () => {
    removeToken();
    setUser(null);
  };

  // Verificar si está autenticado
  const isAuthenticated = () => {
    return !!user && !!getToken();
  };

  // Verificar si es manager
  const isManager = () => {
    return user && user.rol?.toUpperCase() === 'MANAGER';
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAuthenticated,
    isManager,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

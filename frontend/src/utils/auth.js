import { jwtDecode } from 'jwt-decode';

export const getToken = () => {
  return localStorage.getItem('token');
};

export const setToken = (token) => {
  localStorage.setItem('token', token);
};

export const removeToken = () => {
  localStorage.removeItem('token');
};

export const getUser = () => {
  const token = getToken();
  if (!token) return null;
  try {
    const payload = jwtDecode(token);
    // Verificar expiración (exp en segundos)
    if (payload && payload.exp && Date.now() >= payload.exp * 1000) {
      removeToken();
      return null;
    }
    return payload.user;
  } catch (e) {
    // Token inválido
    removeToken();
    return null;
  }
};

export const isAuthenticated = () => !!getUser();
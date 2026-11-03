import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isReady, setIsReady] = useState(!localStorage.getItem('token'));

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!token) { setUser(null); setIsReady(true); return; }
      setIsReady(false);
      try {
        const data = await request('/auth/me');
        if (active) setUser(data.user);
      } catch {
        localStorage.removeItem('token');
        if (active) { setToken(null); setUser(null); }
      } finally {
        if (active) setIsReady(true);
      }
    }
    loadUser();
    return () => { active = false; };
  }, [token]);

  async function login(email, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) });
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setToken(data.token);
    setIsReady(true);
    return data;
  }

  async function register(name, email, password) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email, password }) });
  }

  function acceptSession(data) {
    localStorage.setItem('token', data.token);
    setUser(data.user);
    setToken(data.token);
    setIsReady(true);
    return data;
  }

  async function updateProfile(name) {
    const data = await request('/auth/me', { method: 'PATCH', body: JSON.stringify({ name }) });
    setUser(data.user);
    return data;
  }

  function updateCurrentUser(nextUser) { setUser(nextUser); }

  function logout() {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setIsReady(true);
  }

  const value = useMemo(() => ({ user, token, isReady, login, register, logout, updateProfile, acceptSession, updateCurrentUser }), [user, token, isReady]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

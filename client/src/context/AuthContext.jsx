import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { request } from '../api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(() => localStorage.getItem('token'));
  const [isReady, setIsReady] = useState(!localStorage.getItem('token'));
  const [sessionError, setSessionError] = useState('');
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let active = true;
    async function loadUser() {
      if (!token) { setUser(null); setSessionError(''); setIsReady(true); return; }
      setIsReady(false);
      try {
        const data = await request('/auth/me');
        if (active) { setUser(data.user); setSessionError(''); }
      } catch (error) {
        if (!active) return;
        if (error.status === 401) {
          localStorage.removeItem('token');
          setToken(null);
          setUser(null);
          setSessionError('');
        } else {
          setSessionError('Chưa thể xác minh phiên đăng nhập. Hãy kiểm tra kết nối rồi thử lại.');
        }
      } finally {
        if (active) setIsReady(true);
      }
    }
    loadUser();
    return () => { active = false; };
  }, [token, retryCount]);

  function retrySession() {
    setSessionError('');
    setRetryCount((current) => current + 1);
  }

  async function login(identifier, password) {
    const data = await request('/auth/login', { method: 'POST', body: JSON.stringify({ identifier, password }) });
    localStorage.setItem('token', data.token);
    setSessionError('');
    setUser(data.user);
    setToken(data.token);
    setIsReady(true);
    return data;
  }

  async function register(name, identifier, password) {
    return request('/auth/register', { method: 'POST', body: JSON.stringify({ name, email: identifier, password }) });
  }

  function acceptSession(data) {
    localStorage.setItem('token', data.token);
    setSessionError('');
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
    setSessionError('');
    setToken(null);
    setUser(null);
    setIsReady(true);
  }

  const value = useMemo(() => ({ user, token, isReady, sessionError, retrySession, login, register, logout, updateProfile, acceptSession, updateCurrentUser }), [user, token, isReady, sessionError]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => useContext(AuthContext);

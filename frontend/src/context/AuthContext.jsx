import { createContext, useEffect, useState } from 'react';
import * as api from '../services/api';

// eslint-disable-next-line react-refresh/only-export-components -- AuthContext doit être co-localisé avec AuthProvider
export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Hydrate l'état depuis localStorage au montage initial
  const [auth, setAuth] = useState(() => {
    const token = localStorage.getItem('token');
    const userId = localStorage.getItem('userId');
    const role = localStorage.getItem('role');
    const nom = localStorage.getItem('nom');
    const prenom = localStorage.getItem('prenom');
    // Session invalide si nom/prenom absents (session créée avant cette version)
    if (!token || !userId || !nom || !prenom) return null;
    return { token, userId, role, nom, prenom };
  });

  useEffect(() => {
    if (!auth) {
      ['token', 'userId', 'role', 'nom', 'prenom'].forEach(k => localStorage.removeItem(k));
    } else {
      localStorage.setItem('token', auth.token);
      localStorage.setItem('userId', auth.userId);
      localStorage.setItem('role', auth.role);
      localStorage.setItem('nom', auth.nom || '');
      localStorage.setItem('prenom', auth.prenom || '');
    }
  }, [auth]);

  async function login(email, password) {
    const data = await api.login(email, password);
    setAuth({ token: data.token, userId: data.userId, role: data.role, nom: data.nom, prenom: data.prenom });
    return data;
  }

  function logout() {
    setAuth(null);
  }

  function updateAuth(data) {
    setAuth(prev => ({ ...prev, ...data }));
  }

  return (
    <AuthContext.Provider value={{ auth, login, logout, updateAuth }}>
      {children}
    </AuthContext.Provider>
  );
}

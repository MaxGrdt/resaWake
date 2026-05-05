import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';

/**
 * Retourne le contexte d'authentification (auth, login, logout, updateAuth).
 * Doit être utilisé à l'intérieur de AuthProvider — lance une erreur sinon.
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth doit être utilisé dans AuthProvider');
  return ctx;
}

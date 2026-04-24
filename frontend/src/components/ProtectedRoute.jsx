import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

// role optionnel : si fourni, l'utilisateur doit avoir ce rôle pour accéder
export default function ProtectedRoute({ children, role }) {
  const { auth } = useAuth();
  if (!auth) return <Navigate to="/login" replace />;
  if (role && auth.role !== role) return <Navigate to="/" replace />;
  return children;
}

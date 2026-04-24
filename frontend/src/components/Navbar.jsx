import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  function handleLogout() {
    logout();
    navigate('/login');
  }

  function scrollToResas(e) {
    e.preventDefault();
    if (location.pathname === '/') {
      document.getElementById('mes-reservations')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'mes-reservations' } });
    }
  }

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">🌊 ResaWake</Link>
      <div className="navbar-links">
        {auth ? (
          <>
            {auth.role !== 'admin' && (
              <>
                <Link to="/profil" className="nav-link">Mon profil</Link>
                <a href="#mes-reservations" onClick={scrollToResas} className="nav-link">Mes réservations</a>
              </>
            )}
            <button onClick={handleLogout} className="btn btn-ghost">Déconnexion</button>
          </>
        ) : (
          <Link to="/login">Connexion</Link>
        )}
      </div>
    </nav>
  );
}

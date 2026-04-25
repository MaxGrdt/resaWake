import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export default function Navbar() {
  const { auth, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  function handleLogout() {
    logout();
    navigate('/login');
    setMenuOpen(false);
  }

  function scrollToResas(e) {
    e.preventDefault();
    setMenuOpen(false);
    if (location.pathname === '/') {
      document.getElementById('mes-reservations')?.scrollIntoView({ behavior: 'smooth' });
    } else {
      navigate('/', { state: { scrollTo: 'mes-reservations' } });
    }
  }

  // Ferme le menu au clic en dehors
  useEffect(() => {
    if (!menuOpen) return;
    function onMouseDown(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [menuOpen]);

  // Ferme le menu à chaque changement de route
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);

  return (
    <nav className="navbar" ref={menuRef}>
      <Link to="/" className="navbar-brand">🌊 ResaWake</Link>

      {/* Liens desktop */}
      <div className="navbar-links navbar-links--desktop">
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

      {/* Burger (mobile uniquement) */}
      {auth && (
        <button
          className="burger"
          aria-label="Menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
        >
          <span /><span /><span />
        </button>
      )}
      {!auth && (
        <div className="navbar-links navbar-links--mobile-auth">
          <Link to="/login">Connexion</Link>
        </div>
      )}

      {/* Menu déroulant mobile */}
      {auth && menuOpen && (
        <div className="navbar-mobile-menu">
          {auth.role !== 'admin' && (
            <>
              <Link to="/profil" className="mobile-nav-link" onClick={() => setMenuOpen(false)}>Mon profil</Link>
              <a href="#mes-reservations" onClick={scrollToResas} className="mobile-nav-link">Mes réservations</a>
            </>
          )}
          <button onClick={handleLogout} className="mobile-nav-link mobile-nav-link--btn">Déconnexion</button>
        </div>
      )}
    </nav>
  );
}

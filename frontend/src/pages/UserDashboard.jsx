import { useEffect, useState, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

export default function UserDashboard() {
  const location = useLocation();
  const { auth } = useAuth();
  const nomComplet = `${auth?.prenom || ''} ${auth?.nom || ''}`.trim();
  const [date, setDate] = useState(todayISO());
  const [slotsData, setSlotsData] = useState(null);
  const [myResas, setMyResas] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const scrollTimerRef = useRef(null);

  const loadSlots = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await api.getSlots(date);
      setSlotsData(data);
    } catch (err) {
      setError(err.message);
      setSlotsData(null);
    } finally {
      setLoading(false);
    }
  }, [date]);

  const loadMyResas = useCallback(async () => {
    try {
      const data = await api.getMyReservations();
      setMyResas(data);
    } catch (err) {
      console.error(err);
    }
  }, []);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadSlots(); }, [loadSlots]);
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { loadMyResas(); }, [loadMyResas]);

  // Scroll automatique si on arrive depuis la Navbar via navigate(state)
  useEffect(() => {
    if (location.state?.scrollTo) {
      clearTimeout(scrollTimerRef.current);
      scrollTimerRef.current = setTimeout(() => {
        document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
    return () => clearTimeout(scrollTimerRef.current);
  }, [location.state]);

  const [pending, setPending] = useState(null); // { heure, ligne }
  const [cancelTarget, setCancelTarget] = useState(null); // resa à annuler
  const [tooLateMessage, setTooLateMessage] = useState(null); // string
  const [showWelcome, setShowWelcome] = useState(false);

  // Affiche le pop-up d'accueil une fois par session pour les adhérents
  useEffect(() => {
    if (!auth || auth.role === 'admin') return;
    if (sessionStorage.getItem('welcomeSeen') === '1') return;
    setShowWelcome(true);
  }, [auth]);

  function closeWelcome() {
    sessionStorage.setItem('welcomeSeen', '1');
    setShowWelcome(false);
  }

  function startMs(resa) {
    const [hh, mm] = (resa.heure || '00:00').split(':').map(Number);
    const d = new Date(resa.date);
    d.setHours(hh, mm, 0, 0);
    return d.getTime();
  }

  function canCancel(resa) {
    return startMs(resa) - Date.now() >= 24 * 60 * 60 * 1000;
  }

  function handleCancelClick(resa) {
    if (canCancel(resa)) {
      setCancelTarget(resa);
    } else {
      setTooLateMessage('Annulation impossible à moins de 24h. Appelez le parc pour annuler votre réservation.');
    }
  }

  async function confirmCancel() {
    if (!cancelTarget) return;
    const id = cancelTarget._id;
    setCancelTarget(null);
    setError(null);
    setInfo(null);
    try {
      await api.deleteMyReservation(id);
      setInfo('Réservation annulée.');
      await Promise.all([loadSlots(), loadMyResas()]);
    } catch (err) {
      setError(err.message);
    }
  }

  async function reserver(heure, ligne) {
    setError(null);
    setInfo(null);
    try {
      await api.createReservation(date, heure, ligne);
      setInfo(`Créneau ${heure} ligne ${ligne} réservé !`);
      await Promise.all([loadSlots(), loadMyResas()]);
    } catch (err) {
      setError(err.message);
    }
  }

  function handleReserverClick(heure, ligne) {
    setPending({ heure, ligne });
  }

  async function confirmReservation() {
    if (!pending) return;
    const { heure, ligne } = pending;
    setPending(null);
    await reserver(heure, ligne);
  }

  // Index des réservations du user pour la date sélectionnée (heure-ligne)
  // Comparaison en heure locale pour éviter décalage de fuseau horaire
  const myResaKeys = new Set(
    myResas
      .filter(r => {
        const d = new Date(r.date);
        const localISO = new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
        return localISO === date;
      })
      .map(r => `${r.heure}-${r.ligne}`)
  );

  // Regroupe les créneaux par heure pour affichage en lignes
  const lignes = slotsData?.lignes || [1, 2];
  const grouped = {};
  if (slotsData?.creneaux) {
    for (const c of slotsData.creneaux) {
      if (!grouped[c.heure]) grouped[c.heure] = {};
      grouped[c.heure][c.ligne] = c;
    }
  }
  const heures = Object.keys(grouped).sort();

  return (
    <div className="page">
      <h1>Réserver un créneau</h1>

      {/* Pop-up d'accueil (une fois par session) */}
      {showWelcome && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={closeWelcome}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 420, width: '90%',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center',
            }}
          >
            <h2 style={{ marginTop: 0 }}>Information</h2>
            <p style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Créneau indisponible ? Appelez le parc, nous ferons notre possible pour vous trouver une place&nbsp;!
            </p>
            <button className="btn btn-primary" onClick={closeWelcome} autoFocus>Fermer</button>
          </div>
        </div>
      )}

      {/* Modale de confirmation d'annulation */}
      {cancelTarget && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 380, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Annuler votre réservation du{' '}
              <strong>{new Date(cancelTarget.date).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              {' à '}<strong>{cancelTarget.heure}</strong> (ligne {cancelTarget.ligne})&nbsp;?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={confirmCancel}>Oui, annuler</button>
              <button className="btn" onClick={() => setCancelTarget(null)}>Non</button>
            </div>
          </div>
        </div>
      )}

      {/* Modale d'information — trop tard pour annuler */}
      {tooLateMessage && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 380, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              {tooLateMessage}
            </p>
            <button className="btn btn-primary" onClick={() => setTooLateMessage(null)}>OK</button>
          </div>
        </div>
      )}

      {/* Modale de confirmation */}
      {pending && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
        }}>
          <div style={{
            background: '#fff', borderRadius: 12, padding: '2rem', maxWidth: 360, width: '90%',
            boxShadow: '0 8px 32px rgba(0,0,0,0.18)', textAlign: 'center',
          }}>
            <p style={{ fontSize: '1.05rem', marginBottom: '1.5rem', lineHeight: 1.5 }}>
              Êtes-vous sûr de vouloir réserver le créneau du{' '}
              <strong>{new Date(date + 'T00:00:00').toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })}</strong>
              {' '}à <strong>{pending.heure}</strong> (ligne {pending.ligne})&nbsp;?
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={confirmReservation}>Oui</button>
              <button className="btn" onClick={() => setPending(null)}>Non</button>
            </div>
          </div>
        </div>
      )}

      <div className="card">
        <div className="row" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span>Date :</span>
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setDate((d) => shiftDate(d, -1))}
            title="Jour précédent"
            disabled={date <= todayISO()}
          >◀</button>
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
          <button
            className="btn btn-sm btn-ghost"
            onClick={() => setDate((d) => shiftDate(d, 1))}
            title="Jour suivant"
          >▶</button>
        </div>

        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-success">{info}</div>}

        {loading && <p>Chargement…</p>}

        {!loading && slotsData && heures.length === 0 && (
          <p className="muted">{slotsData.message || 'Aucun créneau ce jour-là.'}</p>
        )}

        {!loading && heures.length > 0 && (
          <table className="slots-table">
            <thead>
              <tr>
                <th>Heure</th>
                {lignes.map((l) => <th key={l}>Ligne {l}</th>)}
              </tr>
            </thead>
            <tbody>
              {heures.map((h) => (
                <tr key={h}>
                  <td className="hour">{h}</td>
                  {lignes.map((ligne) => {
                    const slot = grouped[h][ligne];
                    return (
                      <td key={ligne}>
                        {slot.statut === 'disponible' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => handleReserverClick(h, ligne)}
                          >
                            Réserver
                          </button>
                        ) : slot.statut === 'blocage' ? (
                          <span className="badge badge-blocked">Bloqué</span>
                        ) : myResaKeys.has(`${h}-${ligne}`) ? (
                          <span className="badge badge-taken">{nomComplet}</span>
                        ) : (
                          <span className="badge badge-taken">Réservé</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="card" id="mes-reservations">
        <h2>Mes réservations à venir</h2>
        {myResas.length === 0 ? (
          <p className="muted">Aucune réservation.</p>
        ) : (
          <ul className="resa-list">
            {myResas.map((r) => (
              <li key={r._id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <span>
                  <strong>{new Date(r.date).toLocaleDateString('fr-FR')}</strong>
                  {' '}— {r.heure} — Ligne {r.ligne}
                </span>
                <button
                  className="btn btn-sm btn-danger"
                  onClick={() => handleCancelClick(r)}
                >
                  Annuler
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

import { useEffect, useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  const local = new Date(d.getTime() - off * 60 * 1000);
  return local.toISOString().slice(0, 10);
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

  useEffect(() => { loadSlots(); }, [loadSlots]);
  useEffect(() => { loadMyResas(); }, [loadMyResas]);

  // Scroll automatique si on arrive depuis la Navbar via navigate(state)
  useEffect(() => {
    if (location.state?.scrollTo) {
      setTimeout(() => {
        document.getElementById(location.state.scrollTo)?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [location.state]);

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

  // Index des réservations du user pour la date sélectionnée (heure-ligne)
  const myResaKeys = new Set(
    myResas
      .filter(r => new Date(r.date).toISOString().slice(0, 10) === date)
      .map(r => `${r.heure}-${r.ligne}`)
  );

  // Regroupe les créneaux par heure pour affichage en lignes
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

      <div className="card">
        <label className="row">
          <span>Date :</span>
          <input
            type="date"
            value={date}
            min={todayISO()}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

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
                <th>Ligne 1</th>
                <th>Ligne 2</th>
              </tr>
            </thead>
            <tbody>
              {heures.map((h) => (
                <tr key={h}>
                  <td className="hour">{h}</td>
                  {[1, 2].map((ligne) => {
                    const slot = grouped[h][ligne];
                    return (
                      <td key={ligne}>
                        {slot.statut === 'disponible' ? (
                          <button
                            className="btn btn-primary btn-sm"
                            onClick={() => reserver(h, ligne)}
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
              <li key={r._id}>
                <strong>{new Date(r.date).toLocaleDateString('fr-FR')}</strong>
                {' '}— {r.heure} — Ligne {r.ligne}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

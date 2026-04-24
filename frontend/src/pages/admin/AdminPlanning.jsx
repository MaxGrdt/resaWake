import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api';

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminPlanning() {
  const [date, setDate] = useState(todayISO());
  const [slotsData, setSlotsData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  const reload = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const [slots, resas] = await Promise.all([
        api.getSlots(date),
        api.adminGetReservations(date),
      ]);
      setSlotsData(slots);
      setReservations(resas);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => { reload(); }, [reload]);

  // Index par "heure-ligne" pour retrouver l'objet réservation complet
  const resaByKey = {};
  for (const r of reservations) {
    resaByKey[`${r.heure}-${r.ligne}`] = r;
  }

  // Regroupe les créneaux par heure
  const grouped = {};
  if (slotsData?.creneaux) {
    for (const c of slotsData.creneaux) {
      if (!grouped[c.heure]) grouped[c.heure] = {};
      grouped[c.heure][c.ligne] = c;
    }
  }
  const heures = Object.keys(grouped).sort();

  async function bloquer(heure, ligne) {
    setError(null);
    setInfo(null);
    try {
      await api.adminCreateReservation({ date, heure, ligne, type: 'blocage' });
      setInfo(`Créneau ${heure} ligne ${ligne} bloqué.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function supprimer(id) {
    if (!confirm('Supprimer cette réservation ?')) return;
    setError(null);
    setInfo(null);
    try {
      await api.adminDeleteReservation(id);
      setInfo('Réservation supprimée.');
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <label className="row">
        <span>Date :</span>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
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
                  const resa = resaByKey[`${h}-${ligne}`];
                  return (
                    <td key={ligne}>
                      {slot.statut === 'disponible' ? (
                        <button className="btn btn-sm btn-ghost" onClick={() => bloquer(h, ligne)}>
                          Bloquer
                        </button>
                      ) : slot.statut === 'blocage' ? (
                        <div className="cell-busy">
                          <span className="badge badge-blocked">Bloqué</span>
                          {resa && (
                            <button className="btn btn-sm btn-ghost" onClick={() => supprimer(resa._id)}>
                              ✕
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="cell-busy">
                          <span className="badge badge-taken">
                            {resa?.userId
                              ? `${resa.userId.prenom || ''} ${resa.userId.nom || ''}`.trim() || resa.userId.email
                              : 'Réservé'}
                          </span>
                          {resa && (
                            <button className="btn btn-sm btn-ghost" onClick={() => supprimer(resa._id)}>
                              ✕
                            </button>
                          )}
                        </div>
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
  );
}

import { useCallback, useEffect, useState } from 'react';
import * as api from '../../services/api';

function todayISO() {
  const d = new Date();
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDate(iso, days) {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + days);
  const off = d.getTimezoneOffset();
  return new Date(d.getTime() - off * 60 * 1000).toISOString().slice(0, 10);
}

export default function AdminPlanning() {
  const [date, setDate] = useState(todayISO());
  const [slotsData, setSlotsData] = useState(null);
  const [reservations, setReservations] = useState([]);
  const [users, setUsers] = useState([]);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [editMode, setEditMode] = useState(false);

  // Charge la liste des adhérents une fois (triée par nom puis prénom)
  useEffect(() => {
    api.adminGetUsers()
      .then((list) => {
        const sorted = [...list].sort((a, b) => {
          const na = `${a.prenom || ''} ${a.nom || ''}`.toLowerCase();
          const nb = `${b.prenom || ''} ${b.nom || ''}`.toLowerCase();
          return na.localeCompare(nb);
        });
        setUsers(sorted);
      })
      .catch(() => { /* silencieux : la cellule restera utilisable pour bloquer */ });
  }, []);

  const [initialLoading, setInitialLoading] = useState(true);

  const reload = useCallback(async () => {
    setError(null);
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
      setInitialLoading(false);
    }
  }, [date]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setInitialLoading(true); reload(); }, [reload]);

  // Index par "heure-ligne" pour retrouver l'objet réservation complet
  const resaByKey = {};
  for (const r of reservations) {
    resaByKey[`${r.heure}-${r.ligne}`] = r;
  }

  // Regroupe les créneaux par heure
  const lignes = slotsData?.lignes || [1, 2];
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
    const saisi = window.prompt('Nom du client :', '');
    if (saisi === null) return; // annulation
    const clientNom = saisi.trim();
    if (!clientNom) {
      setError('Le nom du client est requis pour bloquer un créneau.');
      return;
    }
    try {
      await api.adminCreateReservation({ date, heure, ligne, type: 'blocage', clientNom });
      setInfo(`Créneau ${heure} ligne ${ligne} bloqué pour ${clientNom}.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function reserverPourUser(heure, ligne, userId) {
    setError(null);
    setInfo(null);
    try {
      await api.adminCreateReservation({ date, heure, ligne, type: 'reservation', userId });
      const u = users.find((x) => x._id === userId);
      const label = u ? `${u.prenom || ''} ${u.nom || ''}`.trim() || u.email : 'adhérent';
      setInfo(`Créneau ${heure} ligne ${ligne} réservé pour ${label}.`);
      await reload();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleAction(heure, ligne, value) {
    if (!value) return;
    if (value === '__blocage__') {
      await bloquer(heure, ligne);
    } else {
      await reserverPourUser(heure, ligne, value);
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
      <div className="row" style={{ alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
        <span>Date :</span>
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setDate((d) => shiftDate(d, -1))}
          title="Jour précédent"
        >◀</button>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        <button
          className="btn btn-sm btn-ghost"
          onClick={() => setDate((d) => shiftDate(d, 1))}
          title="Jour suivant"
        >▶</button>
        <button
          className={editMode ? 'btn btn-sm btn-primary' : 'btn btn-sm'}
          onClick={() => setEditMode((v) => !v)}
          style={{ marginLeft: 'auto' }}
        >
          {editMode ? 'Terminer' : 'Modifier'}
        </button>
      </div>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      {initialLoading && <p>Chargement…</p>}

      {!initialLoading && slotsData && heures.length === 0 && (
        <p className="muted">{slotsData.message || 'Aucun créneau ce jour-là.'}</p>
      )}

      {!initialLoading && heures.length > 0 && (
        <div style={{ overflowX: 'auto' }}>
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
                  const resa = resaByKey[`${h}-${ligne}`];
                  return (
                    <td key={ligne}>
                      {slot.statut === 'disponible' ? (
                        editMode ? (
                        <select
                          className="btn btn-sm btn-ghost"
                          value=""
                          onChange={(e) => {
                            const v = e.target.value;
                            e.target.value = '';
                            handleAction(h, ligne, v);
                          }}
                        >
                          <option value="" disabled hidden></option>
                          <option value="__blocage__">Saisir le nom du client</option>
                          {users.length > 0 && (
                            <optgroup label="Réserver pour un adhérent">
                              {users.map((u) => (
                                <option key={u._id} value={u._id}>
                                  {`${u.prenom || ''} ${u.nom || ''}`.trim() || u.email}
                                </option>
                              ))}
                            </optgroup>
                          )}
                        </select>
                        ) : null
                      ) : slot.statut === 'blocage' ? (
                        <div className="cell-busy">
                          <span className="badge badge-blocked">{resa?.clientNom || 'Bloqué'}</span>
                          {editMode && resa && (
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
                          {editMode && resa && (
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
        </div>
      )}
    </div>
  );
}

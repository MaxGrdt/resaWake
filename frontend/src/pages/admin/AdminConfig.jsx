import { useEffect, useState } from 'react';
import * as api from '../../services/api';

const JOURS = [
  { v: 1, l: 'Lun' },
  { v: 2, l: 'Mar' },
  { v: 3, l: 'Mer' },
  { v: 4, l: 'Jeu' },
  { v: 5, l: 'Ven' },
  { v: 6, l: 'Sam' },
  { v: 0, l: 'Dim' },
];

function dateToISO(d) {
  return new Date(d).toISOString().slice(0, 10);
}

export default function AdminConfig() {
  const [config, setConfig] = useState({
    joursSemaine: [],
    heureOuverture: '09:00',
    heureFermeture: '19:00',
    joursExceptionnellementFermes: [],
    lignesOuvertes: [1, 2],
  });
  const [newClosedDate, setNewClosedDate] = useState('');
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const data = await api.getConfig();
        setConfig({
          joursSemaine: data.joursSemaine || [],
          heureOuverture: data.heureOuverture || '09:00',
          heureFermeture: data.heureFermeture || '19:00',
          joursExceptionnellementFermes: (data.joursExceptionnellementFermes || []).map(dateToISO),
          lignesOuvertes: data.lignesOuvertes && data.lignesOuvertes.length > 0 ? data.lignesOuvertes : [1, 2],
        });
      } catch (err) {
        // 404 = pas encore de config, on garde les valeurs par défaut
        if (err.status !== 404) setError(err.message);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  function toggleLigne(v) {
    setConfig((c) => {
      const next = c.lignesOuvertes.includes(v)
        ? c.lignesOuvertes.filter((l) => l !== v)
        : [...c.lignesOuvertes, v].sort();
      // Au moins une ligne doit rester ouverte
      if (next.length === 0) return c;
      return { ...c, lignesOuvertes: next };
    });
  }

  function toggleJour(v) {
    setConfig((c) => ({
      ...c,
      joursSemaine: c.joursSemaine.includes(v)
        ? c.joursSemaine.filter((j) => j !== v)
        : [...c.joursSemaine, v].sort(),
    }));
  }

  function addClosedDate() {
    if (!newClosedDate) return;
    setConfig((c) => ({
      ...c,
      joursExceptionnellementFermes: c.joursExceptionnellementFermes.includes(newClosedDate)
        ? c.joursExceptionnellementFermes
        : [...c.joursExceptionnellementFermes, newClosedDate].sort(),
    }));
    setNewClosedDate('');
  }

  function removeClosedDate(d) {
    setConfig((c) => ({
      ...c,
      joursExceptionnellementFermes: c.joursExceptionnellementFermes.filter((x) => x !== d),
    }));
  }

  async function handleSave(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    try {
      await api.saveConfig(config);
      setInfo('Configuration enregistrée !');
    } catch (err) {
      setError(err.message);
    }
  }

  if (loading) return <p>Chargement…</p>;

  return (
    <form className="card form" onSubmit={handleSave}>
      <h2>Configuration du parc</h2>

      <fieldset>
        <legend>Lignes ouvertes</legend>
        <div className="days">
          {[1, 2].map((l) => (
            <label key={l} className="check">
              <input
                type="checkbox"
                checked={config.lignesOuvertes.includes(l)}
                onChange={() => toggleLigne(l)}
              />
              Ligne {l}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Jours d'ouverture (semaine type)</legend>
        <div className="days">
          {JOURS.map((j) => (
            <label key={j.v} className="check">
              <input
                type="checkbox"
                checked={config.joursSemaine.includes(j.v)}
                onChange={() => toggleJour(j.v)}
              />
              {j.l}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="grid-2">
        <label>
          Heure d'ouverture
          <input
            type="time"
            value={config.heureOuverture}
            onChange={(e) => setConfig({ ...config, heureOuverture: e.target.value })}
            required
          />
        </label>
        <label>
          Heure de fermeture
          <input
            type="time"
            value={config.heureFermeture}
            onChange={(e) => setConfig({ ...config, heureFermeture: e.target.value })}
            required
          />
        </label>
      </div>

      <fieldset>
        <legend>Jours exceptionnellement fermés</legend>
        <div className="row">
          <input
            type="date"
            value={newClosedDate}
            onChange={(e) => setNewClosedDate(e.target.value)}
          />
          <button type="button" className="btn" onClick={addClosedDate}>Ajouter</button>
        </div>
        <ul className="closed-list">
          {config.joursExceptionnellementFermes.map((d) => (
            <li key={d}>
              {new Date(d).toLocaleDateString('fr-FR')}
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeClosedDate(d)}>
                ✕
              </button>
            </li>
          ))}
        </ul>
      </fieldset>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <button type="submit" className="btn btn-primary">Enregistrer</button>
    </form>
  );
}

import { useState, useEffect, useMemo, useCallback } from 'react';
import { adminGetStats, adminGetCustomStats } from '../../services/api';
import StatsChart from './StatsChart';

const PERIODS = [
  { key: 'day', label: "Aujourd'hui" },
  { key: 'week', label: 'Cette semaine' },
  { key: 'month', label: 'Ce mois' },
  { key: 'year', label: 'Cette année' },
];

const TYPE_LABELS = {
  day: 'Jour',
  week: 'Semaine',
  month: 'Mois',
  year: 'Année',
};

// Vérifie que la valeur correspond bien au type avant d'appeler l'API
// (évite l'appel parasite quand type change mais value n'est pas encore réinitialisée)
function valueMatchesType(type, value) {
  if (!value) return false;
  if (type === 'day')   return /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (type === 'week')  return /^\d{4}-W\d{2}$/.test(value);
  if (type === 'month') return /^\d{4}-\d{2}$/.test(value) && !value.includes('W');
  if (type === 'year')  return /^\d{4}$/.test(value);
  return false;
}

// Valeurs par défaut pour chaque type (date d'aujourd'hui)
function defaultValues() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  // Numéro de semaine ISO
  const tmp = new Date(Date.UTC(yyyy, now.getMonth(), now.getDate()));
  const dayNum = (tmp.getUTCDay() + 6) % 7;
  tmp.setUTCDate(tmp.getUTCDate() - dayNum + 3);
  const firstThursday = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 4));
  const weekNum = 1 + Math.round(((tmp - firstThursday) / 86400000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);

  return {
    day: `${yyyy}-${mm}-${dd}`,
    week: `${tmp.getUTCFullYear()}-W${String(weekNum).padStart(2, '0')}`,
    month: `${yyyy}-${mm}`,
    year: String(yyyy),
  };
}

function CustomPicker({ type, setType, value, setValue }) {
  return (
    <div className="row" style={{ flexWrap: 'wrap', gap: '0.5rem' }}>
      <select value={type} onChange={(e) => setType(e.target.value)}>
        {Object.entries(TYPE_LABELS).map(([k, l]) => (
          <option key={k} value={k}>{l}</option>
        ))}
      </select>
      {type === 'day' && (
        <input type="date" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      {type === 'week' && (
        <input type="week" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      {type === 'month' && (
        <input type="month" value={value} onChange={(e) => setValue(e.target.value)} />
      )}
      {type === 'year' && (
        <input
          type="number"
          min="2020"
          max="2100"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          style={{ width: 110 }}
        />
      )}
    </div>
  );
}

export default function AdminStats() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [period, setPeriod] = useState('day');

  // Recherche personnalisée — totaux
  const initial = useMemo(() => defaultValues(), []);
  const [totType, setTotType] = useState('day');
  const [totValue, setTotValue] = useState(initial.day);
  const [totData, setTotData] = useState(null);
  const [totLoading, setTotLoading] = useState(false);
  const [totError, setTotError] = useState(null);

  // Recherche personnalisée — par adhérent
  const [userType, setUserType] = useState('day');
  const [userValue, setUserValue] = useState(initial.day);
  const [userData, setUserData] = useState(null);
  const [userLoading, setUserLoading] = useState(false);
  const [userError, setUserError] = useState(null);

  // Quand on change le type → reset sur la valeur par défaut courante
  useEffect(() => { setTotValue(defaultValues()[totType]); }, [totType]);
  useEffect(() => { setUserValue(defaultValues()[userType]); }, [userType]);

  // Chargement initial des stats prédéfinies
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    adminGetStats()
      .then((data) => { if (!cancelled) setStats(data); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  // Recherche totaux personnalisés
  const fetchTotals = useCallback(() => {
    if (!valueMatchesType(totType, totValue)) return;
    setTotLoading(true);
    setTotError(null);
    adminGetCustomStats(totType, totValue)
      .then(setTotData)
      .catch((err) => setTotError(err.message))
      .finally(() => setTotLoading(false));
  }, [totType, totValue]);

  // Recherche par adhérent personnalisée
  const fetchUsers = useCallback(() => {
    if (!valueMatchesType(userType, userValue)) return;
    setUserLoading(true);
    setUserError(null);
    adminGetCustomStats(userType, userValue)
      .then(setUserData)
      .catch((err) => setUserError(err.message))
      .finally(() => setUserLoading(false));
  }, [userType, userValue]);

  useEffect(() => { fetchTotals(); }, [fetchTotals]);
  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  if (loading) return <div className="card"><p>Chargement…</p></div>;
  if (error) return <div className="card"><div className="alert alert-error">{error}</div></div>;
  if (!stats) return null;

  const perUser = stats.perUser[period] || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

      {/* ── Totaux rapides (cartes) ── */}
      <div className="card">
        <h2>Réservations totales</h2>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
            gap: '1rem',
            marginTop: '0.5rem',
          }}
        >
          {PERIODS.map((p) => (
            <div
              key={p.key}
              style={{
                background: '#f9fafb',
                borderRadius: 8,
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#6b7280', textTransform: 'uppercase' }}>
                {p.label}
              </div>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: '#023e8a', marginTop: '0.25rem' }}>
                {stats.totals[p.key] ?? 0}
              </div>
            </div>
          ))}
        </div>

        {/* Recherche personnalisée des totaux */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Recherche personnalisée</h3>
          <CustomPicker type={totType} setType={setTotType} value={totValue} setValue={setTotValue} />
          {totLoading && <p style={{ marginTop: '0.5rem' }}>Chargement…</p>}
          {totError && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{totError}</div>}
          {!totLoading && !totError && totData && (
            <div
              style={{
                marginTop: '0.75rem',
                background: '#eff6ff',
                borderRadius: 8,
                padding: '1rem',
                textAlign: 'center',
              }}
            >
              <div style={{ fontSize: '0.85rem', color: '#1e40af', textTransform: 'uppercase' }}>
                Total — {TYPE_LABELS[totType].toLowerCase()} sélectionné
              </div>
              <div style={{ fontSize: '2.25rem', fontWeight: 700, color: '#023e8a' }}>
                {totData.total}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Par utilisateur (filtres rapides) ── */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
          <h2 style={{ margin: 0 }}>Réservations par adhérent</h2>
          <div style={{ display: 'flex', gap: '0.25rem', flexWrap: 'wrap' }}>
            {PERIODS.map((p) => (
              <button
                key={p.key}
                className={`btn btn-sm ${period === p.key ? 'btn-primary' : ''}`}
                onClick={() => setPeriod(p.key)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {perUser.length === 0 ? (
          <p className="muted">Aucune réservation sur cette période.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="slots-table">
              <thead>
                <tr>
                  <th>Adhérent</th>
                  <th>Réservations</th>
                </tr>
              </thead>
              <tbody>
                {perUser.map((u) => (
                  <tr key={(u.userId || '') + (u.type || '') + (u.email || '') + Math.random()}>
                    <td>{u.type === 'blocage' ? <span className="muted">Réservation bloquée</span> : u.prenom || u.nom ? `${u.prenom || ''} ${u.nom || ''}`.trim() : <span className="muted">— compte supprimé —</span>}</td>
                    <td><strong>{u.count}</strong></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Recherche personnalisée par adhérent */}
        <div style={{ marginTop: '1.25rem', borderTop: '1px solid #e5e7eb', paddingTop: '1rem' }}>
          <h3 style={{ margin: '0 0 0.5rem', fontSize: '1rem' }}>Recherche personnalisée</h3>
          <CustomPicker type={userType} setType={setUserType} value={userValue} setValue={setUserValue} />
          {userLoading && <p style={{ marginTop: '0.5rem' }}>Chargement…</p>}
          {userError && <div className="alert alert-error" style={{ marginTop: '0.5rem' }}>{userError}</div>}
          {!userLoading && !userError && userData && (
            userData.perUser.length === 0 ? (
              <p className="muted" style={{ marginTop: '0.5rem' }}>
                Aucune réservation sur cette période ({userData.total} au total).
              </p>
            ) : (
              <div style={{ overflowX: 'auto', marginTop: '0.5rem' }}>
                <p className="muted" style={{ margin: '0 0 0.25rem' }}>
                  {userData.total} réservation{userData.total > 1 ? 's' : ''} au total
                </p>
                <table className="slots-table" style={{ marginTop: 0 }}>
                  <thead>
                    <tr>
                      <th>Adhérent</th>
                      <th>Réservations</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userData.perUser.map((u) => (
                      <tr key={(u.userId || '') + (u.type || '') + (u.email || '') + Math.random()}>
                        <td>{u.type === 'blocage' ? <span className="muted">Réservation bloquée</span> : u.prenom || u.nom ? `${u.prenom || ''} ${u.nom || ''}`.trim() : <span className="muted">— compte supprimé —</span>}</td>
                        <td><strong>{u.count}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )
          )}
        </div>
      </div>

      {/* ── Graphique adaptatif ── */}
      <StatsChart />
    </div>
  );
}

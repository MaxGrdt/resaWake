import { useState, useEffect } from 'react';
import { adminGetStats } from '../../services/api';
import { useCustomStats } from '../../hooks/useCustomStats';
import { currentISOWeek } from '../../utils/date';
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

// Valeurs par défaut pour chaque type (date d'aujourd'hui)
function defaultValues() {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');

  return {
    day: `${yyyy}-${mm}-${dd}`,
    week: currentISOWeek(),
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
  const [totType, setTotType] = useState('day');
  const [totValue, setTotValue] = useState(() => defaultValues().day);

  // Recherche personnalisée — par adhérent
  const [userType, setUserType] = useState('day');
  const [userValue, setUserValue] = useState(() => defaultValues().day);

  // Quand on change le type → reset sur la valeur par défaut courante
  useEffect(() => { setTotValue(defaultValues()[totType]); }, [totType]);
  useEffect(() => { setUserValue(defaultValues()[userType]); }, [userType]);

  // Chargement initial des stats prédéfinies
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await adminGetStats();
        if (!cancelled) setStats(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const { data: totData, loading: totLoading, error: totError } = useCustomStats(totType, totValue);
  const { data: userData, loading: userLoading, error: userError } = useCustomStats(userType, userValue);

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
                  <tr key={(u.userId || u.type || '') + '-' + (u.email || '')}>
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
                      <tr key={(u.userId || u.type || '') + '-' + (u.email || '')}>
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

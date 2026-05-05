import { useState, useEffect, useMemo } from 'react';
import { adminGetTimeseries } from '../../services/api';
import { currentISOWeek } from '../../utils/date';

const GRANULARITIES = [
  { key: 'day', label: 'Jour' },
  { key: 'week', label: 'Semaine' },
  { key: 'month', label: 'Mois' },
  { key: 'year', label: 'Année' },
];

// Helpers de conversion picker → ISO date
function pad(n) { return String(n).padStart(2, '0'); }

function isoFromMonth(value, end = false) {
  // value = YYYY-MM
  const [y, m] = value.split('-').map(Number);
  if (end) {
    const last = new Date(y, m, 0).getDate();
    return `${y}-${pad(m)}-${pad(last)}`;
  }
  return `${y}-${pad(m)}-01`;
}
function isoFromWeek(value, end = false) {
  // YYYY-Www → lundi (début) ou dimanche (fin)
  const m = /^(\d{4})-W(\d{2})$/.exec(value);
  if (!m) return '';
  const year = +m[1];
  const week = +m[2];
  const jan4 = new Date(year, 0, 4);
  const jan4Dow = (jan4.getDay() + 6) % 7;
  const monday = new Date(year, 0, 4 - jan4Dow + (week - 1) * 7);
  const target = end ? new Date(monday.getTime() + 6 * 86400000) : monday;
  return `${target.getFullYear()}-${pad(target.getMonth() + 1)}-${pad(target.getDate())}`;
}
function isoFromYear(value, end = false) {
  const y = parseInt(value, 10);
  if (!y) return '';
  return end ? `${y}-12-31` : `${y}-01-01`;
}

function toIso(granularity, value, end = false) {
  if (granularity === 'day') return value;
  if (granularity === 'month') return isoFromMonth(value, end);
  if (granularity === 'week') return isoFromWeek(value, end);
  if (granularity === 'year') return isoFromYear(value, end);
  return '';
}

function formatBucketLabel(granularity, isoString) {
  const d = new Date(isoString);
  if (granularity === 'day') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (granularity === 'week') return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}`;
  if (granularity === 'month') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  if (granularity === 'year') return String(d.getFullYear());
  return isoString;
}

function defaultRange(granularity) {
  const now = new Date();
  const y = now.getFullYear();
  if (granularity === 'day') {
    return {
      from: `${y}-${pad(now.getMonth() + 1)}-01`,
      to: `${y}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`,
    };
  }
  if (granularity === 'week') {
    // 4 dernières semaines
    const current = currentISOWeek();
    const wk = parseInt(current.slice(-2), 10);
    const wkYear = current.slice(0, 4);
    return {
      from: `${wkYear}-W${String(Math.max(1, wk - 4)).padStart(2, '0')}`,
      to: current,
    };
  }
  if (granularity === 'month') {
    return { from: `${y}-01`, to: `${y}-${pad(now.getMonth() + 1)}` };
  }
  if (granularity === 'year') {
    return { from: String(y - 4), to: String(y) };
  }
  return { from: '', to: '' };
}

function PickerInput({ granularity, value, onChange }) {
  if (granularity === 'day')   return <input type="date"  value={value} onChange={(e) => onChange(e.target.value)} />;
  if (granularity === 'week')  return <input type="week"  value={value} onChange={(e) => onChange(e.target.value)} />;
  if (granularity === 'month') return <input type="month" value={value} onChange={(e) => onChange(e.target.value)} />;
  if (granularity === 'year')  return <input type="number" min="2020" max="2100" value={value} onChange={(e) => onChange(e.target.value)} style={{ width: 110 }} />;
  return null;
}

// SVG bar chart simple
function BarChart({ buckets, granularity }) {
  if (!buckets || buckets.length === 0) {
    return <p className="muted" style={{ marginTop: '1rem' }}>Aucune donnée pour cette plage.</p>;
  }

  const W = 720, H = 280;
  const padL = 40, padR = 16, padT = 16, padB = 56;
  const innerW = W - padL - padR;
  const innerH = H - padT - padB;

  const max = Math.max(...buckets.map((b) => b.count), 1);
  // Échelle Y avec arrondi sup
  const yTicks = 4;
  const yMax = Math.ceil(max / yTicks) * yTicks || yTicks;

  const barGap = 4;
  const barW = Math.max(2, (innerW - barGap * (buckets.length - 1)) / buckets.length);

  return (
    <div style={{ overflowX: 'auto', marginTop: '1rem' }}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" style={{ minWidth: 360, maxWidth: '100%', display: 'block' }}>
        {/* Grille + labels Y */}
        {Array.from({ length: yTicks + 1 }, (_, i) => {
          const v = (yMax / yTicks) * (yTicks - i);
          const y = padT + (innerH / yTicks) * i;
          return (
            <g key={i}>
              <line x1={padL} y1={y} x2={W - padR} y2={y} stroke="#e5e7eb" strokeWidth="1" />
              <text x={padL - 6} y={y + 4} textAnchor="end" fontSize="11" fill="#6b7280">{Math.round(v)}</text>
            </g>
          );
        })}

        {/* Barres */}
        {buckets.map((b, i) => {
          const h = (b.count / yMax) * innerH;
          const x = padL + i * (barW + barGap);
          const y = padT + innerH - h;
          const label = formatBucketLabel(granularity, b.bucket);
          return (
            <g key={i}>
              <rect x={x} y={y} width={barW} height={h} fill="#0077b6" rx="2">
                <title>{`${label} : ${b.count}`}</title>
              </rect>
              {b.count > 0 && barW > 18 && (
                <text x={x + barW / 2} y={y - 4} textAnchor="middle" fontSize="10" fill="#1f2937">
                  {b.count}
                </text>
              )}
              <text
                x={x + barW / 2}
                y={H - padB + 14}
                textAnchor="end"
                fontSize="10"
                fill="#6b7280"
                transform={`rotate(-45 ${x + barW / 2} ${H - padB + 14})`}
              >
                {label}
              </text>
            </g>
          );
        })}

        {/* Axe X */}
        <line x1={padL} y1={padT + innerH} x2={W - padR} y2={padT + innerH} stroke="#9ca3af" strokeWidth="1" />
      </svg>
    </div>
  );
}

const TYPE_FILTERS = [
  { key: 'all', label: 'Toutes les réservations' },
  { key: 'reservation_forfait', label: 'Adhérents (avec forfait saison)' },
  { key: 'reservation_no_forfait', label: 'Adhérents (sans forfait saison)' },
  { key: 'reservation', label: 'Tous les adhérents' },
  { key: 'blocage', label: 'Réservation bloquée' },
];

export default function StatsChart() {
  const [granularity, setGranularity] = useState('month');
  const [from, setFrom] = useState(() => defaultRange('month').from);
  const [to, setTo] = useState(() => defaultRange('month').to);
  const [typeFilter, setTypeFilter] = useState('all');

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Reset des dates quand la granularité change
  useEffect(() => {
    const def = defaultRange(granularity);
    setFrom(def.from);
    setTo(def.to);
  }, [granularity]);

  // Fetch quand les paramètres changent
  useEffect(() => {
    if (!from || !to) return;
    const fromIso = toIso(granularity, from, false);
    const toIsoEnd = toIso(granularity, to, true);
    if (!fromIso || !toIsoEnd) return;
    if (new Date(fromIso) > new Date(toIsoEnd)) {
      setError('La date de début doit être antérieure à la date de fin.');
      setData(null);
      return;
    }
    setLoading(true);
    setError(null);
    let cancelled = false;
    adminGetTimeseries(granularity, fromIso, toIsoEnd, typeFilter)
      .then((d) => { if (!cancelled) setData(d); })
      .catch((err) => { if (!cancelled) setError(err.message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [granularity, from, to, typeFilter]);

  const total = useMemo(
    () => data?.buckets?.reduce((s, b) => s + b.count, 0) || 0,
    [data]
  );

  return (
    <div className="card">
      <h2>Évolution des réservations</h2>

      <div className="row" style={{ flexWrap: 'wrap', gap: '0.75rem', alignItems: 'flex-end', marginTop: '0.5rem' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Granularité (axe X)
          <select value={granularity} onChange={(e) => setGranularity(e.target.value)}>
            {GRANULARITIES.map((g) => <option key={g.key} value={g.key}>{g.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Type
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}>
            {TYPE_FILTERS.map((t) => <option key={t.key} value={t.key}>{t.label}</option>)}
          </select>
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Du
          <PickerInput granularity={granularity} value={from} onChange={setFrom} />
        </label>

        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.85rem' }}>
          Au
          <PickerInput granularity={granularity} value={to} onChange={setTo} />
        </label>
      </div>

      {loading && <p style={{ marginTop: '1rem' }}>Chargement…</p>}
      {error && <div className="alert alert-error" style={{ marginTop: '1rem' }}>{error}</div>}

      {!loading && !error && data && (
        <>
          <p className="muted" style={{ margin: '1rem 0 0' }}>
            {total} réservation{total > 1 ? 's' : ''} sur la plage sélectionnée
          </p>
          <BarChart buckets={data.buckets} granularity={granularity} />
        </>
      )}
    </div>
  );
}

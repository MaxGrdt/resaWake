import { useState, useEffect, useCallback } from 'react';
import { adminGetCustomStats } from '../services/api';

/** Valide que `value` correspond au format attendu pour `type`. */
function valueMatchesType(type, value) {
  if (!value) return false;
  if (type === 'day')   return /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (type === 'week')  return /^\d{4}-W\d{2}$/.test(value);
  if (type === 'month') return /^\d{4}-\d{2}$/.test(value) && !value.includes('W');
  if (type === 'year')  return /^\d{4}$/.test(value);
  return false;
}

/**
 * Appelle /api/admin/stats/custom chaque fois que type ou value changent
 * (à condition que value corresponde au bon format).
 * Retourne { data, loading, error }.
 */
export function useCustomStats(type, value) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetch = useCallback(async () => {
    if (!valueMatchesType(type, value)) return;
    setLoading(true);
    setError(null);
    try {
      const result = await adminGetCustomStats(type, value);
      setData(result);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type, value]);

  useEffect(() => { fetch(); }, [fetch]);

  return { data, loading, error };
}

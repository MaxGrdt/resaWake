// Helper unique pour appeler l'API backend.
// Lit le token JWT depuis localStorage et l'attache automatiquement.
// Renvoie le JSON parsé, ou throw une Error contenant message + status.

const BASE = '/api';

async function request(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth) {
    const token = localStorage.getItem('token');
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data = null;
  try {
    data = await res.json();
  } catch {
    // pas de JSON dans la réponse, on ignore
  }

  if (res.status === 401 && auth) {
    // Token expiré ou invalide → déconnexion automatique
    localStorage.clear();
    window.location.href = '/login';
    return;
  }

  if (!res.ok) {
    const err = new Error((data && data.message) || `Erreur ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

// ─── Auth ────────────────────────────────────────────────────────────────────
export const login = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password }, auth: false });
export const getMe = () => request('/auth/me');
export const updateMe = (data) =>
  request('/auth/me', { method: 'PUT', body: data });

// ─── User ────────────────────────────────────────────────────────────────────
export const getSlots = (date) => request(`/slots?date=${encodeURIComponent(date)}`);
export const createReservation = (date, heure, ligne) =>
  request('/reservations', { method: 'POST', body: { date, heure, ligne } });
export const getMyReservations = () => request('/reservations/me');
export const deleteMyReservation = (id) => request(`/reservations/${id}`, { method: 'DELETE' });

// ─── Admin ───────────────────────────────────────────────────────────────────
export const getConfig = () => request('/admin/config');
export const saveConfig = (config) =>
  request('/admin/config', { method: 'PUT', body: config });

export const adminGetReservations = (date) =>
  request(`/admin/reservations${date ? `?date=${encodeURIComponent(date)}` : ''}`);
export const adminCreateReservation = (payload) =>
  request('/admin/reservations', { method: 'POST', body: payload });
export const adminDeleteReservation = (id) =>
  request(`/admin/reservations/${id}`, { method: 'DELETE' });

export const adminCreateUser = (user) =>
  request('/admin/users', { method: 'POST', body: user });
export const adminGetUsers = () => request('/admin/users');
export const adminUpdateUser = (id, updates) => request(`/admin/users/${id}`, { method: 'PUT', body: updates });
export const adminDeleteUser = (id) => request(`/admin/users/${id}`, { method: 'DELETE' });
export const adminSendCredentials = (payload) =>
  request('/admin/users/send-credentials', { method: 'POST', body: payload });

export const adminGetStats = () => request('/admin/stats');
export const adminGetCustomStats = (type, value) =>
  request(`/admin/stats/custom?type=${encodeURIComponent(type)}&value=${encodeURIComponent(value)}`);

export const adminGetTimeseries = (granularity, from, to, typeFilter = 'all') =>
  request(`/admin/stats/timeseries?granularity=${encodeURIComponent(granularity)}&from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}&typeFilter=${encodeURIComponent(typeFilter)}`);

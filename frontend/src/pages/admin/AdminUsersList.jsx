import { useState, useEffect, useCallback } from 'react';
import { adminGetUsers, adminDeleteUser, adminUpdateUser } from '../../services/api';

export default function AdminUsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editId, setEditId] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await adminGetUsers();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadUsers(); }, [loadUsers]);

  function startEdit(u) {
    setEditId(u._id);
    setEditForm({
      prenom: u.prenom || '',
      nom: u.nom || '',
      email: u.email || '',
      telephone: u.telephone || '',
      forfaitSaison: !!u.forfaitSaison,
    });
  }

  function cancelEdit() {
    setEditId(null);
    setEditForm({});
  }

  async function saveEdit(id) {
    setSaving(true);
    setError(null);
    try {
      const updated = await adminUpdateUser(id, editForm);
      setUsers((prev) => prev.map((u) => u._id === id ? updated : u));
      setEditId(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(user) {
    if (!window.confirm(`Supprimer ${user.prenom} ${user.nom} ? Cette action est irréversible.`)) return;
    try {
      await adminDeleteUser(user._id);
      setUsers((prev) => prev.filter((u) => u._id !== user._id));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '1rem', marginBottom: '0.25rem' }}>
        <h2 style={{ margin: 0 }}>Liste des adhérents</h2>
        {!loading && !error && (
          <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.9rem' }}>
            {users.length} adhérent{users.length !== 1 ? 's' : ''}
          </span>
        )}
      </div>

      {loading && <p>Chargement…</p>}
      {error && <div className="alert alert-error">{error}</div>}

      {!loading && !error && (
        users.length === 0 ? (
          <p className="muted">Aucun adhérent enregistré.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="slots-table users-table">
              <thead>
                <tr>
                  <th>Prénom</th>
                  <th>Nom</th>
                  <th>Email</th>
                  <th>Téléphone</th>
                  <th>Forfait saison</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => editId === u._id ? (
                  <tr key={u._id} style={{ background: '#eff6ff' }}>
                    <td><input value={editForm.prenom} onChange={(e) => setEditForm((f) => ({ ...f, prenom: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td><input value={editForm.nom} onChange={(e) => setEditForm((f) => ({ ...f, nom: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td><input type="email" value={editForm.email} onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td><input value={editForm.telephone} onChange={(e) => setEditForm((f) => ({ ...f, telephone: e.target.value }))} style={{ width: '100%' }} /></td>
                    <td>
                      <select value={editForm.forfaitSaison ? 'oui' : 'non'} onChange={(e) => setEditForm((f) => ({ ...f, forfaitSaison: e.target.value === 'oui' }))}>
                        <option value="oui">✅ Oui</option>
                        <option value="non">Non</option>
                      </select>
                    </td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button className="btn btn-sm btn-primary" onClick={() => saveEdit(u._id)} disabled={saving}>
                        {saving ? '…' : 'Sauvegarder'}
                      </button>
                      {' '}
                      <button className="btn btn-sm btn-ghost" onClick={cancelEdit} disabled={saving}>
                        Annuler
                      </button>
                    </td>
                  </tr>
                ) : (
                  <tr key={u._id}>
                    <td>{u.prenom}</td>
                    <td>{u.nom}</td>
                    <td>{u.email}</td>
                    <td>{u.telephone || '—'}</td>
                    <td>{u.forfaitSaison ? '✅ Oui' : 'Non'}</td>
                    <td style={{ whiteSpace: 'nowrap' }}>
                      <button
                        className="btn btn-sm"
                        onClick={() => startEdit(u)}
                      >
                        Modifier
                      </button>
                      {' '}
                      <button
                        className="btn btn-sm btn-danger"
                        onClick={() => handleDelete(u)}
                      >
                        Supprimer
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      )}
    </div>
  );
}


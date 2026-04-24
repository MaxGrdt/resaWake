import { useState } from 'react';
import * as api from '../../services/api';

const EMPTY = { email: '', password: '', nom: '', prenom: '', telephone: '' };

const CHARSET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&';

function generatePassword(length = 12) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => CHARSET[n % CHARSET.length]).join('');
}

export default function AdminUsers() {
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleGenerate() {
    const pwd = generatePassword();
    update('password', pwd);
    setCopied(false);
  }

  function handleCopy() {
    navigator.clipboard.writeText(form.password).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await api.adminCreateUser(form);
      setInfo(`Adhérent ${form.prenom} ${form.nom} créé.`);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="card form" onSubmit={handleSubmit}>
      <h2>Créer un adhérent</h2>

      <div className="grid-2">
        <label>
          Prénom
          <input value={form.prenom} onChange={(e) => update('prenom', e.target.value)} required />
        </label>
        <label>
          Nom
          <input value={form.nom} onChange={(e) => update('nom', e.target.value)} required />
        </label>
      </div>

      <label>
        Email
        <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} required />
      </label>

      <label>
        Téléphone
        <input value={form.telephone} onChange={(e) => update('telephone', e.target.value)} />
      </label>

      <label>
        Mot de passe initial
        <div className="row" style={{ gap: '0.5rem' }}>
          <input
            style={{ flex: 1 }}
            type="text"
            value={form.password}
            onChange={(e) => update('password', e.target.value)}
            minLength={6}
            required
          />
          <button type="button" className="btn btn-sm" onClick={handleGenerate}>
            Générer
          </button>
          {form.password && (
            <button type="button" className="btn btn-sm" onClick={handleCopy}>
              {copied ? '✓ Copié' : 'Copier'}
            </button>
          )}
        </div>
      </label>

      {error && <div className="alert alert-error">{error}</div>}
      {info && <div className="alert alert-success">{info}</div>}

      <button type="submit" className="btn btn-primary" disabled={submitting}>
        {submitting ? 'Création…' : "Créer l'adhérent"}
      </button>
    </form>
  );
}

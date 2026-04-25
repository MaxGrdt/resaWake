import { useState, useRef, useEffect } from 'react';
import * as api from '../../services/api';

const EMPTY = { email: '', password: '', nom: '', prenom: '', telephone: '', forfaitSaison: false };

const CHARSET = 'abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$%&';

function generatePassword(length = 12) {
  const array = new Uint32Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (n) => CHARSET[n % CHARSET.length]).join('');
}

export default function AdminUsers() {
  const [form, setForm] = useState(EMPTY);
  const [copied, setCopied] = useState(false);
  const copyTimerRef = useRef(null);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => () => clearTimeout(copyTimerRef.current), []);

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
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setCopied(false), 2000);
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setSubmitting(true);
    try {
      await api.adminCreateUser(form);
      // Envoi des identifiants par email (non bloquant si échec)
      try {
        await api.adminSendCredentials({
          email: form.email,
          prenom: form.prenom,
          nom: form.nom,
          password: form.password,
        });
        setInfo(`Adhérent ${form.prenom} ${form.nom} créé — identifiants envoyés à ${form.email}.`);
      } catch {
        setInfo(`Adhérent ${form.prenom} ${form.nom} créé (l'envoi de l'email a échoué).`);
      }
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

      <fieldset style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '0.75rem 1rem', margin: 0 }}>
        <legend style={{ padding: '0 0.5rem', fontSize: '0.9rem' }}>Forfait saison</legend>
        <div className="row" style={{ gap: '1.5rem' }}>
          <label className="row" style={{ gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="forfaitSaison"
              checked={form.forfaitSaison === true}
              onChange={() => update('forfaitSaison', true)}
            />
            Oui
          </label>
          <label className="row" style={{ gap: '0.4rem', cursor: 'pointer' }}>
            <input
              type="radio"
              name="forfaitSaison"
              checked={form.forfaitSaison === false}
              onChange={() => update('forfaitSaison', false)}
            />
            Non
          </label>
        </div>
      </fieldset>

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

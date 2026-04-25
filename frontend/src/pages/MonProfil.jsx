import { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import * as api from '../services/api';

export default function MonProfil() {
  const { auth, updateAuth } = useAuth();

  const [infos, setInfos] = useState({
    prenom: auth?.prenom || '',
    nom: auth?.nom || '',
    telephone: '',
  });

  const [pwd, setPwd] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  const [infoMsg, setInfoMsg] = useState(null);
  const [infoErr, setInfoErr] = useState(null);
  const [pwdMsg, setPwdMsg] = useState(null);
  const [pwdErr, setPwdErr] = useState(null);
  const [loadingInfos, setLoadingInfos] = useState(false);
  const [loadingPwd, setLoadingPwd] = useState(false);

  // Charge les infos à jour depuis le backend (incluant le téléphone)
  useEffect(() => {
    api.getMe().then((data) => {
      setInfos({
        prenom: data.prenom || '',
        nom: data.nom || '',
        telephone: data.telephone || '',
      });
    }).catch(() => {
      // En cas d'échec, on garde les valeurs du contexte
    });
  }, []);

  async function handleInfosSubmit(e) {
    e.preventDefault();
    setInfoMsg(null);
    setInfoErr(null);
    setLoadingInfos(true);
    try {
      const data = await api.updateMe({
        nom: infos.nom,
        prenom: infos.prenom,
        telephone: infos.telephone,
      });
      updateAuth({ nom: data.nom, prenom: data.prenom });
      setInfoMsg('Informations mises à jour.');
    } catch (err) {
      setInfoErr(err.message || 'Erreur serveur.');
    } finally {
      setLoadingInfos(false);
    }
  }

  async function handlePwdSubmit(e) {
    e.preventDefault();
    setPwdMsg(null);
    setPwdErr(null);
    if (pwd.newPassword !== pwd.confirmPassword) {
      setPwdErr('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    setLoadingPwd(true);
    try {
      await api.updateMe({
        currentPassword: pwd.currentPassword,
        newPassword: pwd.newPassword,
      });
      setPwdMsg('Mot de passe modifié.');
      setPwd({ currentPassword: '', newPassword: '', confirmPassword: '' });
    } catch (err) {
      setPwdErr(err.message || 'Erreur serveur.');
    } finally {
      setLoadingPwd(false);
    }
  }

  return (
    <div className="page-container">
      <h1>Mon profil</h1>

      {/* ─── Informations personnelles ─── */}
      <section className="card" style={{ marginBottom: '2rem' }}>
        <h2>Informations personnelles</h2>
        <form onSubmit={handleInfosSubmit} className="form">
          <label>
            Prénom
            <input
              type="text"
              value={infos.prenom}
              onChange={e => setInfos({ ...infos, prenom: e.target.value })}
              required
            />
          </label>
          <label>
            Nom
            <input
              type="text"
              value={infos.nom}
              onChange={e => setInfos({ ...infos, nom: e.target.value })}
              required
            />
          </label>
          <label>
            Téléphone
            <input
              type="tel"
              value={infos.telephone}
              onChange={e => setInfos({ ...infos, telephone: e.target.value })}
            />
          </label>
          {infoMsg && <div className="alert alert-success">{infoMsg}</div>}
          {infoErr && <div className="alert alert-error">{infoErr}</div>}
          <button type="submit" className="btn btn-primary" disabled={loadingInfos}>
            {loadingInfos ? 'Enregistrement…' : 'Enregistrer'}
          </button>
        </form>
      </section>

      {/* ─── Changer le mot de passe ─── */}
      <section className="card">
        <h2>Changer le mot de passe</h2>
        <form onSubmit={handlePwdSubmit} className="form">
          <label>
            Mot de passe actuel
            <input
              type="password"
              value={pwd.currentPassword}
              onChange={e => setPwd({ ...pwd, currentPassword: e.target.value })}
              required
            />
          </label>
          <label>
            Nouveau mot de passe
            <input
              type="password"
              value={pwd.newPassword}
              onChange={e => setPwd({ ...pwd, newPassword: e.target.value })}
              minLength={6}
              required
            />
          </label>
          <label>
            Confirmer le nouveau mot de passe
            <input
              type="password"
              value={pwd.confirmPassword}
              onChange={e => setPwd({ ...pwd, confirmPassword: e.target.value })}
              required
            />
          </label>
          {pwdMsg && <div className="alert alert-success">{pwdMsg}</div>}
          {pwdErr && <div className="alert alert-error">{pwdErr}</div>}
          <button type="submit" className="btn btn-primary" disabled={loadingPwd}>
            {loadingPwd ? 'Modification…' : 'Modifier le mot de passe'}
          </button>
        </form>
      </section>
    </div>
  );
}

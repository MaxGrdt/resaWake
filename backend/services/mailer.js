const nodemailer = require('nodemailer');

/** Échappe les caractères HTML spéciaux pour prévenir l'injection dans le corps de l'email. */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

let cachedTransporter = null;

// Construit le transporteur Nodemailer à partir des variables SMTP d'environnement.
// Retourne null si la configuration SMTP est incomplète (email désactivé silencieusement).
function buildTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT) || 587,
    secure: Number(SMTP_PORT) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
  });
}

// Retourne le transporteur mis en cache (singleton). Le construit à la première utilisation.
function getTransporter() {
  if (!cachedTransporter) cachedTransporter = buildTransporter();
  return cachedTransporter;
}

// Envoie un email avec les identifiants de connexion à un nouvel adhérent.
// Lance une erreur si le service SMTP n'est pas configuré.
exports.sendCredentialsEmail = async ({ email, prenom, nom, password }) => {
  const transporter = getTransporter();
  if (!transporter) {
    throw new Error('Service email non configuré (SMTP_HOST, SMTP_USER, SMTP_PASS manquants).');
  }
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;

  const appUrl = process.env.APP_URL || 'https://resawake.fr';

  const text = `Bonjour ${prenom} ${nom},

Votre compte ResaWake a été créé. Voici vos identifiants de connexion :

  • Email    : ${email}
  • Mot de passe : ${password}

Connectez-vous dès maintenant : ${appUrl}

⚠️ Pour des raisons de sécurité, merci de modifier votre mot de passe dès votre première connexion depuis votre espace "Mon profil".

À bientôt sur ResaWake !`;

  const html = `
    <p>Bonjour <strong>${escHtml(prenom)} ${escHtml(nom)}</strong>,</p>
    <p>Votre compte ResaWake a été créé. Voici vos identifiants de connexion :</p>
    <ul>
      <li><strong>Email :</strong> ${escHtml(email)}</li>
      <li><strong>Mot de passe :</strong> <code>${escHtml(password)}</code></li>
    </ul>
    <p>
      <a href="${escHtml(appUrl)}" style="display:inline-block;padding:10px 20px;background-color:#0ea5e9;color:#ffffff;text-decoration:none;border-radius:6px;font-weight:bold;">
        Se connecter à ResaWake
      </a>
    </p>
    <p style="color:#b91c1c;">⚠️ <strong>Pour des raisons de sécurité, merci de modifier votre mot de passe dès votre première connexion</strong> depuis votre espace « Mon profil ».</p>
    <p>À bientôt sur ResaWake !</p>
  `;

  await transporter.sendMail({
    from,
    to: email,
    subject: 'Vos identifiants ResaWake',
    text,
    html,
  });
};

// Gestionnaire d'erreurs centralisé — doit être déclaré en dernier dans app.js
module.exports = (err, req, res, next) => {
  console.error(err);

  // Erreur de validation Mongoose (ex: champ requis manquant)
  if (err.name === 'ValidationError') {
    return res.status(400).json({ message: err.message });
  }

  // Doublons MongoDB (index unique violé)
  if (err.code === 11000) {
    return res.status(409).json({ message: 'Cette entrée existe déjà.' });
  }

  // Token JWT invalide ou expiré
  if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
    return res.status(401).json({ message: 'Token invalide ou expiré.' });
  }

  // Erreur générique — ne pas exposer err.message au client
  res.status(err.status || 500).json({ message: 'Erreur interne du serveur.' });
};

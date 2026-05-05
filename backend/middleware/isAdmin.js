// Middleware de contrôle du rôle : bloque l'accès si l'utilisateur n'est pas admin.
// Doit être utilisé après le middleware auth (qui peuple req.auth).
module.exports = (req, res, next) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

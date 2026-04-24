module.exports = (req, res, next) => {
  if (req.auth.role !== 'admin') {
    return res.status(403).json({ message: 'Accès réservé aux administrateurs.' });
  }
  next();
};

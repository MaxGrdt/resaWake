const jwt = require('jsonwebtoken');

// Middleware d'authentification : vérifie le token JWT Bearer dans l'en-tête Authorization.
// Si valide, injecte req.auth = { userId, role } pour les middlewares suivants.
module.exports = (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'Token manquant.' });
    const token = authHeader.split(' ')[1];
    const decodedToken = jwt.verify(token, process.env.JWT_SECRET);
    req.auth = {
      userId: decodedToken.userId,
      role: decodedToken.role
    };
    next();
  } catch (error) {
    res.status(401).json({ message: 'Token invalide ou expiré.' });
  }
};
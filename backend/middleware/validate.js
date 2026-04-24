const { validationResult } = require('express-validator');

// Middleware générique : si des erreurs de validation existent, répond 400 avec le détail
module.exports = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }
  next();
};

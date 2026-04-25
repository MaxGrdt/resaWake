const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const userCtrl = require('../controllers/users');

router.post('/login',
  [
    body('email').isEmail().withMessage('Email invalide.'),
    body('password').notEmpty().withMessage('Le mot de passe est requis.')
  ],
  validate,
  userCtrl.login
);

router.get('/me', auth, userCtrl.getMe);

router.put('/me',
  auth,
  [
    body('nom').optional().notEmpty().withMessage('Le nom ne peut pas être vide.'),
    body('prenom').optional().notEmpty().withMessage('Le prénom ne peut pas être vide.'),
    body('newPassword').optional().isLength({ min: 6 }).withMessage('Le nouveau mot de passe doit contenir au moins 6 caractères.'),
  ],
  validate,
  userCtrl.updateMe
);

module.exports = router;
const express = require('express');
const router = express.Router();
const { body } = require('express-validator');
const auth = require('../middleware/auth');
const isAdmin = require('../middleware/isAdmin');
const validate = require('../middleware/validate');
const adminCtrl = require('../controllers/admin');
const userCtrl = require('../controllers/users');

// Toutes les routes admin nécessitent un token valide + rôle admin
router.use(auth, isAdmin);

// Création de compte adhérent (réservé à l'admin)
router.post('/users',
  [
    body('email').isEmail().withMessage('Email invalide.'),
    body('password').isLength({ min: 6 }).withMessage('Le mot de passe doit contenir au moins 6 caractères.'),
    body('nom').notEmpty().withMessage('Le nom est requis.'),
    body('prenom').notEmpty().withMessage('Le prénom est requis.')
  ],
  validate,
  userCtrl.signup
);

// Liste des adhérents
router.get('/users', adminCtrl.getUsers);

// Suppression d'un adhérent
router.delete('/users/:id', adminCtrl.deleteUser);

// Modification d'un adhérent
router.put('/users/:id',
  [
    body('email').optional().isEmail().withMessage('Email invalide.'),
    body('nom').optional().notEmpty().withMessage('Le nom ne peut pas être vide.'),
    body('prenom').optional().notEmpty().withMessage('Le prénom ne peut pas être vide.'),
  ],
  validate,
  adminCtrl.updateUser
);

// Envoi des identifiants par email
router.post('/users/send-credentials',
  [
    body('email').isEmail().withMessage('Email invalide.'),
    body('password').notEmpty().withMessage('Le mot de passe est requis.'),
    body('nom').notEmpty().withMessage('Le nom est requis.'),
    body('prenom').notEmpty().withMessage('Le prénom est requis.')
  ],
  validate,
  adminCtrl.sendCredentials
);

// Config d'ouverture
router.get('/config', adminCtrl.getConfig);
router.put('/config',
  [
    body('heureOuverture').optional().matches(/^\d{2}:\d{2}$/).withMessage('Format heureOuverture invalide (HH:MM).'),
    body('heureFermeture').optional().matches(/^\d{2}:\d{2}$/).withMessage('Format heureFermeture invalide (HH:MM).'),
    body('joursSemaine').optional().isArray().withMessage('joursSemaine doit être un tableau.'),
    body('joursSemaine.*').optional().isInt({ min: 0, max: 6 }).withMessage('Chaque jour doit être un entier entre 0 et 6.'),
    body('dureeCreneaux').optional().isInt({ min: 5 }).withMessage('La durée doit être un entier >= 5 minutes.')
  ],
  validate,
  adminCtrl.updateConfig
);

// Réservations & blocages
router.get('/reservations', adminCtrl.getAllReservations);
router.post('/reservations',
  [
    body('date').isISO8601().withMessage('Date invalide (format attendu : YYYY-MM-DD).'),
    body('heure').matches(/^\d{2}:\d{2}$/).withMessage('Heure invalide (format attendu : HH:MM).'),
    body('ligne').toInt().isInt({ min: 1, max: 2 }).withMessage('La ligne doit être 1 ou 2.'),
    body('type').optional().isIn(['reservation', 'blocage']).withMessage('Type invalide.'),
    body('clientNom').optional().isString().isLength({ max: 100 }).withMessage('Nom client invalide.')
  ],
  validate,
  adminCtrl.createReservation
);
router.put('/reservations/:id',
  [
    body('date').optional().isISO8601().withMessage('Date invalide.'),
    body('heure').optional().matches(/^\d{2}:\d{2}$/).withMessage('Heure invalide (format attendu : HH:MM).'),
    body('ligne').optional().toInt().isInt({ min: 1, max: 2 }).withMessage('La ligne doit être 1 ou 2.'),
    body('type').optional().isIn(['reservation', 'blocage']).withMessage('Type invalide.')
  ],
  validate,
  adminCtrl.updateReservation
);
router.delete('/reservations/:id', adminCtrl.deleteReservation);

// Statistiques
router.get('/stats', adminCtrl.getStats);
router.get('/stats/custom', adminCtrl.getCustomStats);
router.get('/stats/timeseries', adminCtrl.getTimeseries);

module.exports = router;

const express = require('express');
const router = express.Router();
const { body, query } = require('express-validator');
const auth = require('../middleware/auth');
const validate = require('../middleware/validate');
const resaCtrl = require('../controllers/reservations');

// Toutes les routes nécessitent un token valide
router.use(auth);

router.get('/slots',
  [query('date').isISO8601().withMessage('Paramètre date invalide (format attendu : YYYY-MM-DD).')],
  validate,
  resaCtrl.getSlots
);

router.get('/reservations/me', resaCtrl.getMyReservations);

router.post('/reservations',
  [
    body('date').isISO8601().withMessage('Date invalide (format attendu : YYYY-MM-DD).'),
    body('heure').matches(/^\d{2}:\d{2}$/).withMessage('Heure invalide (format attendu : HH:MM).'),
    body('ligne').toInt().isInt({ min: 1, max: 2 }).withMessage('La ligne doit être 1 ou 2.')
  ],
  validate,
  resaCtrl.createReservation
);

module.exports = router;

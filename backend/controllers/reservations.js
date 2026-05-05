const OpeningConfig = require('../models/openingConfig');
const Reservation = require('../models/reservation');
const logAction = require('../services/auditLog');
const { ACTIONS } = logAction;

// Génère tous les horaires d'une journée à partir de la config (ex: ["09:00","09:20",...])
function generateSlots(heureOuverture, heureFermeture, dureeMinutes) {
  const slots = [];
  const [hOuv, mOuv] = heureOuverture.split(':').map(Number);
  const [hFer, mFer] = heureFermeture.split(':').map(Number);
  let totalMinutes = hOuv * 60 + mOuv;
  const finMinutes = hFer * 60 + mFer;
  while (totalMinutes < finMinutes) {
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    slots.push(`${h}:${m}`);
    totalMinutes += dureeMinutes;
  }
  return slots;
}

// GET /api/slots?date=YYYY-MM-DD
// Retourne les créneaux disponibles/réservés/bloqués pour les deux lignes
exports.getSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Paramètre date requis (YYYY-MM-DD).' });

    const config = await OpeningConfig.findOne();
    if (!config) return res.status(404).json({ message: 'Configuration du parc introuvable.' });

    const day = new Date(date);

    // Vérifier si le jour est exceptionnellement fermé
    const isClosed = config.joursExceptionnellementFermes.some(
      d => new Date(d).toDateString() === day.toDateString()
    );
    if (isClosed) return res.status(200).json({ message: 'Le parc est fermé ce jour-là.', creneaux: [] });

    // Vérifier si le jour de la semaine est ouvert (0=Dim ... 6=Sam)
    if (!config.joursSemaine.includes(day.getDay())) {
      return res.status(200).json({ message: 'Le parc est fermé ce jour-là.', creneaux: [] });
    }

    // Générer tous les horaires théoriques
    const timeSlots = generateSlots(config.heureOuverture, config.heureFermeture, config.dureeCreneaux);

    // Charger toutes les réservations et blocages du jour
    const nextDay = new Date(day);
    nextDay.setDate(nextDay.getDate() + 1);
    const dayReservations = await Reservation.find({
      date: { $gte: day, $lt: nextDay }
    });

    // Construire la grille des créneaux pour les lignes ouvertes
    const lignes = (config.lignesOuvertes && config.lignesOuvertes.length > 0)
      ? [...config.lignesOuvertes].sort()
      : [1, 2];
    const slots = [];
    for (const heure of timeSlots) {
      for (const ligne of lignes) {
        const existing = dayReservations.find(r => r.heure === heure && r.ligne === ligne);
        slots.push({
          heure,
          ligne,
          // Les utilisateurs voient seulement le statut, pas qui a réservé
          statut: existing ? existing.type : 'disponible'
        });
      }
    }

    res.status(200).json({ date, lignes, creneaux: slots });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// POST /api/reservations
// Crée une réservation pour l'utilisateur connecté
exports.createReservation = async (req, res) => {
  try {
    const { date, heure, ligne } = req.body;

    const config = await OpeningConfig.findOne();
    if (!config) return res.status(404).json({ message: 'Configuration du parc introuvable.' });

    const day = new Date(date);

    // Refuser les dates passées
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    if (day < todayStart) {
      return res.status(400).json({ message: 'Impossible de réserver pour une date passée.' });
    }

    // Vérifier si le jour est ouvert
    const isClosed = config.joursExceptionnellementFermes.some(
      d => new Date(d).toDateString() === day.toDateString()
    );
    if (isClosed || !config.joursSemaine.includes(day.getDay())) {
      return res.status(400).json({ message: 'Le parc est fermé ce jour-là.' });
    }

    // Vérifier que l'heure est un créneau valide
    const validSlots = generateSlots(config.heureOuverture, config.heureFermeture, config.dureeCreneaux);
    if (!validSlots.includes(heure)) {
      return res.status(400).json({ message: `Créneau invalide. Horaires disponibles : ${validSlots.join(', ')}.` });
    }

    // Vérifier que la ligne est ouverte
    const openLines = (config.lignesOuvertes && config.lignesOuvertes.length > 0) ? config.lignesOuvertes : [1, 2];
    if (!openLines.includes(ligne)) {
      return res.status(400).json({ message: `La ligne ${ligne} n'est pas ouverte.` });
    }

    const reservation = new Reservation({
      userId: req.auth.userId,
      date: day,
      heure,
      ligne,
      type: 'reservation'
    });
    await reservation.save();
    logAction(req.auth.userId, 'user', ACTIONS.CREATION_RESERVATION, { date, heure, ligne });
    res.status(201).json(reservation);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ce créneau est déjà réservé.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// GET /api/reservations/me
// Retourne les réservations de l'utilisateur connecté
exports.getMyReservations = async (req, res) => {
  try {
    const reservations = await Reservation.find({
      userId: req.auth.userId,
      type: 'reservation'
    }).sort({ date: 1, heure: 1 });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// DELETE /api/reservations/:id
// L'utilisateur peut supprimer sa propre réservation jusqu'à 24h avant le début de la session.
exports.deleteMyReservation = async (req, res) => {
  try {
    const { id } = req.params;
    if (!/^[a-f\d]{24}$/i.test(id)) {
      return res.status(400).json({ message: 'Identifiant de réservation invalide.' });
    }
    const reservation = await Reservation.findOne({
      _id: id,
      userId: req.auth.userId,
      type: 'reservation',
    });
    if (!reservation) {
      return res.status(404).json({ message: 'Réservation introuvable.' });
    }

    // Construire la date/heure de début de la session
    const [hh, mm] = (reservation.heure || '00:00').split(':').map(Number);
    const start = new Date(reservation.date);
    start.setHours(hh, mm, 0, 0);

    const now = new Date();
    const diffMs = start.getTime() - now.getTime();
    const limitMs = 24 * 60 * 60 * 1000;

    if (diffMs < limitMs) {
      return res.status(403).json({
        message: 'Annulation impossible à moins de 24h. Appelez le parc pour annuler votre réservation.',
      });
    }

    await Reservation.deleteOne({ _id: id });
    logAction(req.auth.userId, 'user', ACTIONS.ANNULATION_RESERVATION, { date: reservation.date, heure: reservation.heure, ligne: reservation.ligne });
    res.status(200).json({ message: 'Réservation annulée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

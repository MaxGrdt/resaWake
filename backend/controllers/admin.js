const OpeningConfig = require('../models/openingConfig');
const Reservation = require('../models/reservation');

// ─── Configuration d'ouverture ────────────────────────────────────────────────

exports.getConfig = async (req, res) => {
  try {
    const config = await OpeningConfig.findOne();
    if (!config) return res.status(404).json({ message: 'Aucune configuration trouvée.' });
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Crée la config si elle n'existe pas, la met à jour sinon (singleton)
exports.saveConfig = async (req, res) => {
  try {
    const { joursSemaine, heureOuverture, heureFermeture, dureeCreneaux, joursExceptionnellementFermes } = req.body;
    let config = await OpeningConfig.findOne();
    if (config) {
      config.joursSemaine = joursSemaine ?? config.joursSemaine;
      config.heureOuverture = heureOuverture ?? config.heureOuverture;
      config.heureFermeture = heureFermeture ?? config.heureFermeture;
      config.dureeCreneaux = dureeCreneaux ?? config.dureeCreneaux;
      config.joursExceptionnellementFermes = joursExceptionnellementFermes ?? config.joursExceptionnellementFermes;
      await config.save();
    } else {
      config = await OpeningConfig.create({ joursSemaine, heureOuverture, heureFermeture, dureeCreneaux, joursExceptionnellementFermes });
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// ─── Gestion des réservations ─────────────────────────────────────────────────

// GET /api/admin/reservations?date=YYYY-MM-DD
// Retourne toutes les réservations, avec filtre optionnel par date
exports.getAllReservations = async (req, res) => {
  try {
    const filter = {};
    if (req.query.date) {
      const day = new Date(req.query.date);
      const nextDay = new Date(day);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: day, $lt: nextDay };
    }
    const reservations = await Reservation.find(filter)
      .populate('userId', 'nom prenom email telephone')
      .sort({ date: 1, heure: 1, ligne: 1 });
    res.status(200).json(reservations);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// POST /api/admin/reservations
// Crée une réservation (type: 'reservation') ou un blocage (type: 'blocage')
// Pour un blocage, userId n'est pas requis dans le body : on utilise le compte admin
exports.createReservation = async (req, res) => {
  try {
    const { userId, date, heure, ligne, type } = req.body;
    const isBlocage = type === 'blocage';
    if (!isBlocage && !userId) {
      return res.status(400).json({ message: 'Le champ userId est requis pour une réservation.' });
    }
    const targetUserId = isBlocage ? req.auth.userId : userId;
    const reservation = new Reservation({
      userId: targetUserId,
      date,
      heure,
      ligne,
      type: type || 'reservation'
    });
    await reservation.save();
    res.status(201).json(reservation);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ce créneau est déjà réservé ou bloqué.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /api/admin/reservations/:id
exports.updateReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable.' });
    res.status(200).json(reservation);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ce créneau est déjà réservé ou bloqué.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// DELETE /api/admin/reservations/:id
exports.deleteReservation = async (req, res) => {
  try {
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable.' });
    res.status(200).json({ message: 'Réservation supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

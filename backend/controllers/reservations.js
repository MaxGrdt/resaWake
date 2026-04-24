const OpeningConfig = require('../models/openingConfig');
const Reservation = require('../models/reservation');

// Génère tous les horaires d'une journée à partir de la config (ex: ["09:00","09:20",...])
function genererHoraires(heureOuverture, heureFermeture, dureeMinutes) {
  const horaires = [];
  const [hOuv, mOuv] = heureOuverture.split(':').map(Number);
  const [hFer, mFer] = heureFermeture.split(':').map(Number);
  let totalMinutes = hOuv * 60 + mOuv;
  const finMinutes = hFer * 60 + mFer;
  while (totalMinutes < finMinutes) {
    const h = String(Math.floor(totalMinutes / 60)).padStart(2, '0');
    const m = String(totalMinutes % 60).padStart(2, '0');
    horaires.push(`${h}:${m}`);
    totalMinutes += dureeMinutes;
  }
  return horaires;
}

// GET /api/slots?date=YYYY-MM-DD
// Retourne les créneaux disponibles/réservés/bloqués pour les deux lignes
exports.getSlots = async (req, res) => {
  try {
    const { date } = req.query;
    if (!date) return res.status(400).json({ message: 'Paramètre date requis (YYYY-MM-DD).' });

    const config = await OpeningConfig.findOne();
    if (!config) return res.status(404).json({ message: 'Configuration du parc introuvable.' });

    const jour = new Date(date);

    // Vérifier si le jour est exceptionnellement fermé
    const estFerme = config.joursExceptionnellementFermes.some(
      d => new Date(d).toDateString() === jour.toDateString()
    );
    if (estFerme) return res.status(200).json({ message: 'Le parc est fermé ce jour-là.', creneaux: [] });

    // Vérifier si le jour de la semaine est ouvert (0=Dim ... 6=Sam)
    if (!config.joursSemaine.includes(jour.getDay())) {
      return res.status(200).json({ message: 'Le parc est fermé ce jour-là.', creneaux: [] });
    }

    // Générer tous les horaires théoriques
    const horaires = genererHoraires(config.heureOuverture, config.heureFermeture, config.dureeCreneaux);

    // Charger toutes les réservations et blocages du jour
    const lendemain = new Date(jour);
    lendemain.setDate(lendemain.getDate() + 1);
    const reservationsDuJour = await Reservation.find({
      date: { $gte: jour, $lt: lendemain }
    });

    // Construire la grille des créneaux pour les 2 lignes
    const creneaux = [];
    for (const heure of horaires) {
      for (const ligne of [1, 2]) {
        const resa = reservationsDuJour.find(r => r.heure === heure && r.ligne === ligne);
        creneaux.push({
          heure,
          ligne,
          // Les utilisateurs voient seulement le statut, pas qui a réservé
          statut: resa ? resa.type : 'disponible'
        });
      }
    }

    res.status(200).json({ date, creneaux });
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

    const jour = new Date(date);

    // Vérifier si le jour est ouvert
    const estFerme = config.joursExceptionnellementFermes.some(
      d => new Date(d).toDateString() === jour.toDateString()
    );
    if (estFerme || !config.joursSemaine.includes(jour.getDay())) {
      return res.status(400).json({ message: 'Le parc est fermé ce jour-là.' });
    }

    // Vérifier que l'heure est un créneau valide
    const horairesValides = genererHoraires(config.heureOuverture, config.heureFermeture, config.dureeCreneaux);
    if (!horairesValides.includes(heure)) {
      return res.status(400).json({ message: `Créneau invalide. Horaires disponibles : ${horairesValides.join(', ')}.` });
    }

    const reservation = new Reservation({
      userId: req.auth.userId,
      date: jour,
      heure,
      ligne,
      type: 'reservation'
    });
    await reservation.save();
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

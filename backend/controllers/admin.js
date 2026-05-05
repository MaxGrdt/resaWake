const OpeningConfig = require('../models/openingConfig');
const Reservation = require('../models/reservation');
const User = require('../models/user');
const { sendCredentialsEmail } = require('../services/mailer');
const logAction = require('../services/auditLog');
const { ACTIONS } = logAction;
// ─── Gestion des adhérents ─────────────────────────────────────────────────

// GET /api/admin/users
// Retourne la liste de tous les adhérents (rôle 'user'), triés par nom puis prénom.
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find({ role: 'user' })
      .select('-password')
      .sort({ nom: 1, prenom: 1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// DELETE /api/admin/users/:id
// Supprime un adhérent (ne peut pas supprimer un compte admin).
exports.deleteUser = async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant adhérent invalide.' });
    }
    const user = await User.findOneAndDelete({ _id: req.params.id, role: 'user' });
    if (!user) return res.status(404).json({ message: 'Adhérent introuvable.' });
    logAction(req.auth.userId, 'admin', ACTIONS.SUPPRESSION_ADHERENT, { userId: user._id, nom: user.nom, prenom: user.prenom, email: user.email });
    res.status(200).json({ message: 'Adhérent supprimé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /api/admin/users/:id
// Met à jour les champs autorisés d'un adhérent (ne peut pas modifier le mot de passe ni le rôle).
exports.updateUser = async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant adhérent invalide.' });
    }
    const allowed = ['prenom', 'nom', 'email', 'telephone', 'forfaitSaison'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }
    const user = await User.findOneAndUpdate(
      { _id: req.params.id, role: 'user' },
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');
    if (!user) return res.status(404).json({ message: 'Adhérent introuvable.' });
    logAction(req.auth.userId, 'admin', ACTIONS.MODIFICATION_ADHERENT, { userId: user._id, modifications: updates });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Envoi des identifiants par email (sans créer ni modifier le user)
exports.sendCredentials = async (req, res) => {
  try {
    const { email, prenom, nom, password } = req.body;
    await sendCredentialsEmail({ email, prenom, nom, password });
    logAction(req.auth.userId, 'admin', ACTIONS.ENVOI_IDENTIFIANTS, { email, nom, prenom });
    res.status(200).json({ message: 'Email envoyé.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors de l\'envoi de l\'email.' });
  }
};

// ─── Configuration d'ouverture ────────────────────────────────────────────────

// GET /api/admin/config
// Retourne la configuration d'ouverture du parc (singleton).
exports.getConfig = async (req, res) => {
  try {
    const config = await OpeningConfig.findOne().populate('updatedBy', 'nom prenom email');
    if (!config) return res.status(404).json({ message: 'Aucune configuration trouvée.' });
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Crée la config si elle n'existe pas, la met à jour sinon (singleton)
exports.updateConfig = async (req, res) => {
  try {
    const { joursSemaine, heureOuverture, heureFermeture, dureeCreneaux, joursExceptionnellementFermes, lignesOuvertes } = req.body;

    if (lignesOuvertes !== undefined && (!Array.isArray(lignesOuvertes) || lignesOuvertes.length === 0)) {
      return res.status(400).json({ message: 'Au moins une ligne doit être ouverte.' });
    }

    let config = await OpeningConfig.findOne();
    if (config) {
      config.joursSemaine = joursSemaine ?? config.joursSemaine;
      config.heureOuverture = heureOuverture ?? config.heureOuverture;
      config.heureFermeture = heureFermeture ?? config.heureFermeture;
      config.dureeCreneaux = dureeCreneaux ?? config.dureeCreneaux;
      config.joursExceptionnellementFermes = joursExceptionnellementFermes ?? config.joursExceptionnellementFermes;
      if (lignesOuvertes !== undefined) {
        config.lignesOuvertes = lignesOuvertes;
        config.markModified('lignesOuvertes');
      }
      config.updatedBy = req.auth.userId;
      await config.save();
    } else {
      config = await OpeningConfig.create({ joursSemaine, heureOuverture, heureFermeture, dureeCreneaux, joursExceptionnellementFermes, lignesOuvertes: lignesOuvertes ?? [1, 2], updatedBy: req.auth.userId });
    }
    logAction(req.auth.userId, 'admin', ACTIONS.MODIFICATION_CONFIG, { heureOuverture, heureFermeture, joursSemaine, dureeCreneaux, lignesOuvertes });
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
      if (!/^\d{4}-\d{2}-\d{2}$/.test(req.query.date)) {
        return res.status(400).json({ message: 'Format de date invalide (YYYY-MM-DD).' });
      }
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
    const { userId, date, heure, ligne, type, clientNom } = req.body;
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
      type: type || 'reservation',
      clientNom: isBlocage ? (clientNom || '').trim() : ''
    });
    await reservation.save();
    logAction(req.auth.userId, 'admin', isBlocage ? ACTIONS.CREATION_BLOCAGE : ACTIONS.CREATION_RESERVATION_ADMIN, { date, heure, ligne, type: type || 'reservation', userId: targetUserId, clientNom: reservation.clientNom });
    res.status(201).json(reservation);
  } catch (error) {
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Ce créneau est déjà réservé ou bloqué.' });
    }
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// PUT /api/admin/reservations/:id
// Met à jour les champs d'une réservation ou d'un blocage existant.
exports.updateReservation = async (req, res) => {
  try {
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant de réservation invalide.' });
    }
    const allowed = ['date', 'heure', 'ligne', 'type', 'clientNom'];
    const updates = {};
    for (const key of allowed) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        updates[key] = req.body[key];
      }
    }
    const reservation = await Reservation.findByIdAndUpdate(
      req.params.id,
      updates,
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
    if (!/^[a-f\d]{24}$/i.test(req.params.id)) {
      return res.status(400).json({ message: 'Identifiant de réservation invalide.' });
    }
    const reservation = await Reservation.findByIdAndDelete(req.params.id);
    if (!reservation) return res.status(404).json({ message: 'Réservation introuvable.' });
    logAction(req.auth.userId, 'admin', ACTIONS.SUPPRESSION_RESERVATION, { date: reservation.date, heure: reservation.heure, ligne: reservation.ligne, type: reservation.type, userId: reservation.userId });
    res.status(200).json({ message: 'Réservation supprimée.' });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// Statistiques ────────────────────────────────────────────────────────────

// GET /api/admin/stats
// Retourne les compteurs de réservations (type='reservation') par période :
// totaux et répartition par utilisateur, pour : année, mois, semaine, jour.
exports.getStats = async (req, res) => {
  try {
    const now = new Date();

    // Début de la journée (locale serveur)
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfNextDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    // Début de la semaine ISO (lundi 00:00) et lundi suivant
    const startOfWeek = new Date(startOfDay);
    const dow = (startOfDay.getDay() + 6) % 7; // 0 = lundi
    startOfWeek.setDate(startOfDay.getDate() - dow);
    const startOfNextWeek = new Date(startOfWeek);
    startOfNextWeek.setDate(startOfWeek.getDate() + 7);

    // Début du mois et du mois suivant
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfNextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);

    // Début de l'année et de l'année suivante
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const startOfNextYear = new Date(now.getFullYear() + 1, 0, 1);

    const periods = [
      { key: 'day', from: startOfDay, to: startOfNextDay },
      { key: 'week', from: startOfWeek, to: startOfNextWeek },
      { key: 'month', from: startOfMonth, to: startOfNextMonth },
      { key: 'year', from: startOfYear, to: startOfNextYear },
    ];

    const matchBase = { type: { $in: ['reservation', 'blocage'] } };

    const result = { totals: {}, perUser: {} };

    for (const p of periods) {
      const match = { ...matchBase, date: { $gte: p.from, $lt: p.to } };

      const total = await Reservation.countDocuments(match);
      result.totals[p.key] = total;

      const grouped = await Reservation.aggregate([
        { $match: match },
        { $group: { _id: { userId: '$userId', type: '$type' }, count: { $sum: 1 } } },
        { $lookup: { from: 'users', localField: '_id.userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        { $project: {
            _id: 0,
            userId: '$_id.userId',
            type: '$_id.type',
            count: 1,
            nom: '$user.nom',
            prenom: '$user.prenom',
            email: '$user.email',
          } },
        { $sort: { count: -1, nom: 1 } },
      ]);
      result.perUser[p.key] = grouped;
    }

    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// GET /api/admin/stats/custom?type=day|week|month|year&value=...
// value formats : day=YYYY-MM-DD, week=YYYY-Www, month=YYYY-MM, year=YYYY
exports.getCustomStats = async (req, res) => {
  try {
    const { type, value } = req.query;
    if (!type || !value) {
      return res.status(400).json({ message: 'Paramètres type et value requis.' });
    }

    let from, to;
    if (type === 'day') {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!m) return res.status(400).json({ message: 'Format jour invalide (YYYY-MM-DD).' });
      from = new Date(+m[1], +m[2] - 1, +m[3]);
      to = new Date(+m[1], +m[2] - 1, +m[3] + 1);
    } else if (type === 'week') {
      // Format ISO HTML : YYYY-Www
      const m = /^(\d{4})-W(\d{2})$/.exec(value);
      if (!m) return res.status(400).json({ message: 'Format semaine invalide (YYYY-Www).' });
      const year = +m[1];
      const week = +m[2];
      // Lundi de la semaine ISO N de l'année
      const jan4 = new Date(year, 0, 4);
      const jan4Dow = (jan4.getDay() + 6) % 7; // 0 = lundi
      const week1Monday = new Date(year, 0, 4 - jan4Dow);
      from = new Date(week1Monday);
      from.setDate(week1Monday.getDate() + (week - 1) * 7);
      to = new Date(from);
      to.setDate(from.getDate() + 7);
    } else if (type === 'month') {
      const m = /^(\d{4})-(\d{2})$/.exec(value);
      if (!m) return res.status(400).json({ message: 'Format mois invalide (YYYY-MM).' });
      from = new Date(+m[1], +m[2] - 1, 1);
      to = new Date(+m[1], +m[2], 1);
    } else if (type === 'year') {
      const y = parseInt(value, 10);
      if (!y) return res.status(400).json({ message: 'Année invalide.' });
      from = new Date(y, 0, 1);
      to = new Date(y + 1, 0, 1);
    } else {
      return res.status(400).json({ message: 'Type invalide (day|week|month|year).' });
    }

    const match = { type: { $in: ['reservation', 'blocage'] }, date: { $gte: from, $lt: to } };

    const total = await Reservation.countDocuments(match);
    const perUser = await Reservation.aggregate([
      { $match: match },
      { $group: { _id: { userId: '$userId', type: '$type' }, count: { $sum: 1 } } },
      { $lookup: { from: 'users', localField: '_id.userId', foreignField: '_id', as: 'user' } },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      { $project: {
          _id: 0,
          userId: '$_id.userId',
          type: '$_id.type',
          count: 1,
          nom: '$user.nom',
          prenom: '$user.prenom',
          email: '$user.email',
        } },
      { $sort: { count: -1, nom: 1 } },
    ]);

    res.status(200).json({ from, to, total, perUser });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

// GET /api/admin/stats/timeseries?granularity=day|week|month|year&from=YYYY-MM-DD&to=YYYY-MM-DD
// Retourne les compteurs de réservations bucketisés pour la granularité choisie.
exports.getTimeseries = async (req, res) => {
  try {
    const { granularity, from, to, typeFilter } = req.query;
    const validGranularities = ['day', 'week', 'month', 'year'];
    if (!validGranularities.includes(granularity)) {
      return res.status(400).json({ message: 'Granularité invalide.' });
    }
    if (!from || !to) {
      return res.status(400).json({ message: 'Paramètres from et to requis (YYYY-MM-DD).' });
    }
    const fromDate = new Date(from);
    const toDate = new Date(to);
    if (isNaN(fromDate) || isNaN(toDate)) {
      return res.status(400).json({ message: 'Dates invalides.' });
    }
    if (fromDate > toDate) {
      return res.status(400).json({ message: 'La date de début doit être antérieure à la date de fin.' });
    }

    const toDateExclusive = new Date(toDate.getTime() + 24 * 60 * 60 * 1000);

    // Construit la pipeline de match selon le filtre demandé.
    // Filtres possibles :
    //   'all'                  → réservations + blocages
    //   'reservation'          → toutes les réservations adhérents (forfait ou non)
    //   'reservation_forfait'  → réservations adhérents avec forfaitSaison: true
    //   'reservation_no_forfait' → réservations adhérents avec forfaitSaison: false
    //   'blocage'              → blocages uniquement
    const needsUserLookup = typeFilter === 'reservation_forfait' || typeFilter === 'reservation_no_forfait';

    const typeMatch = typeFilter === 'reservation' || typeFilter === 'reservation_forfait' || typeFilter === 'reservation_no_forfait'
      ? 'reservation'
      : typeFilter === 'blocage'
        ? 'blocage'
        : { $in: ['reservation', 'blocage'] };

    const pipeline = [
      { $match: { type: typeMatch, date: { $gte: fromDate, $lt: toDateExclusive } } },
    ];

    if (needsUserLookup) {
      pipeline.push(
        { $lookup: { from: 'users', localField: 'userId', foreignField: '_id', as: 'user' } },
        { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
        {
          $match: {
            'user.forfaitSaison': typeFilter === 'reservation_forfait' ? true : { $ne: true },
          },
        },
      );
    }

    pipeline.push(
      {
        $group: {
          _id: {
            $dateTrunc: {
              date: '$date',
              unit: granularity,
              ...(granularity === 'week' ? { startOfWeek: 'monday' } : {}),
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
      { $project: { _id: 0, bucket: '$_id', count: 1 } },
    );

    const rawBuckets = await Reservation.aggregate(pipeline);

    // Build a map for fast lookup
    const countMap = {};
    for (const b of rawBuckets) {
      countMap[b.bucket.toISOString()] = b.count;
    }

    // Generate all expected bucket start dates in the range
    function generateAllBuckets(from, to, gran) {
      const result = [];
      let cursor;
      if (gran === 'day') {
        cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate()));
      } else if (gran === 'week') {
        const day = from.getUTCDay(); // 0=Sun
        const diff = day === 0 ? -6 : 1 - day;
        cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate() + diff));
      } else if (gran === 'month') {
        cursor = new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 1));
      } else {
        cursor = new Date(Date.UTC(from.getUTCFullYear(), 0, 1));
      }
      while (cursor <= to) {
        result.push(new Date(cursor));
        if (gran === 'day') {
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 1));
        } else if (gran === 'week') {
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth(), cursor.getUTCDate() + 7));
        } else if (gran === 'month') {
          cursor = new Date(Date.UTC(cursor.getUTCFullYear(), cursor.getUTCMonth() + 1, 1));
        } else {
          cursor = new Date(Date.UTC(cursor.getUTCFullYear() + 1, 0, 1));
        }
      }
      return result;
    }

    const buckets = generateAllBuckets(fromDate, toDate, granularity).map(d => ({
      bucket: d,
      count: countMap[d.toISOString()] || 0,
    }));

    res.status(200).json({ from: fromDate, to: toDate, granularity, buckets });
  } catch (error) {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

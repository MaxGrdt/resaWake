const AuditLog = require('../models/auditLog');

const ACTIONS = {
  // Auth
  CONNEXION:                  'CONNEXION',
  // Profil utilisateur
  MODIFICATION_PROFIL:        'MODIFICATION_PROFIL',
  // Réservations (user)
  CREATION_RESERVATION:       'CREATION_RESERVATION',
  ANNULATION_RESERVATION:     'ANNULATION_RESERVATION',
  // Gestion adhérents (admin)
  CREATION_ADHERENT:          'CREATION_ADHERENT',
  MODIFICATION_ADHERENT:      'MODIFICATION_ADHERENT',
  SUPPRESSION_ADHERENT:       'SUPPRESSION_ADHERENT',
  ENVOI_IDENTIFIANTS:         'ENVOI_IDENTIFIANTS',
  // Réservations & blocages (admin)
  CREATION_RESERVATION_ADMIN: 'CREATION_RESERVATION_ADMIN',
  CREATION_BLOCAGE:           'CREATION_BLOCAGE',
  SUPPRESSION_RESERVATION:    'SUPPRESSION_RESERVATION',
  // Configuration
  MODIFICATION_CONFIG:        'MODIFICATION_CONFIG',
};

/**
 * Enregistre une action dans le journal d'audit.
 * Fire-and-forget : n'interrompt jamais la requête principale.
 */
function logAction(actorId, actorRole, action, details = {}) {
  AuditLog.create({ actorId, actorRole, action, details }).catch(() => {});
}

module.exports = logAction;
module.exports.ACTIONS = ACTIONS;

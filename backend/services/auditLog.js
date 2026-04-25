const AuditLog = require('../models/auditLog');

/**
 * Enregistre une action dans le journal d'audit.
 * Fire-and-forget : n'interrompt jamais la requête principale.
 */
module.exports = function logAction(actorId, actorRole, action, details = {}) {
  AuditLog.create({ actorId, actorRole, action, details }).catch(() => {});
};

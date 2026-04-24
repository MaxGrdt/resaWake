const mongoose = require('mongoose');

const slotSchema = mongoose.Schema({
  date: { type: Date, required: true },
  heure: { type: String, required: true },
  ligne: { type: Number, enum: [1, 2], required: true },
  statut: { type: String, enum: ['disponible', 'réservé', 'bloqué'], default: 'disponible' }
});

module.exports = mongoose.model('Slot', slotSchema);

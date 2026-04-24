const mongoose = require('mongoose');

const reservationSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  date: { type: Date, required: true },
  heure: { type: String, required: true },
  ligne: { type: Number, enum: [1, 2], required: true },
  // 'reservation' = créée par un user, 'blocage' = créée par un admin pour bloquer le créneau
  type: { type: String, enum: ['reservation', 'blocage'], default: 'reservation' }
}, { timestamps: true });

// Empêche la double réservation sur le même créneau (s'applique aussi aux blocages)
reservationSchema.index({ date: 1, heure: 1, ligne: 1 }, { unique: true });

module.exports = mongoose.model('Reservation', reservationSchema);

const mongoose = require('mongoose');

const reservationSchema = mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  slotId: { type: mongoose.Schema.Types.ObjectId, ref: 'Slot', required: true }
});

module.exports = mongoose.model('Reservation', reservationSchema);

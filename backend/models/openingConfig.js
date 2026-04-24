const mongoose = require('mongoose');

// Configuration unique des règles d'ouverture (document singleton)
const openingConfigSchema = mongoose.Schema({
  // Jours d'ouverture : 0=Dimanche, 1=Lundi, ..., 6=Samedi
  joursSemaine: [{ type: Number, min: 0, max: 6 }],
  heureOuverture: { type: String, required: true }, // ex: "09:00"
  heureFermeture: { type: String, required: true }, // ex: "19:00"
  dureeCreneaux: { type: Number, default: 20 },      // en minutes
  joursExceptionnellementFermes: [{ type: Date }]     // ex: ["2026-07-14"]
}, { timestamps: true });

module.exports = mongoose.model('OpeningConfig', openingConfigSchema);

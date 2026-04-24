const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const reservationRoutes = require('./routes/reservations');
const errorHandler = require('./middleware/errorHandler');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((err) => console.log('Connexion à MongoDB échouée !', err.message));

const app = express();

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  next();
});

app.use(express.json());

app.use('/api/auth', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reservationRoutes);

// Gestionnaire d'erreurs centralisé (doit être en dernier)
app.use(errorHandler);

module.exports = app;
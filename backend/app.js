const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const rateLimit = require('express-rate-limit');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const userRoutes = require('./routes/users');
const adminRoutes = require('./routes/admin');
const reservationRoutes = require('./routes/reservations');
const errorHandler = require('./middleware/errorHandler');

mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('Connexion à MongoDB réussie !'))
  .catch((err) => console.log('Connexion à MongoDB échouée !', err.message));

const app = express();

// Limite les tentatives de connexion : 10 requêtes par IP toutes les 15 minutes
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Trop de tentatives de connexion. Réessayez dans 15 minutes.' },
});

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', process.env.APP_URL || 'http://localhost:5173');
  res.setHeader('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content, Accept, Content-Type, Authorization');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json());

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api', reservationRoutes);

// Gestionnaire d'erreurs centralisé (doit être en dernier)
app.use(errorHandler);

module.exports = app;
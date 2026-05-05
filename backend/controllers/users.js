const User = require('../models/user');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const logAction = require('../services/auditLog');
const { ACTIONS } = require('../services/auditLog');

exports.signup = (req, res) => {
  bcrypt.hash(req.body.password, 10)
    .then(hash => {
      const user = new User({
        email: req.body.email,
        password: hash,
        nom: req.body.nom,
        prenom: req.body.prenom,
        telephone: req.body.telephone,
        forfaitSaison: !!req.body.forfaitSaison
      });
      user.save()
        .then(() => {
          if (req.auth) logAction(req.auth.userId, 'admin', ACTIONS.CREATION_ADHERENT, { email: req.body.email, nom: req.body.nom, prenom: req.body.prenom });
          res.status(201).json({ message: 'Utilisateur créé !' });
        })
        .catch(() => res.status(400).json({ message: 'Cet email est déjà utilisé.' }));
    })
    .catch(() => res.status(500).json({ message: 'Erreur serveur.' }));
};

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.auth.userId).select('-password');
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });
    res.status(200).json({
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone || '',
      email: user.email,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.updateMe = async (req, res) => {
  try {
    const { nom, prenom, telephone, currentPassword, newPassword } = req.body;
    const user = await User.findById(req.auth.userId);
    if (!user) return res.status(404).json({ message: 'Utilisateur introuvable.' });

    if (nom !== undefined) user.nom = nom;
    if (prenom !== undefined) user.prenom = prenom;
    if (telephone !== undefined) user.telephone = telephone;

    // Changement de mot de passe optionnel
    if (newPassword) {
      const valid = await bcrypt.compare(currentPassword || '', user.password);
      if (!valid) return res.status(401).json({ message: 'Mot de passe actuel incorrect.' });
      user.password = await bcrypt.hash(newPassword, 10);
    }

    await user.save();
    logAction(user._id, 'user', ACTIONS.MODIFICATION_PROFIL, { nom: user.nom, prenom: user.prenom, telephone: user.telephone, passwordChanged: !!newPassword });
    res.status(200).json({
      message: 'Profil mis à jour.',
      nom: user.nom,
      prenom: user.prenom,
      telephone: user.telephone,
    });
  } catch {
    res.status(500).json({ message: 'Erreur serveur.' });
  }
};

exports.login = (req, res) => {
  User.findOne({ email: req.body.email })
       .then(user => {
           if (!user) {
               return res.status(401).json({ message: 'Paire login/mot de passe incorrecte'});
           }
           bcrypt.compare(req.body.password, user.password)
               .then(valid => {
                   if (!valid) {
                       return res.status(401).json({ message: 'Paire login/mot de passe incorrecte' });
                   }
                   res.status(200).json({
                       userId: user._id,
                       role: user.role,
                       nom: user.nom,
                       prenom: user.prenom,
                       token: jwt.sign(
                        { userId: user._id, role: user.role },
                        process.env.JWT_SECRET,
                        { expiresIn: '24h' }
                        )
                    });
                    logAction(user._id, user.role, ACTIONS.CONNEXION, { email: user.email });
                })
               .catch(() => res.status(500).json({ message: 'Erreur serveur.' }));
        })
       .catch(() => res.status(500).json({ message: 'Erreur serveur.' }));
};
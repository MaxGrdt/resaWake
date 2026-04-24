const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator').default;

const userSchema = mongoose.Schema({
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  telephone: { type: String },
  role: { type: String, enum: ['user', 'admin'], default: 'user' }
});

userSchema.plugin(uniqueValidator);

module.exports = mongoose.model('User', userSchema);

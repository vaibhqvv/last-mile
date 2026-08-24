const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: 6,
    select: false // don't return password by default
  },
  phone: {
    type: String,
    trim: true
  },
  role: {
    type: String,
    enum: ['customer', 'agent', 'admin'],
    default: 'customer'
  },

  // -- agent-specific fields --
  isAvailable: {
    type: Boolean,
    default: true
  },
  currentLocation: {
    // simple lat/lng for now, not full GeoJSON
    lat: { type: Number, default: null },
    lng: { type: Number, default: null }
  },
  assignedZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    default: null
  }
}, {
  timestamps: true
});

// hash password before saving
userSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// compare passwords - used during login
userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

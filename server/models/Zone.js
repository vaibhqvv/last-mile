const mongoose = require('mongoose');

// A zone groups multiple areas (pincodes) together.
// This is the foundation for the rate calculation engine -
// we figure out which zone a pincode belongs to, then look up the rate.
const zoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Zone name is required'],
    unique: true,
    trim: true
  },
  // array of pincode strings that belong to this zone
  // e.g. ['110001', '110002', '110003']
  areas: [{
    type: String,
    trim: true
  }],
  description: {
    type: String,
    trim: true,
    default: ''
  }
}, {
  timestamps: true
});

// helper to check if a pincode falls in this zone
zoneSchema.methods.containsPincode = function(pincode) {
  return this.areas.includes(pincode.toString().trim());
};

module.exports = mongoose.model('Zone', zoneSchema);

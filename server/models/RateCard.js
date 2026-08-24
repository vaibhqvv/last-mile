const mongoose = require('mongoose');

// Rate cards define pricing between zone pairs.
// Admin sets these up — separate rates for B2B vs B2C,
// and intra-zone (same zone) vs inter-zone (different zones).
// COD surcharge is also per rate card entry.
const rateCardSchema = new mongoose.Schema({
  orderType: {
    type: String,
    enum: ['B2B', 'B2C'],
    required: [true, 'Order type (B2B/B2C) is required']
  },
  fromZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'From zone is required']
  },
  toZone: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Zone',
    required: [true, 'To zone is required']
  },
  ratePerKg: {
    type: Number,
    required: [true, 'Rate per kg is required'],
    min: 0
  },
  codSurcharge: {
    type: Number,
    default: 0,
    min: 0
  }
}, {
  timestamps: true
});

// make sure we don't accidentally create duplicate rate cards
// for the same route + order type combo
rateCardSchema.index({ orderType: 1, fromZone: 1, toZone: 1 }, { unique: true });

module.exports = mongoose.model('RateCard', rateCardSchema);

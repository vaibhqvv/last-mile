const mongoose = require('mongoose');

// All possible statuses an order can go through
const ORDER_STATUSES = [
  'Pending',
  'Confirmed',
  'Agent Assigned',
  'Picked Up',
  'In Transit',
  'Out for Delivery',
  'Delivered',
  'Failed',
  'Rescheduled'
];

const trackingEntrySchema = new mongoose.Schema({
  status: {
    type: String,
    enum: ORDER_STATUSES,
    required: true
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  note: {
    type: String,
    default: ''
  }
}, { _id: false });

const orderSchema = new mongoose.Schema({
  // who placed the order
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },

  // addresses
  pickupAddress: { type: String, required: true, trim: true },
  pickupPincode: { type: String, required: true, trim: true },
  dropAddress: { type: String, required: true, trim: true },
  dropPincode: { type: String, required: true, trim: true },

  // resolved zones (set during order creation)
  pickupZone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },
  dropZone: { type: mongoose.Schema.Types.ObjectId, ref: 'Zone' },

  // package details
  packageDimensions: {
    length: { type: Number, required: true, min: 0 },
    breadth: { type: Number, required: true, min: 0 },
    height: { type: Number, required: true, min: 0 }
  },
  actualWeight: {
    type: Number,
    required: true,
    min: 0
  },

  // calculated weights
  volumetricWeight: { type: Number }, // L*B*H / 5000
  billedWeight: { type: Number },     // max of actual vs volumetric

  // order config
  orderType: {
    type: String,
    enum: ['B2B', 'B2C'],
    required: true
  },
  paymentType: {
    type: String,
    enum: ['Prepaid', 'COD'],
    required: true
  },

  // charges (all calculated by the rate engine)
  baseCharge: { type: Number, default: 0 },
  codSurcharge: { type: Number, default: 0 },
  totalCharge: { type: Number, default: 0 },

  // current status
  status: {
    type: String,
    enum: ORDER_STATUSES,
    default: 'Pending'
  },

  // assigned delivery agent
  assignedAgent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },

  // immutable tracking history - we only push to this, never edit
  trackingHistory: [trackingEntrySchema],

  // failed delivery handling
  failureReason: { type: String, default: '' },
  rescheduledDate: { type: Date, default: null }
}, {
  timestamps: true
});

// generate a readable order number for display
orderSchema.pre('save', function(next) {
  if (this.isNew) {
    // push the initial "Pending" entry to tracking
    this.trackingHistory.push({
      status: 'Pending',
      updatedBy: this.customer,
      note: 'Order created'
    });
  }
  next();
});

module.exports = mongoose.model('Order', orderSchema);
module.exports.ORDER_STATUSES = ORDER_STATUSES;

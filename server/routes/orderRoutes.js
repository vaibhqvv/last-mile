const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  calculateOrderCharge, createOrder, getOrders, getOrder,
  assignAgent, autoAssignAgent, updateStatus,
  rescheduleOrder, overrideStatus
} = require('../controllers/orderController');

// charge preview and order creation
router.post('/calculate', protect, calculateOrderCharge);
router.post('/', protect, authorize('customer', 'admin'), createOrder);

// list and detail
router.get('/', protect, getOrders);
router.get('/:id', protect, getOrder);

// assignment
router.put('/:id/assign', protect, authorize('admin'), assignAgent);
router.put('/:id/auto-assign', protect, authorize('admin'), autoAssignAgent);

// status updates
router.put('/:id/status', protect, authorize('agent', 'admin'), updateStatus);

// reschedule (customer only)
router.put('/:id/reschedule', protect, authorize('customer'), rescheduleOrder);

// admin override
router.put('/:id/override', protect, authorize('admin'), overrideStatus);

module.exports = router;

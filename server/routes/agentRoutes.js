const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getAgents, toggleAvailability, updateLocation, assignZone
} = require('../controllers/agentController');

router.get('/', protect, authorize('admin'), getAgents);
router.put('/:id/availability', protect, authorize('agent', 'admin'), toggleAvailability);
router.put('/:id/location', protect, authorize('agent'), updateLocation);
router.put('/:id/zone', protect, authorize('admin'), assignZone);

module.exports = router;

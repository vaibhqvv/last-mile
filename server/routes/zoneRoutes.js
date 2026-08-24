const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createZone, getZones, getZone, updateZone, deleteZone
} = require('../controllers/zoneController');

router.route('/')
  .get(protect, getZones)
  .post(protect, authorize('admin'), createZone);

router.route('/:id')
  .get(protect, getZone)
  .put(protect, authorize('admin'), updateZone)
  .delete(protect, authorize('admin'), deleteZone);

module.exports = router;

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  createRateCard, getRateCards, updateRateCard, deleteRateCard
} = require('../controllers/rateCardController');

router.route('/')
  .get(protect, getRateCards)
  .post(protect, authorize('admin'), createRateCard);

router.route('/:id')
  .put(protect, authorize('admin'), updateRateCard)
  .delete(protect, authorize('admin'), deleteRateCard);

module.exports = router;

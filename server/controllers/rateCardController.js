const RateCard = require('../models/RateCard');

// POST /api/rate-cards - create a new rate card
exports.createRateCard = async (req, res, next) => {
  try {
    const { orderType, fromZone, toZone, ratePerKg, codSurcharge } = req.body;

    const rateCard = await RateCard.create({
      orderType, fromZone, toZone, ratePerKg, codSurcharge
    });

    // populate zone names for the response
    await rateCard.populate('fromZone', 'name');
    await rateCard.populate('toZone', 'name');

    res.status(201).json(rateCard);
  } catch (err) {
    next(err);
  }
};

// GET /api/rate-cards - list all rate cards
exports.getRateCards = async (req, res, next) => {
  try {
    const rateCards = await RateCard.find()
      .populate('fromZone', 'name')
      .populate('toZone', 'name')
      .sort({ orderType: 1 });

    res.json(rateCards);
  } catch (err) {
    next(err);
  }
};

// PUT /api/rate-cards/:id - update a rate card
exports.updateRateCard = async (req, res, next) => {
  try {
    const { orderType, fromZone, toZone, ratePerKg, codSurcharge } = req.body;

    const rateCard = await RateCard.findByIdAndUpdate(
      req.params.id,
      { orderType, fromZone, toZone, ratePerKg, codSurcharge },
      { new: true, runValidators: true }
    ).populate('fromZone', 'name').populate('toZone', 'name');

    if (!rateCard) {
      return res.status(404).json({ message: 'Rate card not found' });
    }

    res.json(rateCard);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/rate-cards/:id - delete a rate card
exports.deleteRateCard = async (req, res, next) => {
  try {
    const rateCard = await RateCard.findByIdAndDelete(req.params.id);
    if (!rateCard) {
      return res.status(404).json({ message: 'Rate card not found' });
    }
    res.json({ message: 'Rate card deleted' });
  } catch (err) {
    next(err);
  }
};

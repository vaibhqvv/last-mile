const Zone = require('../models/Zone');

// POST /api/zones - create a new zone
exports.createZone = async (req, res, next) => {
  try {
    const { name, areas, description } = req.body;

    const zone = await Zone.create({ name, areas: areas || [], description });
    res.status(201).json(zone);
  } catch (err) {
    next(err);
  }
};

// GET /api/zones - list all zones
exports.getZones = async (req, res, next) => {
  try {
    const zones = await Zone.find().sort({ name: 1 });
    res.json(zones);
  } catch (err) {
    next(err);
  }
};

// GET /api/zones/:id - get a single zone
exports.getZone = async (req, res, next) => {
  try {
    const zone = await Zone.findById(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    res.json(zone);
  } catch (err) {
    next(err);
  }
};

// PUT /api/zones/:id - update zone (name, areas, description)
exports.updateZone = async (req, res, next) => {
  try {
    const { name, areas, description } = req.body;

    const zone = await Zone.findByIdAndUpdate(
      req.params.id,
      { name, areas, description },
      { new: true, runValidators: true }
    );

    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }

    res.json(zone);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/zones/:id - delete a zone
exports.deleteZone = async (req, res, next) => {
  try {
    const zone = await Zone.findByIdAndDelete(req.params.id);
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    res.json({ message: 'Zone deleted' });
  } catch (err) {
    next(err);
  }
};

const User = require('../models/User');
const Order = require('../models/Order');

// GET /api/agents - list all delivery agents (admin only)
exports.getAgents = async (req, res, next) => {
  try {
    const agents = await User.find({ role: 'agent' })
      .populate('assignedZone', 'name')
      .select('-password')
      .sort({ name: 1 });

    // add active order count for each agent
    const agentsWithStats = await Promise.all(
      agents.map(async (agent) => {
        const activeOrders = await Order.countDocuments({
          assignedAgent: agent._id,
          status: { $nin: ['Delivered', 'Failed'] }
        });
        const totalDelivered = await Order.countDocuments({
          assignedAgent: agent._id,
          status: 'Delivered'
        });
        return {
          ...agent.toObject(),
          activeOrders,
          totalDelivered
        };
      })
    );

    res.json(agentsWithStats);
  } catch (err) {
    next(err);
  }
};

// PUT /api/agents/:id/availability - toggle agent availability
exports.toggleAvailability = async (req, res, next) => {
  try {
    const agent = await User.findById(req.params.id);

    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ message: 'Agent not found' });
    }

    // agents can only toggle their own availability, admins can toggle anyone
    if (req.user.role === 'agent' && req.user._id.toString() !== agent._id.toString()) {
      return res.status(403).json({ message: 'You can only update your own availability' });
    }

    agent.isAvailable = !agent.isAvailable;
    await agent.save();

    res.json({
      id: agent._id,
      name: agent.name,
      isAvailable: agent.isAvailable
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/agents/:id/location - update agent's current location
exports.updateLocation = async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const agent = await User.findById(req.params.id);

    if (!agent || agent.role !== 'agent') {
      return res.status(404).json({ message: 'Agent not found' });
    }

    agent.currentLocation = { lat, lng };
    await agent.save();

    res.json({
      id: agent._id,
      name: agent.name,
      currentLocation: agent.currentLocation
    });
  } catch (err) {
    next(err);
  }
};

// PUT /api/agents/:id/zone - assign agent to a zone (admin)
exports.assignZone = async (req, res, next) => {
  try {
    const { zoneId } = req.body;
    const agent = await User.findByIdAndUpdate(
      req.params.id,
      { assignedZone: zoneId },
      { new: true }
    ).populate('assignedZone', 'name');

    if (!agent) {
      return res.status(404).json({ message: 'Agent not found' });
    }

    res.json(agent);
  } catch (err) {
    next(err);
  }
};

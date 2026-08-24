const Order = require('../models/Order');
const User = require('../models/User');
const { calculateCharge } = require('../services/rateEngine');
const { autoAssign, manualAssign } = require('../services/assignmentService');
const { sendStatusEmail } = require('../services/notificationService');

// POST /api/orders/calculate - preview charges before confirming
exports.calculateOrderCharge = async (req, res, next) => {
  try {
    const { pickupPincode, dropPincode, length, breadth, height, actualWeight, orderType, paymentType } = req.body;

    const result = await calculateCharge({
      pickupPincode, dropPincode,
      length: Number(length),
      breadth: Number(breadth),
      height: Number(height),
      actualWeight: Number(actualWeight),
      orderType, paymentType
    });

    res.json({
      pickupZone: result.pickupZone.name,
      dropZone: result.dropZone.name,
      volumetricWeight: result.volumetricWeight,
      billedWeight: result.billedWeight,
      ratePerKg: result.ratePerKg,
      baseCharge: result.baseCharge,
      codSurcharge: result.codSurcharge,
      totalCharge: result.totalCharge
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/orders - create a new order
exports.createOrder = async (req, res, next) => {
  try {
    const {
      pickupAddress, pickupPincode, dropAddress, dropPincode,
      length, breadth, height, actualWeight,
      orderType, paymentType, customerId
    } = req.body;

    // if admin is creating on behalf of a customer
    const orderCustomer = (req.user.role === 'admin' && customerId)
      ? customerId
      : req.user._id;

    // run the rate engine
    const charge = await calculateCharge({
      pickupPincode, dropPincode,
      length: Number(length),
      breadth: Number(breadth),
      height: Number(height),
      actualWeight: Number(actualWeight),
      orderType, paymentType
    });

    const order = await Order.create({
      customer: orderCustomer,
      pickupAddress, pickupPincode,
      dropAddress, dropPincode,
      pickupZone: charge.pickupZone._id,
      dropZone: charge.dropZone._id,
      packageDimensions: {
        length: Number(length),
        breadth: Number(breadth),
        height: Number(height)
      },
      actualWeight: Number(actualWeight),
      volumetricWeight: charge.volumetricWeight,
      billedWeight: charge.billedWeight,
      orderType, paymentType,
      baseCharge: charge.baseCharge,
      codSurcharge: charge.codSurcharge,
      totalCharge: charge.totalCharge,
      status: 'Confirmed'
    });

    // add confirmed status to tracking
    order.trackingHistory.push({
      status: 'Confirmed',
      updatedBy: req.user._id,
      note: 'Order confirmed with charge calculation'
    });
    await order.save();

    // notify the customer
    const customer = await User.findById(orderCustomer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, 'Confirmed');
    }

    // populate refs before sending response
    await order.populate('customer', 'name email phone');
    await order.populate('pickupZone', 'name');
    await order.populate('dropZone', 'name');

    res.status(201).json(order);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders - list orders (filtered by role)
exports.getOrders = async (req, res, next) => {
  try {
    let filter = {};

    // customers only see their own orders
    if (req.user.role === 'customer') {
      filter.customer = req.user._id;
    }

    // agents only see orders assigned to them
    if (req.user.role === 'agent') {
      filter.assignedAgent = req.user._id;
    }

    // admin can filter by status, zone, agent
    if (req.query.status) filter.status = req.query.status;
    if (req.query.zone) {
      filter.$or = [
        { pickupZone: req.query.zone },
        { dropZone: req.query.zone }
      ];
    }
    if (req.query.agent) filter.assignedAgent = req.query.agent;

    const orders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('assignedAgent', 'name email phone')
      .populate('pickupZone', 'name')
      .populate('dropZone', 'name')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id - get order detail with full tracking
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'name email phone')
      .populate('assignedAgent', 'name email phone')
      .populate('pickupZone', 'name')
      .populate('dropZone', 'name')
      .populate('trackingHistory.updatedBy', 'name role');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // customers can only view their own orders
    if (req.user.role === 'customer' && order.customer._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    // agents can only view orders assigned to them
    if (req.user.role === 'agent' && order.assignedAgent?._id.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/assign - admin manually assigns an agent
exports.assignAgent = async (req, res, next) => {
  try {
    const { agentId } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const agent = await manualAssign(agentId);

    order.assignedAgent = agent._id;
    order.status = 'Agent Assigned';
    order.trackingHistory.push({
      status: 'Agent Assigned',
      updatedBy: req.user._id,
      note: `Manually assigned to ${agent.name}`
    });
    await order.save();

    // notify customer
    const customer = await User.findById(order.customer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, 'Agent Assigned');
    }

    await order.populate('assignedAgent', 'name email phone');
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/auto-assign - admin triggers auto-assignment
exports.autoAssignAgent = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const agent = await autoAssign(order.pickupZone);

    if (!agent) {
      return res.status(400).json({ message: 'No available agents found. Try again later or assign manually.' });
    }

    order.assignedAgent = agent._id;
    order.status = 'Agent Assigned';
    order.trackingHistory.push({
      status: 'Agent Assigned',
      updatedBy: req.user._id,
      note: `Auto-assigned to ${agent.name} (nearest available)`
    });
    await order.save();

    // notify customer
    const customer = await User.findById(order.customer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, 'Agent Assigned');
    }

    await order.populate('assignedAgent', 'name email phone');
    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/status - agent updates delivery status
exports.updateStatus = async (req, res, next) => {
  try {
    const { status, note, failureReason } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // agents can only update orders assigned to them
    if (req.user.role === 'agent' && order.assignedAgent.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'This order is not assigned to you' });
    }

    const validAgentStatuses = ['Picked Up', 'In Transit', 'Out for Delivery', 'Delivered', 'Failed'];
    if (!validAgentStatuses.includes(status)) {
      return res.status(400).json({ message: `Invalid status. Agents can set: ${validAgentStatuses.join(', ')}` });
    }

    order.status = status;
    order.trackingHistory.push({
      status,
      updatedBy: req.user._id,
      note: note || ''
    });

    // handle failed delivery
    if (status === 'Failed') {
      order.failureReason = failureReason || 'Delivery attempt failed';
    }

    await order.save();

    // notify customer
    const customer = await User.findById(order.customer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, status);
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/reschedule - customer reschedules a failed delivery
exports.rescheduleOrder = async (req, res, next) => {
  try {
    const { rescheduledDate } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.status !== 'Failed') {
      return res.status(400).json({ message: 'Only failed deliveries can be rescheduled' });
    }

    // only the customer who placed the order can reschedule
    if (order.customer.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Not authorized to reschedule this order' });
    }

    order.rescheduledDate = new Date(rescheduledDate);
    order.status = 'Rescheduled';
    order.failureReason = '';
    order.trackingHistory.push({
      status: 'Rescheduled',
      updatedBy: req.user._id,
      note: `Rescheduled for ${new Date(rescheduledDate).toLocaleDateString()}`
    });

    // try to auto-assign a new agent for the rescheduled attempt
    const newAgent = await autoAssign(order.pickupZone);
    if (newAgent) {
      order.assignedAgent = newAgent._id;
      order.trackingHistory.push({
        status: 'Agent Assigned',
        updatedBy: req.user._id,
        note: `Re-assigned to ${newAgent.name} for rescheduled delivery`
      });
    }

    await order.save();

    // notify customer
    const customer = await User.findById(order.customer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, 'Rescheduled');
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

// PUT /api/orders/:id/override - admin overrides order status
exports.overrideStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    order.status = status;
    order.trackingHistory.push({
      status,
      updatedBy: req.user._id,
      note: note || 'Status overridden by admin'
    });
    await order.save();

    // notify customer
    const customer = await User.findById(order.customer);
    if (customer) {
      sendStatusEmail(customer.email, customer.name, order._id, status);
    }

    res.json(order);
  } catch (err) {
    next(err);
  }
};

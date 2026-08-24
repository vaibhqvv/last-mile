const User = require('../models/User');
const Order = require('../models/Order');

/**
 * Agent Assignment Service
 * 
 * Handles both manual and auto assignment of delivery agents to orders.
 * Auto-assignment tries to find the best available agent based on:
 * 1. Agents assigned to the pickup zone (preferred)
 * 2. Among those, pick the one with fewest active orders
 * 3. If no zone-matched agents, fall back to any available agent
 */

// find the best agent to assign automatically
async function autoAssign(pickupZoneId) {
  // first, try agents in the same zone as pickup
  let candidates = await User.find({
    role: 'agent',
    isAvailable: true,
    assignedZone: pickupZoneId
  });

  // if nobody in that zone, widen the search
  if (candidates.length === 0) {
    candidates = await User.find({
      role: 'agent',
      isAvailable: true
    });
  }

  if (candidates.length === 0) {
    return null; // no agents available at all
  }

  // count active orders for each candidate
  // (active = not delivered and not failed)
  const agentWorkloads = await Promise.all(
    candidates.map(async (agent) => {
      const activeOrders = await Order.countDocuments({
        assignedAgent: agent._id,
        status: { $nin: ['Delivered', 'Failed'] }
      });
      return { agent, activeOrders };
    })
  );

  // sort by workload (fewest active orders first) and pick the top one
  agentWorkloads.sort((a, b) => a.activeOrders - b.activeOrders);

  return agentWorkloads[0].agent;
}

// manual assignment - admin picks a specific agent
async function manualAssign(agentId) {
  const agent = await User.findById(agentId);

  if (!agent || agent.role !== 'agent') {
    throw Object.assign(new Error('Agent not found'), { statusCode: 404 });
  }

  if (!agent.isAvailable) {
    throw Object.assign(new Error('This agent is currently unavailable'), { statusCode: 400 });
  }

  return agent;
}

module.exports = { autoAssign, manualAssign };

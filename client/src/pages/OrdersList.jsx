import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, zoneAPI, agentAPI } from '../services/api';
import { HiOutlineSearch, HiOutlineEye } from 'react-icons/hi';

function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending', 'Confirmed': 'badge-confirmed',
    'Agent Assigned': 'badge-assigned', 'Picked Up': 'badge-pickedup',
    'In Transit': 'badge-transit', 'Out for Delivery': 'badge-outfordelivery',
    'Delivered': 'badge-delivered', 'Failed': 'badge-failed',
    'Rescheduled': 'badge-rescheduled',
  };
  return map[status] || 'badge-pending';
}

export default function OrdersList() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ status: '', zone: '', agent: '' });
  const [zones, setZones] = useState([]);
  const [agents, setAgents] = useState([]);

  useEffect(() => {
    fetchOrders();
    if (user.role === 'admin') {
      zoneAPI.getAll().then(res => setZones(res.data)).catch(() => {});
      agentAPI.getAll().then(res => setAgents(res.data)).catch(() => {});
    }
  }, []);

  const fetchOrders = async (params = {}) => {
    setLoading(true);
    try {
      const res = await orderAPI.getAll(params);
      setOrders(res.data);
    } catch (err) {
      console.error('Failed to fetch orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters, [key]: value };
    setFilters(newFilters);
    // remove empty filters before sending
    const params = {};
    if (newFilters.status) params.status = newFilters.status;
    if (newFilters.zone) params.zone = newFilters.zone;
    if (newFilters.agent) params.agent = newFilters.agent;
    fetchOrders(params);
  };

  if (loading && orders.length === 0) {
    return <div className="loader"><div className="spinner"></div></div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>{user.role === 'agent' ? 'My Deliveries' : 'Orders'}</h1>
          <p>{orders.length} order{orders.length !== 1 ? 's' : ''} found</p>
        </div>
      </div>

      {/* Filters - only for admin */}
      {user.role === 'admin' && (
        <div className="filters">
          <select
            className="form-select"
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            <option value="">All Statuses</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Agent Assigned">Agent Assigned</option>
            <option value="Picked Up">Picked Up</option>
            <option value="In Transit">In Transit</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Failed">Failed</option>
            <option value="Rescheduled">Rescheduled</option>
          </select>

          <select
            className="form-select"
            value={filters.zone}
            onChange={(e) => handleFilterChange('zone', e.target.value)}
          >
            <option value="">All Zones</option>
            {zones.map(z => (
              <option key={z._id} value={z._id}>{z.name}</option>
            ))}
          </select>

          <select
            className="form-select"
            value={filters.agent}
            onChange={(e) => handleFilterChange('agent', e.target.value)}
          >
            <option value="">All Agents</option>
            {agents.map(a => (
              <option key={a._id} value={a._id}>{a.name}</option>
            ))}
          </select>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">📋</div>
            <h3>No orders found</h3>
            <p>
              {filters.status || filters.zone || filters.agent
                ? 'Try adjusting your filters'
                : 'No orders to display right now'}
            </p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Order ID</th>
                {user.role !== 'customer' && <th>Customer</th>}
                <th>Route</th>
                <th>Type</th>
                <th>Payment</th>
                <th>Weight</th>
                <th>Amount</th>
                <th>Status</th>
                {user.role !== 'customer' && <th>Agent</th>}
                <th>Date</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map(order => (
                <tr key={order._id}>
                  <td>
                    <span style={{ fontWeight: 500, fontSize: '0.82rem' }}>
                      #{order._id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  {user.role !== 'customer' && (
                    <td>{order.customer?.name || '—'}</td>
                  )}
                  <td style={{ fontSize: '0.82rem' }}>
                    {order.pickupZone?.name || order.pickupPincode} → {order.dropZone?.name || order.dropPincode}
                  </td>
                  <td>
                    <span className={`badge ${order.orderType === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>
                      {order.orderType}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${order.paymentType === 'Prepaid' ? 'badge-prepaid' : 'badge-cod'}`}>
                      {order.paymentType}
                    </span>
                  </td>
                  <td style={{ fontSize: '0.82rem' }}>{order.billedWeight} kg</td>
                  <td style={{ fontWeight: 500 }}>₹{order.totalCharge}</td>
                  <td>
                    <span className={`badge ${statusBadge(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  {user.role !== 'customer' && (
                    <td style={{ fontSize: '0.82rem' }}>{order.assignedAgent?.name || '—'}</td>
                  )}
                  <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {new Date(order.createdAt).toLocaleDateString()}
                  </td>
                  <td>
                    <Link to={`/orders/${order._id}`} className="btn btn-outline btn-sm">
                      <HiOutlineEye /> View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, agentAPI } from '../services/api';
import {
  HiOutlineClipboardList, HiOutlineTruck, HiOutlineCheckCircle,
  HiOutlineExclamationCircle, HiOutlineClock, HiOutlineUserGroup
} from 'react-icons/hi';

// helper to map status to badge class
function statusBadge(status) {
  const map = {
    'Pending': 'badge-pending',
    'Confirmed': 'badge-confirmed',
    'Agent Assigned': 'badge-assigned',
    'Picked Up': 'badge-pickedup',
    'In Transit': 'badge-transit',
    'Out for Delivery': 'badge-outfordelivery',
    'Delivered': 'badge-delivered',
    'Failed': 'badge-failed',
    'Rescheduled': 'badge-rescheduled',
  };
  return map[status] || 'badge-pending';
}

export default function Dashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    total: 0, inTransit: 0, delivered: 0, failed: 0
  });

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const res = await orderAPI.getAll();
      const data = res.data;
      setOrders(data);

      // calc stats
      setStats({
        total: data.length,
        inTransit: data.filter(o => ['Picked Up', 'In Transit', 'Out for Delivery'].includes(o.status)).length,
        delivered: data.filter(o => o.status === 'Delivered').length,
        failed: data.filter(o => o.status === 'Failed').length,
      });
    } catch (err) {
      console.error('Failed to load orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const recentOrders = orders.slice(0, 8);

  if (loading) {
    return <div className="loader"><div className="spinner"></div></div>;
  }

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>
            {user.role === 'admin' ? 'Admin Dashboard' :
             user.role === 'agent' ? 'My Deliveries' :
             'My Dashboard'}
          </h1>
          <p>
            {user.role === 'admin' ? 'Overview of all operations' :
             user.role === 'agent' ? 'Deliveries assigned to you' :
             `Welcome back, ${user.name}`}
          </p>
        </div>
        {(user.role === 'customer' || user.role === 'admin') && (
          <Link to="/place-order" className="btn btn-primary">
            <HiOutlineClipboardList /> New Order
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon orange"><HiOutlineClipboardList /></div>
          <div className="stat-info">
            <h3>{stats.total}</h3>
            <p>Total Orders</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon yellow"><HiOutlineTruck /></div>
          <div className="stat-info">
            <h3>{stats.inTransit}</h3>
            <p>In Transit</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon green"><HiOutlineCheckCircle /></div>
          <div className="stat-info">
            <h3>{stats.delivered}</h3>
            <p>Delivered</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon red"><HiOutlineExclamationCircle /></div>
          <div className="stat-info">
            <h3>{stats.failed}</h3>
            <p>Failed</p>
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div className="card">
        <div className="card-header">
          <h3 className="card-title">Recent Orders</h3>
          <Link to="/orders" className="btn btn-outline btn-sm">View All</Link>
        </div>

        {recentOrders.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state-icon">📦</div>
            <h3>No orders yet</h3>
            <p>
              {user.role === 'customer'
                ? 'Place your first order to get started'
                : 'No orders to show right now'}
            </p>
          </div>
        ) : (
          <div className="table-wrapper" style={{ border: 'none' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Order ID</th>
                  {user.role === 'admin' && <th>Customer</th>}
                  <th>From → To</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map(order => (
                  <tr key={order._id}>
                    <td>
                      <Link to={`/orders/${order._id}`} style={{ fontWeight: 500, fontSize: '0.82rem' }}>
                        #{order._id.slice(-8).toUpperCase()}
                      </Link>
                    </td>
                    {user.role === 'admin' && (
                      <td>{order.customer?.name || 'N/A'}</td>
                    )}
                    <td style={{ fontSize: '0.82rem' }}>
                      {order.pickupPincode} → {order.dropPincode}
                    </td>
                    <td>
                      <span className={`badge ${order.orderType === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>
                        {order.orderType}
                      </span>
                    </td>
                    <td style={{ fontWeight: 500 }}>₹{order.totalCharge}</td>
                    <td>
                      <span className={`badge ${statusBadge(order.status)}`}>
                        {order.status}
                      </span>
                    </td>
                    <td style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {new Date(order.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

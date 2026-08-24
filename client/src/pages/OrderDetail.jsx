import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI, agentAPI } from '../services/api';
import {
  HiOutlineCheck, HiOutlineExclamation, HiOutlineTruck,
  HiOutlineClock, HiOutlineArrowLeft, HiOutlineRefresh
} from 'react-icons/hi';

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

function timelineDotClass(status) {
  if (status === 'Delivered') return 'success';
  if (status === 'Failed') return 'danger';
  return 'active';
}

export default function OrderDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [agents, setAgents] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  // for agent status update
  const [newStatus, setNewStatus] = useState('');
  const [statusNote, setStatusNote] = useState('');
  const [failureReason, setFailureReason] = useState('');

  // for reschedule
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [showReschedule, setShowReschedule] = useState(false);

  // for admin assign
  const [selectedAgent, setSelectedAgent] = useState('');
  const [showAssign, setShowAssign] = useState(false);

  // for admin override
  const [overrideStatus, setOverrideStatus] = useState('');
  const [overrideNote, setOverrideNote] = useState('');
  const [showOverride, setShowOverride] = useState(false);

  useEffect(() => {
    fetchOrder();
    if (user.role === 'admin') {
      agentAPI.getAll().then(res => setAgents(res.data)).catch(() => {});
    }
  }, [id]);

  const fetchOrder = async () => {
    try {
      const res = await orderAPI.getOne(id);
      setOrder(res.data);
    } catch (err) {
      setError('Order not found');
    } finally {
      setLoading(false);
    }
  };

  // Agent: update status
  const handleStatusUpdate = async () => {
    if (!newStatus) return;
    setActionLoading(true);
    try {
      await orderAPI.updateStatus(id, {
        status: newStatus,
        note: statusNote,
        failureReason: newStatus === 'Failed' ? failureReason : undefined
      });
      fetchOrder();
      setNewStatus('');
      setStatusNote('');
      setFailureReason('');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  // Customer: reschedule failed delivery
  const handleReschedule = async () => {
    if (!rescheduleDate) return;
    setActionLoading(true);
    try {
      await orderAPI.reschedule(id, rescheduleDate);
      fetchOrder();
      setShowReschedule(false);
      setRescheduleDate('');
    } catch (err) {
      setError(err.response?.data?.message || 'Reschedule failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: manual assign
  const handleAssign = async () => {
    if (!selectedAgent) return;
    setActionLoading(true);
    try {
      await orderAPI.assign(id, selectedAgent);
      fetchOrder();
      setShowAssign(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Assignment failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: auto-assign
  const handleAutoAssign = async () => {
    setActionLoading(true);
    try {
      await orderAPI.autoAssign(id);
      fetchOrder();
    } catch (err) {
      setError(err.response?.data?.message || 'Auto-assign failed');
    } finally {
      setActionLoading(false);
    }
  };

  // Admin: override status
  const handleOverride = async () => {
    if (!overrideStatus) return;
    setActionLoading(true);
    try {
      await orderAPI.override(id, { status: overrideStatus, note: overrideNote });
      fetchOrder();
      setShowOverride(false);
      setOverrideStatus('');
      setOverrideNote('');
    } catch (err) {
      setError(err.response?.data?.message || 'Override failed');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;
  if (!order) return <div className="empty-state"><h3>Order not found</h3></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <button className="btn btn-outline btn-sm" onClick={() => navigate(-1)}>
            <HiOutlineArrowLeft />
          </button>
          <div>
            <h1>Order #{order._id.slice(-8).toUpperCase()}</h1>
            <p>Created on {new Date(order.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
        <span className={`badge ${statusBadge(order.status)}`} style={{ fontSize: '0.85rem', padding: '5px 14px' }}>
          {order.status}
        </span>
      </div>

      {error && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
          <button onClick={() => setError('')} style={{ float: 'right', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)' }}>✕</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
        {/* Left column - order details */}
        <div>
          {/* Addresses */}
          <div className="card mb-md">
            <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Delivery Route</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <p className="text-muted text-small">Pickup</p>
                <p style={{ fontSize: '0.88rem' }}>{order.pickupAddress}</p>
                <p className="text-small text-muted">{order.pickupPincode} • {order.pickupZone?.name}</p>
              </div>
              <div>
                <p className="text-muted text-small">Drop</p>
                <p style={{ fontSize: '0.88rem' }}>{order.dropAddress}</p>
                <p className="text-small text-muted">{order.dropPincode} • {order.dropZone?.name}</p>
              </div>
            </div>
          </div>

          {/* Charge breakdown */}
          <div className="card mb-md">
            <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Charge Breakdown</h3>
            <div className="charge-breakdown" style={{ background: 'var(--card)', border: 'none', padding: '0' }}>
              <div className="charge-row">
                <span className="charge-label">Package</span>
                <span className="charge-value">{order.packageDimensions.length} × {order.packageDimensions.breadth} × {order.packageDimensions.height} cm</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Actual Weight</span>
                <span className="charge-value">{order.actualWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Volumetric Weight</span>
                <span className="charge-value">{order.volumetricWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Billed Weight</span>
                <span className="charge-value" style={{ fontWeight: 600 }}>{order.billedWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Base Charge</span>
                <span className="charge-value">₹{order.baseCharge}</span>
              </div>
              {order.codSurcharge > 0 && (
                <div className="charge-row">
                  <span className="charge-label">COD Surcharge</span>
                  <span className="charge-value">₹{order.codSurcharge}</span>
                </div>
              )}
              <div className="charge-row total">
                <span className="charge-label">Total</span>
                <span className="charge-value">₹{order.totalCharge}</span>
              </div>
            </div>
          </div>

          {/* Order info */}
          <div className="card mb-md">
            <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Details</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <p className="text-muted text-small">Order Type</p>
                <span className={`badge ${order.orderType === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>{order.orderType}</span>
              </div>
              <div>
                <p className="text-muted text-small">Payment</p>
                <span className={`badge ${order.paymentType === 'Prepaid' ? 'badge-prepaid' : 'badge-cod'}`}>{order.paymentType}</span>
              </div>
              <div>
                <p className="text-muted text-small">Customer</p>
                <p style={{ fontSize: '0.88rem' }}>{order.customer?.name}</p>
              </div>
              <div>
                <p className="text-muted text-small">Assigned Agent</p>
                <p style={{ fontSize: '0.88rem' }}>{order.assignedAgent?.name || 'Not assigned'}</p>
              </div>
            </div>
            {order.rescheduledDate && (
              <div style={{ marginTop: '10px' }}>
                <p className="text-muted text-small">Rescheduled For</p>
                <p style={{ fontSize: '0.88rem' }}>{new Date(order.rescheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              </div>
            )}
          </div>

          {/* Action panels */}
          {/* Agent: update status */}
          {user.role === 'agent' && !['Delivered', 'Failed'].includes(order.status) && (
            <div className="card mb-md">
              <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Update Status</h3>
              <div className="form-group">
                <select className="form-select" value={newStatus} onChange={(e) => setNewStatus(e.target.value)}>
                  <option value="">Select status...</option>
                  <option value="Picked Up">Picked Up</option>
                  <option value="In Transit">In Transit</option>
                  <option value="Out for Delivery">Out for Delivery</option>
                  <option value="Delivered">Delivered</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              {newStatus === 'Failed' && (
                <div className="form-group">
                  <label className="form-label">Failure Reason</label>
                  <input type="text" className="form-input" placeholder="e.g. Customer not available" value={failureReason} onChange={(e) => setFailureReason(e.target.value)} />
                </div>
              )}
              <div className="form-group">
                <label className="form-label">Note (optional)</label>
                <input type="text" className="form-input" placeholder="Add a note..." value={statusNote} onChange={(e) => setStatusNote(e.target.value)} />
              </div>
              <button className="btn btn-primary" onClick={handleStatusUpdate} disabled={!newStatus || actionLoading}>
                {actionLoading ? 'Updating...' : 'Update Status'}
              </button>
            </div>
          )}

          {/* Customer: reschedule */}
          {user.role === 'customer' && order.status === 'Failed' && (
            <div className="card mb-md">
              <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Reschedule Delivery</h3>
              <p className="text-muted text-small mb-sm">Your delivery attempt failed. Pick a new date and we'll try again.</p>
              {order.failureReason && (
                <p style={{ fontSize: '0.85rem', color: 'var(--danger)', marginBottom: '12px' }}>
                  Reason: {order.failureReason}
                </p>
              )}
              <div className="form-group">
                <label className="form-label">New Delivery Date</label>
                <input type="date" className="form-input" value={rescheduleDate} onChange={(e) => setRescheduleDate(e.target.value)} min={new Date().toISOString().split('T')[0]} />
              </div>
              <button className="btn btn-primary" onClick={handleReschedule} disabled={!rescheduleDate || actionLoading}>
                {actionLoading ? 'Rescheduling...' : 'Reschedule Delivery'}
              </button>
            </div>
          )}

          {/* Admin actions */}
          {user.role === 'admin' && (
            <div className="card mb-md">
              <h3 className="card-title mb-sm" style={{ fontSize: '0.9rem' }}>Admin Actions</h3>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <button className="btn btn-primary btn-sm" onClick={() => setShowAssign(!showAssign)}>
                  Assign Agent
                </button>
                <button className="btn btn-outline btn-sm" onClick={handleAutoAssign} disabled={actionLoading}>
                  <HiOutlineRefresh /> Auto-Assign
                </button>
                <button className="btn btn-outline btn-sm" onClick={() => setShowOverride(!showOverride)}>
                  Override Status
                </button>
              </div>

              {showAssign && (
                <div style={{ marginTop: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">Select Agent</label>
                    <select className="form-select" value={selectedAgent} onChange={(e) => setSelectedAgent(e.target.value)}>
                      <option value="">Choose agent...</option>
                      {agents.filter(a => a.isAvailable).map(a => (
                        <option key={a._id} value={a._id}>{a.name} ({a.activeOrders} active)</option>
                      ))}
                    </select>
                  </div>
                  <button className="btn btn-primary btn-sm" onClick={handleAssign} disabled={!selectedAgent || actionLoading}>
                    {actionLoading ? 'Assigning...' : 'Assign'}
                  </button>
                </div>
              )}

              {showOverride && (
                <div style={{ marginTop: '14px' }}>
                  <div className="form-group">
                    <label className="form-label">New Status</label>
                    <select className="form-select" value={overrideStatus} onChange={(e) => setOverrideStatus(e.target.value)}>
                      <option value="">Select status...</option>
                      <option value="Pending">Pending</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Agent Assigned">Agent Assigned</option>
                      <option value="Picked Up">Picked Up</option>
                      <option value="In Transit">In Transit</option>
                      <option value="Out for Delivery">Out for Delivery</option>
                      <option value="Delivered">Delivered</option>
                      <option value="Failed">Failed</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Note</label>
                    <input type="text" className="form-input" placeholder="Reason for override" value={overrideNote} onChange={(e) => setOverrideNote(e.target.value)} />
                  </div>
                  <button className="btn btn-danger btn-sm" onClick={handleOverride} disabled={!overrideStatus || actionLoading}>
                    {actionLoading ? 'Overriding...' : 'Override'}
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right column - tracking timeline */}
        <div>
          <div className="card">
            <h3 className="card-title mb-md" style={{ fontSize: '0.9rem' }}>Tracking Timeline</h3>
            {order.trackingHistory && order.trackingHistory.length > 0 ? (
              <div className="timeline">
                {[...order.trackingHistory].reverse().map((entry, idx) => (
                  <div key={idx} className="timeline-item">
                    <div className={`timeline-dot ${idx === 0 ? timelineDotClass(entry.status) : ''}`}>
                      {idx === 0 ? (entry.status === 'Delivered' ? '✓' : entry.status === 'Failed' ? '!' : '•') : ''}
                    </div>
                    <div className="timeline-content">
                      <h4>{entry.status}</h4>
                      {entry.note && <p>{entry.note}</p>}
                      <p className="timeline-meta">
                        {new Date(entry.timestamp).toLocaleString('en-IN', {
                          day: 'numeric', month: 'short', year: 'numeric',
                          hour: '2-digit', minute: '2-digit'
                        })}
                        {entry.updatedBy?.name && ` • by ${entry.updatedBy.name}`}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-muted text-small">No tracking data yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

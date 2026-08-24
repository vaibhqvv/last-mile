import { useState, useEffect } from 'react';
import { agentAPI, zoneAPI } from '../../services/api';
import { HiOutlineUserGroup } from 'react-icons/hi';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agentAPI.getAll(),
      zoneAPI.getAll()
    ]).then(([agentRes, zoneRes]) => {
      setAgents(agentRes.data);
      setZones(zoneRes.data);
    }).catch(err => {
      console.error('Failed to load agents:', err);
    }).finally(() => setLoading(false));
  }, []);

  const handleToggleAvailability = async (agentId) => {
    try {
      const res = await agentAPI.toggleAvailability(agentId);
      setAgents(agents.map(a =>
        a._id === agentId ? { ...a, isAvailable: res.data.isAvailable } : a
      ));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to toggle availability');
    }
  };

  const handleAssignZone = async (agentId, zoneId) => {
    try {
      await agentAPI.assignZone(agentId, zoneId || null);
      // refresh
      const res = await agentAPI.getAll();
      setAgents(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to assign zone');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Delivery Agents</h1>
          <p>{agents.length} agent{agents.length !== 1 ? 's' : ''} registered</p>
        </div>
      </div>

      {agents.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">👤</div>
            <h3>No delivery agents</h3>
            <p>Register agent accounts to start assigning deliveries</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Zone</th>
                <th>Active Orders</th>
                <th>Total Delivered</th>
                <th>Available</th>
              </tr>
            </thead>
            <tbody>
              {agents.map(agent => (
                <tr key={agent._id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div style={{
                        width: '32px', height: '32px', borderRadius: '50%',
                        background: agent.isAvailable ? 'var(--success-light)' : 'var(--danger-light)',
                        color: agent.isAvailable ? 'var(--success)' : 'var(--danger)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 600
                      }}>
                        {agent.name?.charAt(0)?.toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 500 }}>{agent.name}</span>
                    </div>
                  </td>
                  <td style={{ fontSize: '0.85rem' }}>{agent.email}</td>
                  <td style={{ fontSize: '0.85rem' }}>{agent.phone || '—'}</td>
                  <td>
                    <select
                      className="form-select"
                      style={{ width: '140px', padding: '5px 8px', fontSize: '0.82rem' }}
                      value={agent.assignedZone?._id || ''}
                      onChange={(e) => handleAssignZone(agent._id, e.target.value)}
                    >
                      <option value="">No zone</option>
                      {zones.map(z => (
                        <option key={z._id} value={z._id}>{z.name}</option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span style={{
                      fontWeight: 500,
                      color: agent.activeOrders > 0 ? 'var(--warning)' : 'var(--text-muted)'
                    }}>
                      {agent.activeOrders}
                    </span>
                  </td>
                  <td>{agent.totalDelivered}</td>
                  <td>
                    <label className="toggle">
                      <input
                        type="checkbox"
                        checked={agent.isAvailable}
                        onChange={() => handleToggleAvailability(agent._id)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
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

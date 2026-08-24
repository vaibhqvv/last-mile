import { useState, useEffect } from 'react';
import { rateCardAPI, zoneAPI } from '../../services/api';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function RateCards() {
  const [rateCards, setRateCards] = useState([]);
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [formData, setFormData] = useState({
    orderType: 'B2C',
    fromZone: '',
    toZone: '',
    ratePerKg: '',
    codSurcharge: '0'
  });

  useEffect(() => {
    Promise.all([
      rateCardAPI.getAll(),
      zoneAPI.getAll()
    ]).then(([rcRes, zRes]) => {
      setRateCards(rcRes.data);
      setZones(zRes.data);
    }).catch(err => {
      console.error('Failed to load data:', err);
    }).finally(() => setLoading(false));
  }, []);

  const openCreate = () => {
    setEditing(null);
    setFormData({ orderType: 'B2C', fromZone: '', toZone: '', ratePerKg: '', codSurcharge: '0' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (rc) => {
    setEditing(rc);
    setFormData({
      orderType: rc.orderType,
      fromZone: rc.fromZone?._id || '',
      toZone: rc.toZone?._id || '',
      ratePerKg: rc.ratePerKg.toString(),
      codSurcharge: rc.codSurcharge.toString()
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.fromZone || !formData.toZone || !formData.ratePerKg) {
      setError('All fields are required');
      return;
    }
    setSaving(true);
    setError('');

    const data = {
      ...formData,
      ratePerKg: Number(formData.ratePerKg),
      codSurcharge: Number(formData.codSurcharge)
    };

    try {
      if (editing) {
        await rateCardAPI.update(editing._id, data);
      } else {
        await rateCardAPI.create(data);
      }
      const res = await rateCardAPI.getAll();
      setRateCards(res.data);
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save rate card');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this rate card?')) return;
    try {
      await rateCardAPI.delete(id);
      setRateCards(rateCards.filter(rc => rc._id !== id));
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Rate Cards</h1>
          <p>Configure pricing for zone-to-zone deliveries</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <HiOutlinePlus /> Add Rate Card
        </button>
      </div>

      {zones.length === 0 && (
        <div className="card mb-md" style={{ background: 'var(--warning-light)', border: '1px solid var(--warning)' }}>
          <p style={{ fontSize: '0.88rem', color: '#92400E' }}>
            ⚠️ You need to create zones first before you can set up rate cards. Go to the Zones page to get started.
          </p>
        </div>
      )}

      {rateCards.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">💰</div>
            <h3>No rate cards configured</h3>
            <p>Set up pricing between zones for B2B and B2C orders</p>
          </div>
        </div>
      ) : (
        <div className="table-wrapper">
          <table className="table">
            <thead>
              <tr>
                <th>Order Type</th>
                <th>From Zone</th>
                <th>To Zone</th>
                <th>Rate/kg</th>
                <th>COD Surcharge</th>
                <th>Route Type</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {rateCards.map(rc => (
                <tr key={rc._id}>
                  <td>
                    <span className={`badge ${rc.orderType === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>
                      {rc.orderType}
                    </span>
                  </td>
                  <td>{rc.fromZone?.name || '—'}</td>
                  <td>{rc.toZone?.name || '—'}</td>
                  <td style={{ fontWeight: 500 }}>₹{rc.ratePerKg}</td>
                  <td>₹{rc.codSurcharge}</td>
                  <td>
                    <span className="badge" style={{
                      background: rc.fromZone?._id === rc.toZone?._id ? '#DBEAFE' : '#FEF3C7',
                      color: rc.fromZone?._id === rc.toZone?._id ? '#2563EB' : '#B45309'
                    }}>
                      {rc.fromZone?._id === rc.toZone?._id ? 'Intra-Zone' : 'Inter-Zone'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '4px' }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(rc)}>
                        <HiOutlinePencil />
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => handleDelete(rc._id)} style={{ color: 'var(--danger)' }}>
                        <HiOutlineTrash />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Rate Card' : 'Add Rate Card'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>
                <HiOutlineX />
              </button>
            </div>

            {error && (
              <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '8px 12px', borderRadius: 'var(--radius-sm)', fontSize: '0.83rem', marginBottom: '14px' }}>
                {error}
              </div>
            )}

            <div className="form-group">
              <label className="form-label">Order Type</label>
              <select className="form-select" value={formData.orderType} onChange={(e) => setFormData(prev => ({ ...prev, orderType: e.target.value }))}>
                <option value="B2C">B2C</option>
                <option value="B2B">B2B</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">From Zone</label>
                <select className="form-select" value={formData.fromZone} onChange={(e) => setFormData(prev => ({ ...prev, fromZone: e.target.value }))}>
                  <option value="">Select zone</option>
                  {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">To Zone</label>
                <select className="form-select" value={formData.toZone} onChange={(e) => setFormData(prev => ({ ...prev, toZone: e.target.value }))}>
                  <option value="">Select zone</option>
                  {zones.map(z => <option key={z._id} value={z._id}>{z.name}</option>)}
                </select>
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Rate per kg (₹)</label>
                <input type="number" className="form-input" placeholder="0" value={formData.ratePerKg} onChange={(e) => setFormData(prev => ({ ...prev, ratePerKg: e.target.value }))} min="0" step="0.5" />
              </div>
              <div className="form-group">
                <label className="form-label">COD Surcharge (₹)</label>
                <input type="number" className="form-input" placeholder="0" value={formData.codSurcharge} onChange={(e) => setFormData(prev => ({ ...prev, codSurcharge: e.target.value }))} min="0" step="1" />
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

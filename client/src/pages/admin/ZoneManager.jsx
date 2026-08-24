import { useState, useEffect } from 'react';
import { zoneAPI } from '../../services/api';
import { HiOutlinePlus, HiOutlinePencil, HiOutlineTrash, HiOutlineX } from 'react-icons/hi';

export default function ZoneManager() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [formData, setFormData] = useState({ name: '', areas: '', description: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => { fetchZones(); }, []);

  const fetchZones = async () => {
    try {
      const res = await zoneAPI.getAll();
      setZones(res.data);
    } catch (err) {
      console.error('Failed to load zones:', err);
    } finally {
      setLoading(false);
    }
  };

  const openCreate = () => {
    setEditingZone(null);
    setFormData({ name: '', areas: '', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (zone) => {
    setEditingZone(zone);
    setFormData({
      name: zone.name,
      areas: zone.areas.join(', '),
      description: zone.description || ''
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      setError('Zone name is required');
      return;
    }
    setSaving(true);
    setError('');

    const data = {
      name: formData.name.trim(),
      areas: formData.areas.split(',').map(a => a.trim()).filter(Boolean),
      description: formData.description.trim()
    };

    try {
      if (editingZone) {
        await zoneAPI.update(editingZone._id, data);
      } else {
        await zoneAPI.create(data);
      }
      fetchZones();
      setShowModal(false);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save zone');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (zoneId) => {
    if (!window.confirm('Are you sure you want to delete this zone?')) return;
    try {
      await zoneAPI.delete(zoneId);
      fetchZones();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to delete zone');
    }
  };

  if (loading) return <div className="loader"><div className="spinner"></div></div>;

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Zone Management</h1>
          <p>Define delivery zones and map pincodes to them</p>
        </div>
        <button className="btn btn-primary" onClick={openCreate}>
          <HiOutlinePlus /> Create Zone
        </button>
      </div>

      {zones.length === 0 ? (
        <div className="card">
          <div className="empty-state">
            <div className="empty-state-icon">🗺️</div>
            <h3>No zones configured</h3>
            <p>Create your first zone to start setting up rate cards</p>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {zones.map(zone => (
            <div key={zone._id} className="card">
              <div className="card-header">
                <h3 className="card-title">{zone.name}</h3>
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button className="btn btn-outline btn-sm" onClick={() => openEdit(zone)} title="Edit">
                    <HiOutlinePencil />
                  </button>
                  <button className="btn btn-outline btn-sm" onClick={() => handleDelete(zone._id)} title="Delete" style={{ color: 'var(--danger)' }}>
                    <HiOutlineTrash />
                  </button>
                </div>
              </div>
              {zone.description && (
                <p className="text-muted text-small mb-sm">{zone.description}</p>
              )}
              <div>
                <p className="text-muted text-small mb-sm">Pincodes ({zone.areas.length})</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {zone.areas.length > 0 ? zone.areas.map((area, idx) => (
                    <span key={idx} style={{
                      background: 'var(--surface)', border: '1px solid var(--border)',
                      borderRadius: '4px', padding: '2px 8px', fontSize: '0.78rem', fontFamily: 'monospace'
                    }}>
                      {area}
                    </span>
                  )) : (
                    <span className="text-muted text-small">No pincodes added yet</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingZone ? 'Edit Zone' : 'Create Zone'}</h3>
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
              <label className="form-label">Zone Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. North Delhi"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Pincodes</label>
              <textarea
                className="form-textarea"
                placeholder="Enter pincodes separated by commas, e.g. 110001, 110002, 110003"
                value={formData.areas}
                onChange={(e) => setFormData(prev => ({ ...prev, areas: e.target.value }))}
                rows={3}
              />
              <p className="form-hint">Comma-separated list of pincodes belonging to this zone</p>
            </div>

            <div className="form-group">
              <label className="form-label">Description (optional)</label>
              <input
                type="text"
                className="form-input"
                placeholder="Brief description"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              />
            </div>

            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editingZone ? 'Update Zone' : 'Create Zone'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

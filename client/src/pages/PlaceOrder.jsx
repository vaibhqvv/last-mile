import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { orderAPI } from '../services/api';
import {
  HiOutlineLocationMarker, HiOutlineCube, HiOutlineCreditCard, HiOutlineCheck
} from 'react-icons/hi';

const STEPS = ['Addresses', 'Package', 'Payment', 'Confirm'];

export default function PlaceOrder() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [chargePreview, setChargePreview] = useState(null);

  const [formData, setFormData] = useState({
    pickupAddress: '',
    pickupPincode: '',
    dropAddress: '',
    dropPincode: '',
    length: '',
    breadth: '',
    height: '',
    actualWeight: '',
    orderType: 'B2C',
    paymentType: 'Prepaid',
  });

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    setError('');
  };

  const nextStep = () => {
    if (step === 2) {
      // calculate charge before going to confirm
      calculateCharge();
    } else {
      setStep(s => Math.min(s + 1, 3));
    }
  };

  const prevStep = () => setStep(s => Math.max(s - 1, 0));

  const calculateCharge = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderAPI.calculate(formData);
      setChargePreview(res.data);
      setStep(3);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not calculate charge. Check your inputs.');
    } finally {
      setLoading(false);
    }
  };

  const submitOrder = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await orderAPI.create(formData);
      navigate(`/orders/${res.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create order.');
    } finally {
      setLoading(false);
    }
  };

  const stepIcons = [
    <HiOutlineLocationMarker />,
    <HiOutlineCube />,
    <HiOutlineCreditCard />,
    <HiOutlineCheck />
  ];

  return (
    <div className="fade-in">
      <div className="page-header">
        <div>
          <h1>Place New Order</h1>
          <p>Fill in the details to create a delivery order</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="stepper">
        {STEPS.map((label, idx) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center' }}>
            <div className={`step ${idx === step ? 'active' : ''} ${idx < step ? 'completed' : ''}`}>
              <div className="step-number">
                {idx < step ? '✓' : idx + 1}
              </div>
              <span className="step-label">{label}</span>
            </div>
            {idx < STEPS.length - 1 && (
              <div className={`step-connector ${idx < step ? 'active' : ''}`} />
            )}
          </div>
        ))}
      </div>

      {error && (
        <div style={{ background: 'var(--danger-light)', color: 'var(--danger)', padding: '10px 14px', borderRadius: 'var(--radius-sm)', fontSize: '0.85rem', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      <div className="card" style={{ maxWidth: '640px' }}>

        {/* Step 1: Addresses */}
        {step === 0 && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Pickup & Drop Details</h3>
            <div className="form-group">
              <label className="form-label" htmlFor="pickupAddress">Pickup Address</label>
              <textarea
                id="pickupAddress"
                name="pickupAddress"
                className="form-textarea"
                placeholder="Full pickup address"
                value={formData.pickupAddress}
                onChange={handleChange}
                required
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="pickupPincode">Pickup Pincode</label>
              <input
                id="pickupPincode"
                name="pickupPincode"
                type="text"
                className="form-input"
                placeholder="e.g. 110001"
                value={formData.pickupPincode}
                onChange={handleChange}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dropAddress">Drop Address</label>
              <textarea
                id="dropAddress"
                name="dropAddress"
                className="form-textarea"
                placeholder="Full delivery address"
                value={formData.dropAddress}
                onChange={handleChange}
                required
                rows={2}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="dropPincode">Drop Pincode</label>
              <input
                id="dropPincode"
                name="dropPincode"
                type="text"
                className="form-input"
                placeholder="e.g. 400001"
                value={formData.dropPincode}
                onChange={handleChange}
                required
              />
            </div>
          </div>
        )}

        {/* Step 2: Package */}
        {step === 1 && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Package Details</h3>
            <p className="text-muted text-small mb-md">
              Dimensions are used to calculate volumetric weight (L × B × H ÷ 5000). 
              You'll be billed on whichever is higher — actual or volumetric weight.
            </p>
            <div className="form-row-3">
              <div className="form-group">
                <label className="form-label" htmlFor="length">Length (cm)</label>
                <input
                  id="length"
                  name="length"
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={formData.length}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="breadth">Breadth (cm)</label>
                <input
                  id="breadth"
                  name="breadth"
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={formData.breadth}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.1"
                />
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="height">Height (cm)</label>
                <input
                  id="height"
                  name="height"
                  type="number"
                  className="form-input"
                  placeholder="0"
                  value={formData.height}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.1"
                />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="actualWeight">Actual Weight (kg)</label>
              <input
                id="actualWeight"
                name="actualWeight"
                type="number"
                className="form-input"
                placeholder="0"
                value={formData.actualWeight}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
              />
            </div>
          </div>
        )}

        {/* Step 3: Payment & Order Type */}
        {step === 2 && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Order & Payment Type</h3>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label" htmlFor="orderType">Order Type</label>
                <select
                  id="orderType"
                  name="orderType"
                  className="form-select"
                  value={formData.orderType}
                  onChange={handleChange}
                >
                  <option value="B2C">B2C (Business to Consumer)</option>
                  <option value="B2B">B2B (Business to Business)</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label" htmlFor="paymentType">Payment Type</label>
                <select
                  id="paymentType"
                  name="paymentType"
                  className="form-select"
                  value={formData.paymentType}
                  onChange={handleChange}
                >
                  <option value="Prepaid">Prepaid</option>
                  <option value="COD">Cash on Delivery (COD)</option>
                </select>
              </div>
            </div>
            {formData.paymentType === 'COD' && (
              <p className="form-hint" style={{ marginTop: '8px' }}>
                ℹ️ A COD surcharge will be added to the total. The exact amount depends on the rate card.
              </p>
            )}
          </div>
        )}

        {/* Step 4: Confirmation */}
        {step === 3 && chargePreview && (
          <div>
            <h3 style={{ marginBottom: '16px' }}>Order Summary</h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
              <div>
                <p className="text-muted text-small">Pickup</p>
                <p style={{ fontSize: '0.88rem' }}>{formData.pickupAddress}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>PIN: {formData.pickupPincode} ({chargePreview.pickupZone})</p>
              </div>
              <div>
                <p className="text-muted text-small">Drop</p>
                <p style={{ fontSize: '0.88rem' }}>{formData.dropAddress}</p>
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>PIN: {formData.dropPincode} ({chargePreview.dropZone})</p>
              </div>
            </div>

            <div style={{ display: 'flex', gap: '10px', marginBottom: '18px' }}>
              <span className={`badge ${formData.orderType === 'B2B' ? 'badge-b2b' : 'badge-b2c'}`}>
                {formData.orderType}
              </span>
              <span className={`badge ${formData.paymentType === 'Prepaid' ? 'badge-prepaid' : 'badge-cod'}`}>
                {formData.paymentType}
              </span>
            </div>

            <div className="charge-breakdown">
              <div className="charge-row">
                <span className="charge-label">Actual Weight</span>
                <span className="charge-value">{formData.actualWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Volumetric Weight (L×B×H ÷ 5000)</span>
                <span className="charge-value">{chargePreview.volumetricWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Billed Weight (higher of the two)</span>
                <span className="charge-value" style={{ fontWeight: 600 }}>{chargePreview.billedWeight} kg</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Rate per kg</span>
                <span className="charge-value">₹{chargePreview.ratePerKg}</span>
              </div>
              <div className="charge-row">
                <span className="charge-label">Base Charge</span>
                <span className="charge-value">₹{chargePreview.baseCharge}</span>
              </div>
              {chargePreview.codSurcharge > 0 && (
                <div className="charge-row">
                  <span className="charge-label">COD Surcharge</span>
                  <span className="charge-value">₹{chargePreview.codSurcharge}</span>
                </div>
              )}
              <div className="charge-row total">
                <span className="charge-label">Total Charge</span>
                <span className="charge-value">₹{chargePreview.totalCharge}</span>
              </div>
            </div>
          </div>
        )}

        {/* Navigation buttons */}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '24px' }}>
          {step > 0 ? (
            <button className="btn btn-outline" onClick={prevStep} disabled={loading}>
              Back
            </button>
          ) : <div />}

          {step < 3 ? (
            <button className="btn btn-primary" onClick={nextStep} disabled={loading}>
              {loading ? 'Calculating...' : 'Continue'}
            </button>
          ) : (
            <button className="btn btn-success btn-lg" onClick={submitOrder} disabled={loading}>
              {loading ? 'Placing Order...' : '✓ Confirm & Place Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

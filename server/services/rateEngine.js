const Zone = require('../models/Zone');
const RateCard = require('../models/RateCard');

/**
 * Rate Calculation Engine
 * 
 * This is the core pricing logic. Given an order's details, it:
 * 1. Detects which zone the pickup/drop pincodes belong to
 * 2. Calculates volumetric weight (L x B x H / 5000)
 * 3. Picks the higher of actual vs volumetric weight for billing
 * 4. Looks up the correct rate card (based on order type + zones)
 * 5. Computes the total charge including COD surcharge if applicable
 */

// find which zone a pincode belongs to
async function detectZone(pincode) {
  const pin = pincode.toString().trim();
  const zone = await Zone.findOne({ areas: pin });
  return zone; // returns null if no zone has this pincode
}

// calculate volumetric weight using the industry standard formula
function calcVolumetricWeight(length, breadth, height) {
  return (length * breadth * height) / 5000;
}

// main calculation function
async function calculateCharge({ pickupPincode, dropPincode, length, breadth, height, actualWeight, orderType, paymentType }) {
  // step 1: figure out which zones we're dealing with
  const pickupZone = await detectZone(pickupPincode);
  const dropZone = await detectZone(dropPincode);

  if (!pickupZone) {
    throw Object.assign(new Error(`Pickup pincode ${pickupPincode} doesn't belong to any configured zone`), { statusCode: 400 });
  }
  if (!dropZone) {
    throw Object.assign(new Error(`Drop pincode ${dropPincode} doesn't belong to any configured zone`), { statusCode: 400 });
  }

  // step 2: volumetric weight
  const volumetricWeight = calcVolumetricWeight(length, breadth, height);

  // step 3: we bill on whichever is higher
  const billedWeight = Math.max(actualWeight, volumetricWeight);

  // step 4: find the matching rate card
  const rateCard = await RateCard.findOne({
    orderType: orderType,
    fromZone: pickupZone._id,
    toZone: dropZone._id
  });

  if (!rateCard) {
    throw Object.assign(
      new Error(`No rate card found for ${orderType} from ${pickupZone.name} to ${dropZone.name}. Ask admin to configure it.`),
      { statusCode: 400 }
    );
  }

  // step 5: calculate charges
  const baseCharge = parseFloat((billedWeight * rateCard.ratePerKg).toFixed(2));
  const codSurcharge = paymentType === 'COD' ? rateCard.codSurcharge : 0;
  const totalCharge = parseFloat((baseCharge + codSurcharge).toFixed(2));

  return {
    pickupZone,
    dropZone,
    volumetricWeight: parseFloat(volumetricWeight.toFixed(2)),
    billedWeight: parseFloat(billedWeight.toFixed(2)),
    ratePerKg: rateCard.ratePerKg,
    baseCharge,
    codSurcharge,
    totalCharge
  };
}

module.exports = { calculateCharge, detectZone, calcVolumetricWeight };

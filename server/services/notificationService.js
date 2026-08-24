const sgMail = require('@sendgrid/mail');

// set up SendGrid with the API key from env
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}

/**
 * Notification Service
 * 
 * Sends email notifications to customers when their order status changes.
 * Uses SendGrid's free tier - just needs an API key in .env
 * 
 * If SendGrid isn't configured, it'll just log to console instead of crashing.
 * This way devs can test locally without setting up email.
 */

const STATUS_MESSAGES = {
  'Confirmed': 'Your order has been confirmed! We\'re getting it ready.',
  'Agent Assigned': 'A delivery agent has been assigned to your order.',
  'Picked Up': 'Your package has been picked up and is on its way!',
  'In Transit': 'Your package is in transit.',
  'Out for Delivery': 'Your package is out for delivery - almost there!',
  'Delivered': 'Your package has been delivered. Thank you!',
  'Failed': 'Delivery attempt failed. You can reschedule from your dashboard.',
  'Rescheduled': 'Your delivery has been rescheduled. We\'ll try again on the new date.'
};

async function sendStatusEmail(customerEmail, customerName, orderId, status) {
  const statusMessage = STATUS_MESSAGES[status] || `Your order status has been updated to: ${status}`;

  const msg = {
    to: customerEmail,
    from: process.env.SENDGRID_FROM_EMAIL || 'noreply@lastmiletracker.com',
    subject: `Order Update - ${status}`,
    html: `
      <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e5e5e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #1B4332; padding: 24px; text-align: center;">
          <h1 style="color: #ffffff; margin: 0; font-size: 20px;">LastMile Delivery Tracker</h1>
        </div>
        <div style="padding: 28px;">
          <p style="color: #2D2D2D; font-size: 15px;">Hi ${customerName},</p>
          <p style="color: #2D2D2D; font-size: 15px;">${statusMessage}</p>
          <div style="background: #FAFAF7; border-radius: 6px; padding: 16px; margin: 20px 0;">
            <p style="margin: 0; color: #6B7280; font-size: 13px;">Order ID</p>
            <p style="margin: 4px 0 0; color: #2D2D2D; font-weight: 600; font-size: 14px;">${orderId}</p>
          </div>
          <div style="text-align: center; margin-top: 24px;">
            <span style="display: inline-block; background: #E8630A; color: white; padding: 10px 28px; border-radius: 6px; font-size: 14px; font-weight: 500;">
              Status: ${status}
            </span>
          </div>
        </div>
        <div style="background: #f9f9f6; padding: 16px; text-align: center; border-top: 1px solid #e5e5e0;">
          <p style="margin: 0; color: #6B7280; font-size: 12px;">You're receiving this because you placed an order with us.</p>
        </div>
      </div>
    `
  };

  // only actually send if SendGrid is configured
  if (!process.env.SENDGRID_API_KEY) {
    console.log(`[Email - dev mode] Would send to ${customerEmail}: Order ${orderId} → ${status}`);
    return;
  }

  try {
    await sgMail.send(msg);
    console.log(`Email sent to ${customerEmail} for order ${orderId} - status: ${status}`);
  } catch (err) {
    // don't crash the app if email fails - just log it
    console.error('Failed to send email:', err.response?.body || err.message);
  }
}

module.exports = { sendStatusEmail };

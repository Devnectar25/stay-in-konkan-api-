import dotenv from 'dotenv';
dotenv.config();

/**
 * Generates a responsive, visually appealing HTML email template for booking confirmations.
 */
export function generateBookingEmailHTML(booking) {
  const customerName = booking.user_name || booking.customerName || booking.guest_name || 'Valued Guest';
  const customerEmail = booking.user_email || booking.customerEmail || booking.guest_email || '';
  const customerPhone = booking.user_phone || booking.customerPhone || booking.guest_phone || 'N/A';
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  const propertyName = booking.property_name || booking.property_title || booking.propertyName || 'Konkan Heritage Stay';
  const location = booking.location || booking.property_location || 'Konkan Coast, Maharashtra';
  const checkIn = booking.check_in || booking.checkIn || 'N/A';
  const checkOut = booking.check_out || booking.checkOut || 'N/A';
  const guests = booking.guests || '2 Guests';
  const rooms = booking.rooms || 1;
  const totalAmount = Number(booking.total_amount || booking.total_price || booking.totalAmount || 0).toLocaleString('en-IN');
  const paidAmount = Number(booking.paid_amount || booking.paidAmount || booking.total_amount || 0).toLocaleString('en-IN');
  const status = (booking.status || 'Confirmed').toUpperCase();

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Booking Confirmation - Stay in Konkan</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #1b3823 0%, #2d5a37 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 26px; font-family: Georgia, serif; letter-spacing: 0.5px; }
    .header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; }
    .badge { display: inline-block; background-color: #22c55e; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1b3823; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background-color: #f8faf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1b3823; margin-bottom: 16px; border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
    .detail-row { display: table; width: 100%; margin-bottom: 10px; font-size: 14px; }
    .detail-label { display: table-cell; font-weight: 600; color: #718096; width: 40%; padding-bottom: 4px; }
    .detail-value { display: table-cell; font-weight: 600; color: #1a202c; width: 60%; padding-bottom: 4px; text-align: right; }
    .price-box { background-color: #eef7f0; border-radius: 10px; padding: 16px; margin-top: 16px; text-align: center; }
    .price-amount { font-size: 24px; font-weight: 800; color: #1b3823; }
    .footer { background-color: #f1f5f1; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1b3823; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #1b3823; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Stay in Konkan</h1>
      <p>Authentic Coastal Hospitality</p>
      <div class="badge">✓ Booking ${status}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Namaste, ${customerName}!</div>
      <div class="intro">
        Thank you for choosing <strong>Stay in Konkan</strong>. Your reservation has been successfully confirmed. Below are your complete stay details.
      </div>

      <div class="card">
        <div class="card-title">Reservation Summary</div>
        <div class="detail-row"><span class="detail-label">Booking Reference:</span><span class="detail-value" style="color:#1b3823; font-family:monospace; font-size:15px;">${bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span class="detail-value">${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${location}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in Date:</span><span class="detail-value">${checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out Date:</span><span class="detail-value">${checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Guests & Rooms:</span><span class="detail-value">${guests} (${rooms} Room)</span></div>
      </div>

      <div class="card">
        <div class="card-title">Guest Details</div>
        <div class="detail-row"><span class="detail-label">Guest Name:</span><span class="detail-value">${customerName}</span></div>
        <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value">${customerEmail}</span></div>
        <div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-value">${customerPhone}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Payment Overview</div>
        <div class="detail-row"><span class="detail-label">Total Stay Amount:</span><span class="detail-value">₹${totalAmount}</span></div>
        <div class="detail-row"><span class="detail-label">Amount Paid:</span><span class="detail-value">₹${paidAmount}</span></div>
        <div class="price-box">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#4a5568;">Total Paid</div>
          <div class="price-amount">₹${paidAmount}</div>
          <div style="font-size:12px; color:#22c55e; margin-top:4px; font-weight:700;">Status: Paid & Confirmed</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 14px; color: #4a5568;">Need to view or manage your booking online?</p>
        <a href="https://stayinkonkan.com/owner-dashboard" class="button">View Booking Details</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #1b3823;">Stay in Konkan Desk</p>
      <p style="margin: 0 0 12px 0;">Need help? Email us at <a href="mailto:devnectar27@gmail.com">devnectar27@gmail.com</a> or call +91 8806063819</p>
      <p style="margin: 0; font-size: 11px; opacity: 0.75;">© ${new Date().getFullYear()} Stay in Konkan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends a transactional booking confirmation email via Brevo REST API v3
 * @param {Object} booking - Booking object containing customer and stay details
 * @returns {Promise<{success: boolean, messageId?: string, error?: any}>}
 */
export async function sendBookingConfirmationEmail(booking) {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || 'devnectar27@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Stay in Konkan';

  const customerEmail = (booking.user_email || booking.customerEmail || booking.guest_email || booking.email || '').trim();
  const customerName = (booking.user_name || booking.customerName || booking.guest_name || 'Valued Guest').trim();
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';

  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn(`[Brevo Email Warning] Skipping email for booking ID ${bookingId}: invalid customer email (${customerEmail})`);
    return { success: false, message: 'Invalid customer email' };
  }

  if (!apiKey) {
    console.error(`[Brevo Email Error] Missing BREVO_API_KEY in environment variables. Cannot send confirmation for booking ID: ${bookingId}`);
    return { success: false, message: 'Missing BREVO_API_KEY' };
  }

  const payload = {
    sender: {
      name: senderName,
      email: senderEmail
    },
    to: [
      {
        email: customerEmail,
        name: customerName
      }
    ],
    subject: `Booking Confirmed - ${bookingId} | Stay in Konkan`,
    htmlContent: generateBookingEmailHTML(booking)
  };

  try {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));

    if (response.ok) {
      console.log(`[Brevo Email Success] Sent booking confirmation email to ${customerEmail} for booking ID: ${bookingId}`);
      return { success: true, messageId: data.messageId || data.id };
    } else {
      console.error(`[Brevo Email Error] Booking confirmation email failed for booking ID: ${bookingId}. Brevo status ${response.status}:`, data.message || JSON.stringify(data));
      return { success: false, error: data };
    }
  } catch (error) {
    console.error(`[Brevo Email Exception] Booking confirmation email failed for booking ID: ${bookingId}. Exception:`, error.message);
    return { success: false, error: error.message };
  }
}

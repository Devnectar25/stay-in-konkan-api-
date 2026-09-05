import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { query } from '../db.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let cachedLogoDataUri = null;
function getLogoDataUri() {
  if (cachedLogoDataUri) return cachedLogoDataUri;
  try {
    const possiblePaths = [
      path.resolve(__dirname, '../../../stay-in-konkan/public/assets/logo/StayIn_Konkan.png'),
      path.resolve(__dirname, '../../public/assets/logo/StayIn_Konkan.png'),
      path.resolve(process.cwd(), '../stay-in-konkan/public/assets/logo/StayIn_Konkan.png')
    ];
    for (const logoPath of possiblePaths) {
      if (fs.existsSync(logoPath)) {
        const fileData = fs.readFileSync(logoPath);
        cachedLogoDataUri = `data:image/png;base64,${fileData.toString('base64')}`;
        return cachedLogoDataUri;
      }
    }
  } catch (e) {}
  return null;
}

/**
 * Single common responsive HTML email template for all booking statuses.
 * Dynamically populates booking details, status badges, customized messages,
 * and property feedback action buttons.
 *
 * @param {Object} booking - Booking object containing customer, stay and property details
 * @param {Object} [options] - Additional dynamic template options
 * @returns {string} Fully rendered HTML email string
 */
export function generateBookingEmailHTML(booking, options = {}) {
  const customerName = (booking.user_name || booking.customerName || booking.guest_name || booking.guestName || 'Valued Guest').trim();
  const customerEmail = (booking.user_email || booking.customerEmail || booking.guest_email || booking.guestEmail || booking.email || '').trim();
  const customerPhone = (booking.user_phone || booking.customerPhone || booking.guest_phone || booking.guestMobile || booking.phone || 'N/A').trim();
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  const propertyName = (booking.property_name || booking.property_title || booking.propertyName || booking.property || 'Konkan Heritage Stay').trim();
  const location = (booking.location || booking.property_location || booking.address || 'Konkan Coast, Maharashtra').trim();
  const checkIn = (booking.check_in || booking.checkIn || 'N/A').trim();
  const checkOut = (booking.check_out || booking.checkOut || 'N/A').trim();
  const guests = booking.guests || '2 Guests';
  const rooms = booking.rooms || booking.roomsCount || booking.rooms_count || 1;
  const totalAmount = Number(booking.total_amount || booking.total_price || booking.totalAmount || booking.total || 0).toLocaleString('en-IN');
  const paidAmount = Number(booking.paid_amount || booking.paidAmount || booking.paid || booking.total_amount || booking.total || 0).toLocaleString('en-IN');

  const rawStatus = String(booking.status || 'confirmed').toLowerCase().trim();

  // Dynamic status display configuration
  let statusBadgeText = '✓ Booking Confirmed';
  let statusBadgeBg = '#22c55e';
  let displayStatusName = 'Booking Confirmed';
  let statusMessage = 'Thank you for choosing Stay in Konkan. Your reservation has been successfully confirmed. Below are your stay details.';
  let buttonText = 'View Booking Details';
  let showFeedbackButton = false;

  if (rawStatus === 'pending') {
    statusBadgeText = '⏳ Booking Pending';
    statusBadgeBg = '#f59e0b';
    displayStatusName = 'Booking Pending';
    statusMessage = 'Your booking request is currently pending and is being processed by our team. We will notify you as soon as your reservation is confirmed.';
    buttonText = 'View Booking Details';
    showFeedbackButton = false;
  } else if (rawStatus === 'completed' || rawStatus === 'checked_out') {
    statusBadgeText = '🎉 Booking Completed';
    statusBadgeBg = '#0284c7';
    displayStatusName = 'Booking Completed';
    statusMessage = 'We hope you enjoyed your stay in Konkan! Your reservation is now marked as completed. We would love to hear about your experience.';
    buttonText = 'Share Your Feedback';
    showFeedbackButton = true;
  } else if (rawStatus === 'cancelled' || rawStatus === 'rejected') {
    statusBadgeText = '❌ Booking Cancelled';
    statusBadgeBg = '#ef4444';
    displayStatusName = 'Booking Cancelled';
    statusMessage = 'Your reservation has been cancelled. If you have any questions or require assistance with refund details, please feel free to contact us.';
    buttonText = 'View My Bookings';
    showFeedbackButton = false;
  } else if (rawStatus === 'confirmed') {
    statusBadgeText = '✓ Booking Confirmed';
    statusBadgeBg = '#22c55e';
    displayStatusName = 'Booking Confirmed';
    statusMessage = 'Thank you for choosing Stay in Konkan. Your reservation has been successfully confirmed. Below are your complete stay details.';
    buttonText = 'View Booking Details';
    showFeedbackButton = false;
  }

  // Allow explicit override via options
  if (options.statusMessage) statusMessage = options.statusMessage;
  if (options.showFeedbackButton !== undefined) showFeedbackButton = options.showFeedbackButton;
  if (options.buttonText) buttonText = options.buttonText;

  // Dynamically generate user profile booking URL and brand logo URL
  const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://stayinkonkan.com').replace(/\/$/, '');
  const logoSrc = process.env.LOGO_URL || `${frontendBaseUrl}/assets/logo/StayIn_Konkan.png`;

  const userProfileUrl = `${frontendBaseUrl}/profile`;
  const actionUrl = options.actionUrl || options.propertyUrl || userProfileUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayStatusName} - Stay in Konkan</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #1b3823 0%, #2d5a37 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-family: Georgia, serif; letter-spacing: 0.5px; color: #fdfbf7; }
    .header p { margin: 6px 0 0 0; font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; color: #e2e8f0; }
    .badge { display: inline-block; background-color: ${statusBadgeBg}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1b3823; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background-color: #f8faf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1b3823; margin-bottom: 16px; border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
    .detail-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 10px; font-size: 14px; }
    .detail-label { display: table-cell; font-weight: 600; color: #718096; width: 38%; padding-bottom: 4px; vertical-align: top; word-wrap: break-word; }
    .detail-value { display: table-cell; font-weight: 600; color: #1a202c; width: 62%; padding-bottom: 4px; text-align: right; vertical-align: top; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; }
    .price-box { background-color: #eef7f0; border-radius: 10px; padding: 16px; margin-top: 16px; text-align: center; }
    .price-amount { font-size: 24px; font-weight: 800; color: #1b3823; }
    .footer { background-color: #f1f5f1; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1b3823; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #1b3823; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; }
    .button-feedback { background-color: #f59e0b; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; display: inline-block; }

    @media only screen and (max-width: 520px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 20px 14px !important; }
      .header { padding: 24px 16px !important; }
      .card { padding: 16px 12px !important; margin-bottom: 16px !important; }
      .detail-row { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .detail-label { display: block !important; width: 100% !important; padding-bottom: 2px !important; text-align: left !important; font-size: 13px !important; }
      .detail-value { display: block !important; width: 100% !important; text-align: left !important; font-size: 14px !important; word-break: break-all !important; word-wrap: break-word !important; overflow-wrap: break-word !important; color: #1a202c !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="background-color: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); margin-bottom: 12px; text-align: center;">
        <div style="font-size: 22px; font-weight: 900; color: #1b3823; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.2px; line-height: 1;">
          <span style="color: #22c55e; margin-right: 4px;">🌴</span> Stay in Konkan
        </div>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; color: #ffffff;">Authentic Coastal Hospitality</p>
      <div class="badge">${statusBadgeText}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Namaste, ${customerName}!</div>
      <div class="intro">
        ${statusMessage}
      </div>

      <div class="card">
        <div class="card-title">Reservation Summary</div>
        <div class="detail-row"><span class="detail-label">Booking Reference:</span><span class="detail-value" style="color:#1b3823; font-family:monospace; font-size:15px; word-break:break-all;">${bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span class="detail-value">${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${location}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in Date:</span><span class="detail-value">${checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out Date:</span><span class="detail-value">${checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Guests & Rooms:</span><span class="detail-value">${guests} (${rooms} Room)</span></div>
        <div class="detail-row"><span class="detail-label">Current Status:</span><span class="detail-value" style="font-weight:700; color:${statusBadgeBg};">${displayStatusName}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Guest Details</div>
        <div class="detail-row"><span class="detail-label">Guest Name:</span><span class="detail-value">${customerName}</span></div>
        <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value" style="word-break:break-all;"><a href="mailto:${customerEmail}" style="color:#0284c7; text-decoration:none;">${customerEmail}</a></span></div>
        <div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-value">${customerPhone}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Payment Overview</div>
        <div class="detail-row"><span class="detail-label">Total Stay Amount:</span><span class="detail-value">₹${totalAmount}</span></div>
        <div class="detail-row"><span class="detail-label">Amount Paid:</span><span class="detail-value">₹${paidAmount}</span></div>
        <div class="price-box">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#4a5568;">Total Stay Value</div>
          <div class="price-amount">₹${totalAmount}</div>
          <div style="font-size:12px; color:${statusBadgeBg}; margin-top:4px; font-weight:700;">Status: ${displayStatusName}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <p style="font-size: 14px; color: #4a5568;">
          ${rawStatus === 'completed' ? 'How was your stay? We value your experience!' : 'Need to view your stay details or property page online?'}
        </p>
        <a href="${actionUrl}" class="${showFeedbackButton ? 'button-feedback' : 'button'}">${buttonText}</a>
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
 * Sends condition-based booking status email notifications via Brevo API v3 with SMTP fallback.
 * Checks previous status vs new status to prevent duplicate email triggers.
 *
 * @param {Object} booking - Booking data object
 * @param {string|null} [oldStatus=null] - Previous booking status before update
 * @param {Object} [options={}] - Additional settings (e.g. force: true to bypass duplicate check)
 * @returns {Promise<{success: boolean, skipped?: boolean, method?: string, messageId?: string, error?: any}>}
 */
export async function sendBookingStatusEmail(booking, oldStatus = null, options = {}) {
  dotenv.config({ override: true });

  const customerEmail = (booking.user_email || booking.customerEmail || booking.guest_email || booking.email || '').trim();
  const customerName = (booking.user_name || booking.customerName || booking.guest_name || 'Valued Guest').trim();
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  const newStatus = String(booking.status || 'confirmed').toLowerCase().trim();
  const cleanOldStatus = oldStatus ? String(oldStatus).toLowerCase().trim() : null;

  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn(`[Email Service Warning] Skipping status email for booking ID ${bookingId}: invalid recipient email (${customerEmail})`);
    return { success: false, message: 'Invalid customer email address' };
  }

  // Duplicate Email Prevention: Only trigger if newStatus differs from oldStatus or last_emailed_status
  const lastEmailed = booking.last_emailed_status ? String(booking.last_emailed_status).toLowerCase().trim() : null;
  if (!options.force) {
    if (cleanOldStatus && cleanOldStatus === newStatus) {
      console.log(`[Email Service Skip] Duplicate status email prevented for booking ID ${bookingId} (old: '${cleanOldStatus}' === new: '${newStatus}')`);
      return { success: true, skipped: true, message: 'Status unchanged; duplicate email prevented.' };
    }
    if (lastEmailed && lastEmailed === newStatus) {
      console.log(`[Email Service Skip] Email for status '${newStatus}' was already sent for booking ID ${bookingId}`);
      return { success: true, skipped: true, message: 'Status email already dispatched.' };
    }
  }

  // Status-specific email subjects
  let subject = `Booking Update - ${bookingId} | Stay in Konkan`;
  if (newStatus === 'pending') {
    subject = `Booking Pending - ${bookingId} | Stay in Konkan`;
  } else if (newStatus === 'confirmed') {
    subject = `Booking Confirmed - ${bookingId} | Stay in Konkan`;
  } else if (newStatus === 'completed' || newStatus === 'checked_out') {
    subject = `Booking Completed - ${bookingId} | Stay in Konkan`;
  } else if (newStatus === 'cancelled' || newStatus === 'rejected') {
    subject = `Booking Cancelled - ${bookingId} | Stay in Konkan`;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || 'devnectar27@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Stay in Konkan';
  const brevoApiKey = process.env.BREVO_API_KEY;

  const htmlContent = generateBookingEmailHTML(booking, options);

  let deliveryResult = { success: false };

  // Delivery Strategy 1: Brevo REST API v3
  if (brevoApiKey) {
    try {
      console.log(`[Email Service] Triggering status '${newStatus}' email via Brevo REST API to ${customerEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: customerEmail, name: customerName }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const msgId = data.messageId || data.id || `<brevo.${Date.now()}>`;
        console.log(`[Brevo API Success] Status '${newStatus}' email delivered to ${customerEmail} (MessageID: ${msgId})`);
        deliveryResult = { success: true, method: 'brevo_api', messageId: msgId };
      } else {
        console.warn(`[Brevo API Warning] Status ${response.status}: ${data.message || JSON.stringify(data)}. Trying SMTP fallback...`);
      }
    } catch (brevoErr) {
      console.warn(`[Brevo API Exception] ${brevoErr.message}. Trying SMTP fallback...`);
    }
  }

  // Delivery Strategy 2: Nodemailer SMTP Fallback
  if (!deliveryResult.success) {
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || senderEmail;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.BREVO_API_KEY;

    if (smtpUser && smtpPass) {
      try {
        console.log(`[Email Service] Triggering status '${newStatus}' email via SMTP (${smtpHost}:${smtpPort}) to ${customerEmail}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: customerEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[SMTP Success] Status '${newStatus}' email delivered to ${customerEmail} (MessageID: ${info.messageId})`);
        deliveryResult = { success: true, method: 'smtp', messageId: info.messageId };
      } catch (smtpErr) {
        console.error(`[SMTP Error] Status email delivery failed:`, smtpErr.message);
        deliveryResult = {
          success: false,
          message: `Email delivery failed: ${smtpErr.message}`,
          details: 'Invalid BREVO_API_KEY or SMTP credentials'
        };
      }
    }
  }

  // Record Email Trigger & Update last_emailed_status in database (non-blocking)
  if (deliveryResult.success) {
    try {
      // Update last_emailed_status on bookings table
      await query(
        `UPDATE bookings SET last_emailed_status = $1, confirmation_email_sent = TRUE WHERE id = $2 OR booking_id = $2 OR payment_id = $2`,
        [newStatus, bookingId]
      ).catch(() => { });

      // Log dispatch into booking_email_logs table
      await query(`
        CREATE TABLE IF NOT EXISTS booking_email_logs (
          id SERIAL PRIMARY KEY,
          booking_id VARCHAR(255) NOT NULL,
          user_email VARCHAR(255) NOT NULL,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          subject VARCHAR(255),
          delivery_method VARCHAR(50),
          message_id VARCHAR(255),
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `).catch(() => { });

      await query(
        `INSERT INTO booking_email_logs (booking_id, user_email, old_status, new_status, subject, delivery_method, message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [bookingId, customerEmail, cleanOldStatus, newStatus, subject, deliveryResult.method || 'brevo_api', deliveryResult.messageId || '']
      ).catch(() => { });
    } catch (logErr) {
      console.warn('[Email Log Note]:', logErr.message);
    }
  }

  return deliveryResult;
}

/**
 * Backward compatibility wrapper for confirmation email dispatch
 */
export async function sendBookingConfirmationEmail(booking) {
  return sendBookingStatusEmail(booking, null, { force: true });
}

/**
 * Single common responsive HTML email template for all Host Application statuses.
 * Dynamically populates host name, application ID, property name, application date,
 * application status, and status-specific customized messages.
 *
 * @param {Object} application - Host Application object
 * @param {Object} [options] - Additional dynamic template options
 * @returns {string} Fully rendered HTML email string
 */
export function generateHostApplicationEmailHTML(application, options = {}) {
  const hostName = (application.applicant_name || application.applicantName || application.name || application.hostName || 'Respected Host').trim();
  const hostEmail = (application.applicant_email || application.applicantEmail || application.email || '').trim();
  const hostPhone = (application.phone || application.applicant_phone || 'N/A').trim();
  const applicationId = application.application_id || application.applicationId || application.id || 'HA-KONKAN';
  const propertyName = (application.custom_property_name || application.customPropertyName || application.property_name || application.propertyName || application.location || 'Konkan Homestay').trim();
  const location = (application.location || 'Konkan Coast, Maharashtra').trim();
  const propertyType = (application.property_type || application.propertyType || 'Homestay').trim();
  
  const rawDate = application.created_at || application.createdAt || new Date().toISOString();
  const applicationDate = new Date(rawDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  const rawStatus = String(application.status || 'submitted').toLowerCase().trim();

  let statusBadgeText = '📝 Application Submitted';
  let statusBadgeBg = '#f59e0b';
  let displayStatusName = 'Application Submitted';
  let statusMessage = 'Your host application has been successfully submitted and is currently under review.';
  let buttonText = 'Check Application Status';
  let statusColor = '#d97706';

  if (rawStatus === 'submitted' || rawStatus === 'pending') {
    statusBadgeText = '📝 Application Submitted';
    statusBadgeBg = '#f59e0b';
    statusColor = '#d97706';
    displayStatusName = 'Application Submitted';
    statusMessage = 'Your host application has been successfully submitted and is currently under review.';
    buttonText = 'Check Application Status';
  } else if (rawStatus === 'approved') {
    statusBadgeText = '🎉 Application Approved';
    statusBadgeBg = '#22c55e';
    statusColor = '#15803d';
    displayStatusName = 'Application Approved';
    statusMessage = 'Congratulations! Your host application has been approved. You can now continue with the next steps of hosting on Stay in Konkan.';
    buttonText = 'Go to Host Dashboard';
  } else if (rawStatus === 'rejected' || rawStatus === 'declined') {
    statusBadgeText = '❌ Application Rejected';
    statusBadgeBg = '#ef4444';
    statusColor = '#b91c1c';
    displayStatusName = 'Application Rejected';
    statusMessage = 'Thank you for your interest in joining the Stay in Konkan Host Network. We regret to inform you that your host application has been declined at this time. If you have questions or wish to re-apply, please contact our support team.';
    buttonText = 'Contact Support';
  } else if (rawStatus === 'cancelled') {
    statusBadgeText = '❌ Application Cancelled';
    statusBadgeBg = '#ef4444';
    statusColor = '#b91c1c';
    displayStatusName = 'Application Cancelled';
    statusMessage = 'Your host application has been cancelled. Please contact the support team if you need further information.';
    buttonText = 'Contact Support';
  }

  // Allow explicit override via options
  if (options.statusMessage) statusMessage = options.statusMessage;
  if (options.displayStatusName) displayStatusName = options.displayStatusName;
  if (options.buttonText) buttonText = options.buttonText;

  const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const becomeHostUrl = `${frontendBaseUrl}/become-host`;
  const actionUrl = options.actionUrl || becomeHostUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayStatusName} - Stay in Konkan Host Network</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #1b3823 0%, #2d5a37 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .header h1 { margin: 0; font-size: 24px; font-family: Georgia, serif; letter-spacing: 0.5px; color: #fdfbf7; }
    .badge { display: inline-block; background-color: ${statusBadgeBg}; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1b3823; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background-color: #f8faf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1b3823; margin-bottom: 16px; border-bottom: 2px solid ${statusBadgeBg}; padding-bottom: 8px; }
    .detail-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 10px; font-size: 14px; }
    .detail-label { display: table-cell; font-weight: 600; color: #718096; width: 38%; padding-bottom: 4px; vertical-align: top; word-wrap: break-word; }
    .detail-value { display: table-cell; font-weight: 600; color: #1a202c; width: 62%; padding-bottom: 4px; text-align: right; vertical-align: top; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; }
    .footer { background-color: #f1f5f1; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1b3823; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #1b3823; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; }

    @media only screen and (max-width: 520px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 20px 14px !important; }
      .header { padding: 24px 16px !important; }
      .card { padding: 16px 12px !important; margin-bottom: 16px !important; }
      .detail-row { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .detail-label { display: block !important; width: 100% !important; padding-bottom: 2px !important; text-align: left !important; font-size: 13px !important; }
      .detail-value { display: block !important; width: 100% !important; text-align: left !important; font-size: 14px !important; word-break: break-all !important; word-wrap: break-word !important; overflow-wrap: break-word !important; color: #1a202c !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="background-color: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); margin-bottom: 12px; text-align: center;">
        <div style="font-size: 22px; font-weight: 900; color: #1b3823; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.2px; line-height: 1;">
          <span style="color: #22c55e; margin-right: 4px;">🌴</span> Stay in Konkan
        </div>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; color: #ffffff;">Host Partner Network</p>
      <div class="badge">${statusBadgeText}</div>
    </div>
    
    <div class="content">
      <div class="greeting">Namaste, ${hostName}!</div>
      <div class="intro">
        ${statusMessage}
      </div>

      <div class="card">
        <div class="card-title">Application Details</div>
        <div class="detail-row"><span class="detail-label">Application ID:</span><span class="detail-value" style="color:#1b3823; font-family:monospace; font-size:15px; word-break:break-all;">${applicationId}</span></div>
        <div class="detail-row"><span class="detail-label">Applicant Name:</span><span class="detail-value">${hostName}</span></div>
        <div class="detail-row"><span class="detail-label">Property / Stay:</span><span class="detail-value">${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Location:</span><span class="detail-value">${location}</span></div>
        <div class="detail-row"><span class="detail-label">Property Type:</span><span class="detail-value" style="text-transform:capitalize;">${propertyType}</span></div>
        <div class="detail-row"><span class="detail-label">Application Date:</span><span class="detail-value">${applicationDate}</span></div>
        <div class="detail-row"><span class="detail-label">Application Status:</span><span class="detail-value" style="font-weight:700; color:${statusColor};">${displayStatusName}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Applicant Contact</div>
        <div class="detail-row"><span class="detail-label">Email:</span><span class="detail-value" style="word-break:break-all;"><a href="mailto:${hostEmail}" style="color:#0284c7; text-decoration:none;">${hostEmail}</a></span></div>
        <div class="detail-row"><span class="detail-label">Phone:</span><span class="detail-value">${hostPhone}</span></div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${actionUrl}" class="button">${buttonText}</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #1b3823;">Stay in Konkan Host Relations Desk</p>
      <p style="margin: 0 0 12px 0;">Need assistance? Email us at <a href="mailto:devnectar27@gmail.com">devnectar27@gmail.com</a> or call +91 8806063819</p>
      <p style="margin: 0; font-size: 11px; opacity: 0.75;">© ${new Date().getFullYear()} Stay in Konkan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends condition-based Host Application status email notifications via Brevo API v3 with SMTP fallback.
 * Checks previous status vs new status to prevent duplicate email triggers.
 *
 * @param {Object} application - Host Application object
 * @param {string|null} [oldStatus=null] - Previous status before update
 * @param {Object} [options={}] - Additional settings (e.g. force: true to bypass duplicate check)
 * @returns {Promise<{success: boolean, skipped?: boolean, method?: string, messageId?: string, error?: any}>}
 */
export async function sendHostApplicationStatusEmail(application, oldStatus = null, options = {}) {
  dotenv.config({ override: true });

  const hostEmail = (application.applicant_email || application.applicantEmail || application.email || '').trim();
  const hostName = (application.applicant_name || application.applicantName || application.name || 'Respected Host').trim();
  const applicationId = application.application_id || application.applicationId || application.id || 'HA-KONKAN';

  let newStatus = String(application.status || 'submitted').toLowerCase().trim();
  if (newStatus === 'pending') newStatus = 'submitted';
  if (newStatus === 'declined') newStatus = 'rejected';

  let cleanOldStatus = oldStatus ? String(oldStatus).toLowerCase().trim() : null;
  if (cleanOldStatus === 'pending') cleanOldStatus = 'submitted';
  if (cleanOldStatus === 'declined') cleanOldStatus = 'rejected';

  if (!hostEmail || !hostEmail.includes('@')) {
    console.warn(`[Email Service Warning] Skipping host application email for ID ${applicationId}: invalid recipient email (${hostEmail})`);
    return { success: false, message: 'Invalid host email address' };
  }

  // Duplicate Email Prevention: Only trigger if newStatus differs from oldStatus or last_emailed_status
  const lastEmailed = application.last_emailed_status ? String(application.last_emailed_status).toLowerCase().trim() : null;
  if (!options.force) {
    if (cleanOldStatus && cleanOldStatus === newStatus) {
      console.log(`[Email Service Skip] Duplicate host application email prevented for ID ${applicationId} (old: '${cleanOldStatus}' === new: '${newStatus}')`);
      return { success: true, skipped: true, message: 'Status unchanged; duplicate email prevented.' };
    }
    if (lastEmailed && lastEmailed === newStatus) {
      console.log(`[Email Service Skip] Host application email for status '${newStatus}' was already sent for ID ${applicationId}`);
      return { success: true, skipped: true, message: 'Host application email already dispatched.' };
    }
  }

  // Status-specific subjects
  let subject = `Host Application Status Update - ${applicationId} | Stay in Konkan`;
  if (newStatus === 'submitted') {
    subject = `Host Application Submitted - ${applicationId} | Stay in Konkan`;
  } else if (newStatus === 'approved') {
    subject = `Host Application Approved - ${applicationId} | Stay in Konkan`;
  } else if (newStatus === 'rejected') {
    subject = `Host Application Rejection Notice - ${applicationId} | Stay in Konkan`;
  } else if (newStatus === 'cancelled') {
    subject = `Host Application Cancelled - ${applicationId} | Stay in Konkan`;
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || 'devnectar27@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Stay in Konkan';
  const brevoApiKey = process.env.BREVO_API_KEY;

  const htmlContent = generateHostApplicationEmailHTML(application, options);

  let deliveryResult = { success: false };

  // Delivery Strategy 1: Brevo REST API v3
  if (brevoApiKey) {
    try {
      console.log(`[Email Service] Triggering host application status '${newStatus}' email via Brevo REST API to ${hostEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: hostEmail, name: hostName }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const msgId = data.messageId || data.id || `<brevo.${Date.now()}>`;
        console.log(`[Brevo API Success] Host application status '${newStatus}' email delivered to ${hostEmail} (MessageID: ${msgId})`);
        deliveryResult = { success: true, method: 'brevo_api', messageId: msgId };
      } else {
        console.warn(`[Brevo API Warning] Host status ${response.status}: ${data.message || JSON.stringify(data)}. Trying SMTP fallback...`);
      }
    } catch (brevoErr) {
      console.warn(`[Brevo API Exception] ${brevoErr.message}. Trying SMTP fallback...`);
    }
  }

  // Delivery Strategy 2: Nodemailer SMTP Fallback
  if (!deliveryResult.success) {
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || senderEmail;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.BREVO_API_KEY;

    if (smtpUser && smtpPass) {
      try {
        console.log(`[Email Service] Triggering host application status '${newStatus}' email via SMTP (${smtpHost}:${smtpPort}) to ${hostEmail}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: hostEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[SMTP Success] Host application status '${newStatus}' email delivered to ${hostEmail} (MessageID: ${info.messageId})`);
        deliveryResult = { success: true, method: 'smtp', messageId: info.messageId };
      } catch (smtpErr) {
        console.error(`[SMTP Error] Host application status email delivery failed:`, smtpErr.message);
        deliveryResult = {
          success: false,
          message: `Email delivery failed: ${smtpErr.message}`,
          details: 'Invalid BREVO_API_KEY or SMTP credentials'
        };
      }
    }
  }

  // Record Email Trigger & Update last_emailed_status in database (non-blocking)
  if (deliveryResult.success) {
    try {
      await query(
        `UPDATE host_applications SET last_emailed_status = $1 WHERE id = $2 OR application_id = $2`,
        [newStatus, applicationId]
      ).catch(() => {});

      await query(`
        CREATE TABLE IF NOT EXISTS host_application_email_logs (
          id SERIAL PRIMARY KEY,
          application_id VARCHAR(255) NOT NULL,
          applicant_email VARCHAR(255) NOT NULL,
          old_status VARCHAR(50),
          new_status VARCHAR(50) NOT NULL,
          subject VARCHAR(255),
          delivery_method VARCHAR(50),
          message_id VARCHAR(255),
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `).catch(() => {});

      await query(
        `INSERT INTO host_application_email_logs (application_id, applicant_email, old_status, new_status, subject, delivery_method, message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [applicationId, hostEmail, cleanOldStatus, newStatus, subject, deliveryResult.method || 'brevo_api', deliveryResult.messageId || '']
      ).catch(() => {});
    } catch (logErr) {
      console.warn('[Host App Email Log Note]:', logErr.message);
    }
  }

  return deliveryResult;
}

/**
 * Responsive HTML email template sent to Property Host upon receiving a new guest booking.
 *
 * @param {Object} booking - Booking data object
 * @param {Object} [options] - Additional dynamic template options
 * @returns {string} Fully rendered HTML email string
 */
export function generateHostBookingEmailHTML(booking, options = {}) {
  const guestName = (booking.user_name || booking.customerName || booking.guest_name || booking.name || 'Valued Guest').trim();
  const guestEmail = (booking.user_email || booking.customerEmail || booking.guest_email || booking.email || 'N/A').trim();
  const guestPhone = (booking.user_phone || booking.customerPhone || booking.guest_phone || booking.phone || 'N/A').trim();
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  const propertyName = (booking.property_name || booking.property_title || booking.propertyName || booking.property || 'Konkan Stay').trim();
  const checkIn = (booking.check_in || booking.checkIn || 'N/A').trim();
  const checkOut = (booking.check_out || booking.checkOut || 'N/A').trim();
  const guests = booking.guests || '2 Guests';
  const rooms = booking.rooms || booking.roomsCount || 1;
  const totalAmount = Number(booking.total_amount || booking.total_price || booking.totalAmount || booking.total || 0).toLocaleString('en-IN');
  const paidAmount = Number(booking.paid_amount || booking.paidAmount || booking.paid || booking.total_amount || 0).toLocaleString('en-IN');
  const rawStatus = String(booking.status || 'Confirmed').trim();
  const displayStatus = rawStatus.charAt(0).toUpperCase() + rawStatus.slice(1);

  const hostName = (booking.host_name || booking.hostName || booking.owner_name || 'Respected Host Partner').trim();

  const frontendBaseUrl = (process.env.FRONTEND_URL || 'http://localhost:5173').replace(/\/$/, '');
  const hostDashboardUrl = `${frontendBaseUrl}/host-dashboard`;
  const actionUrl = options.actionUrl || hostDashboardUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Booking Alert - ${bookingId} | Stay in Konkan Host Network</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #1b3823 0%, #2d5a37 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background-color: #22c55e; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1b3823; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background-color: #f8faf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1b3823; margin-bottom: 16px; border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
    .detail-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 10px; font-size: 14px; }
    .detail-label { display: table-cell; font-weight: 600; color: #718096; width: 38%; padding-bottom: 4px; vertical-align: top; word-wrap: break-word; }
    .detail-value { display: table-cell; font-weight: 600; color: #1a202c; width: 62%; padding-bottom: 4px; text-align: right; vertical-align: top; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; }
    .price-box { background-color: #eef7f0; border-radius: 10px; padding: 16px; margin-top: 16px; text-align: center; }
    .price-amount { font-size: 24px; font-weight: 800; color: #1b3823; }
    .footer { background-color: #f1f5f1; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1b3823; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #1b3823; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 16px; }

    @media only screen and (max-width: 520px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 20px 14px !important; }
      .header { padding: 24px 16px !important; }
      .card { padding: 16px 12px !important; margin-bottom: 16px !important; }
      .detail-row { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .detail-label { display: block !important; width: 100% !important; padding-bottom: 2px !important; text-align: left !important; font-size: 13px !important; }
      .detail-value { display: block !important; width: 100% !important; text-align: left !important; font-size: 14px !important; word-break: break-all !important; word-wrap: break-word !important; overflow-wrap: break-word !important; color: #1a202c !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div style="background-color: #ffffff; display: inline-block; padding: 12px 28px; border-radius: 14px; box-shadow: 0 4px 14px rgba(0,0,0,0.18); margin-bottom: 12px; text-align: center;">
        <div style="font-size: 22px; font-weight: 900; color: #1b3823; font-family: Georgia, 'Times New Roman', serif; letter-spacing: -0.2px; line-height: 1;">
          <span style="color: #22c55e; margin-right: 4px;">🌴</span> Stay in Konkan
        </div>
      </div>
      <p style="margin: 4px 0 0 0; font-size: 11px; opacity: 0.9; text-transform: uppercase; letter-spacing: 1.5px; color: #ffffff;">Host Partner Alert Network</p>
      <div class="badge">🎉 New Booking Received</div>
    </div>
    
    <div class="content">
      <div class="greeting">Namaste, ${hostName}!</div>
      <div class="intro">
        Great news! You have received a new booking for your property <strong>${propertyName}</strong>. Below are the complete stay and guest details.
      </div>

      <div class="card">
        <div class="card-title">Booking & Stay Details</div>
        <div class="detail-row"><span class="detail-label">Booking ID:</span><span class="detail-value" style="color:#1b3823; font-family:monospace; font-size:15px; word-break:break-all;">${bookingId}</span></div>
        <div class="detail-row"><span class="detail-label">Property:</span><span class="detail-value">${propertyName}</span></div>
        <div class="detail-row"><span class="detail-label">Check-in Date:</span><span class="detail-value">${checkIn}</span></div>
        <div class="detail-row"><span class="detail-label">Check-out Date:</span><span class="detail-value">${checkOut}</span></div>
        <div class="detail-row"><span class="detail-label">Guests & Rooms:</span><span class="detail-value">${guests} (${rooms} Room)</span></div>
        <div class="detail-row"><span class="detail-label">Booking Status:</span><span class="detail-value" style="font-weight:700; color:#22c55e;">${displayStatus}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Guest Contact Information</div>
        <div class="detail-row"><span class="detail-label">Guest Name:</span><span class="detail-value">${guestName}</span></div>
        <div class="detail-row"><span class="detail-label">Guest Email:</span><span class="detail-value" style="word-break:break-all;"><a href="mailto:${guestEmail}" style="color:#0284c7; text-decoration:none;">${guestEmail}</a></span></div>
        <div class="detail-row"><span class="detail-label">Guest Phone:</span><span class="detail-value">${guestPhone}</span></div>
      </div>

      <div class="card">
        <div class="card-title">Financial Summary</div>
        <div class="detail-row"><span class="detail-label">Total Booking Amount:</span><span class="detail-value">₹${totalAmount}</span></div>
        <div class="detail-row"><span class="detail-label">Advance Paid:</span><span class="detail-value">₹${paidAmount}</span></div>
        <div class="price-box">
          <div style="font-size:12px; text-transform:uppercase; letter-spacing:1px; color:#4a5568;">Total Stay Value</div>
          <div class="price-amount">₹${totalAmount}</div>
          <div style="font-size:12px; color:#22c55e; margin-top:4px; font-weight:700;">Status: ${displayStatus}</div>
        </div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="${actionUrl}" class="button">Go to Host Dashboard</a>
      </div>
    </div>

    <div class="footer">
      <p style="margin: 0 0 8px 0; font-weight: 700; color: #1b3823;">Stay in Konkan Host Relations Desk</p>
      <p style="margin: 0 0 12px 0;">Need help managing this stay? Email us at <a href="mailto:devnectar27@gmail.com">devnectar27@gmail.com</a> or call +91 8806063819</p>
      <p style="margin: 0; font-size: 11px; opacity: 0.75;">© ${new Date().getFullYear()} Stay in Konkan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Sends automatic email notification to property host whenever a new booking is confirmed.
 * Implements strict duplicate prevention logic.
 *
 * @param {Object} booking - Booking data object
 * @param {Object} [options={}] - Options (force: true to bypass duplicate check)
 * @returns {Promise<{success: boolean, skipped?: boolean, method?: string, messageId?: string, error?: any}>}
 */
export async function sendHostBookingNotificationEmail(booking, options = {}) {
  dotenv.config({ override: true });

  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  const propertyName = (booking.property_name || booking.property_title || booking.propertyName || booking.property || 'Konkan Stay').trim();
  const guestName = (booking.user_name || booking.customerName || booking.guest_name || 'Guest').trim();
  
  let hostEmail = (booking.host_email || booking.hostEmail || booking.owner_email || '').trim().toLowerCase();

  // Resolve property host email from properties DB table if missing/placeholder
  if (!hostEmail || hostEmail === 'host@stayinkonkan.com' || !hostEmail.includes('@')) {
    try {
      const propId = booking.property_id || booking.propertyId;
      const propRes = await query(
        'SELECT * FROM properties WHERE id = $1 OR LOWER(title) = LOWER($2) OR LOWER(name) = LOWER($2) LIMIT 1',
        [propId, propertyName]
      );
      if (propRes && propRes.rows && propRes.rows[0]) {
        const p = propRes.rows[0];
        hostEmail = (p.host_email || p.owner_email || p.email || hostEmail).trim().toLowerCase();
      }
    } catch (e) {}
  }

  if (!hostEmail || !hostEmail.includes('@')) {
    console.warn(`[Host Email Warning] Skipping host booking notification for ${bookingId}: invalid recipient host email (${hostEmail})`);
    return { success: false, message: 'Invalid property host email address' };
  }

  // Duplicate Prevention: Check if email already dispatched for this booking + host
  if (!options.force) {
    try {
      const logRes = await query(
        'SELECT * FROM host_booking_email_logs WHERE booking_id = $1 AND LOWER(host_email) = LOWER($2) LIMIT 1',
        [bookingId, hostEmail]
      );
      if (logRes && logRes.rows && logRes.rows.length > 0) {
        console.log(`[Host Email Skip] Duplicate host notification email prevented for booking ID ${bookingId} to ${hostEmail}`);
        return { success: true, skipped: true, message: 'Host notification email already sent for this booking.' };
      }
    } catch (e) {}
  }

  const subject = `🎉 New Booking Alert: ${guestName} booked ${propertyName} - ${bookingId} | Stay in Konkan`;
  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || 'devnectar27@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Stay in Konkan';
  const brevoApiKey = process.env.BREVO_API_KEY;

  const htmlContent = generateHostBookingEmailHTML(booking, options);

  let deliveryResult = { success: false };

  // Strategy 1: Brevo REST API v3
  if (brevoApiKey) {
    try {
      console.log(`[Host Email Service] Sending new booking alert email via Brevo REST API to host (${hostEmail})...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoApiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: hostEmail, name: booking.host_name || 'Host Partner' }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const msgId = data.messageId || data.id || `<brevo.${Date.now()}>`;
        console.log(`[Brevo API Success] Host booking notification delivered to ${hostEmail} (MessageID: ${msgId})`);
        deliveryResult = { success: true, method: 'brevo_api', messageId: msgId };
      } else {
        console.warn(`[Brevo API Warning] Host booking email ${response.status}: ${data.message || JSON.stringify(data)}. Trying SMTP fallback...`);
      }
    } catch (brevoErr) {
      console.warn(`[Brevo API Exception] ${brevoErr.message}. Trying SMTP fallback...`);
    }
  }

  // Strategy 2: Nodemailer SMTP Fallback
  if (!deliveryResult.success) {
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || senderEmail;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.BREVO_API_KEY;

    if (smtpUser && smtpPass) {
      try {
        console.log(`[Host Email Service] Triggering host booking notification via SMTP to ${hostEmail}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: hostEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[SMTP Success] Host booking notification email delivered to ${hostEmail} (MessageID: ${info.messageId})`);
        deliveryResult = { success: true, method: 'smtp', messageId: info.messageId };
      } catch (smtpErr) {
        console.error(`[SMTP Error] Host booking email delivery failed:`, smtpErr.message);
        deliveryResult = {
          success: false,
          message: `Email delivery failed: ${smtpErr.message}`
        };
      }
    }
  }

  // Record Audit Log & Update Database (non-blocking)
  if (deliveryResult.success) {
    try {
      await query(
        `UPDATE bookings SET host_email_sent = TRUE WHERE id = $1 OR booking_id = $1`,
        [bookingId]
      ).catch(() => {});

      await query(`
        CREATE TABLE IF NOT EXISTS host_booking_email_logs (
          id SERIAL PRIMARY KEY,
          booking_id VARCHAR(255) NOT NULL,
          host_email VARCHAR(255) NOT NULL,
          property_name VARCHAR(255),
          subject VARCHAR(255),
          delivery_method VARCHAR(50),
          message_id VARCHAR(255),
          triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `).catch(() => {});

      await query(
        `INSERT INTO host_booking_email_logs (booking_id, host_email, property_name, subject, delivery_method, message_id)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [bookingId, hostEmail, propertyName, subject, deliveryResult.method || 'brevo_api', deliveryResult.messageId || '']
      ).catch(() => {});
    } catch (logErr) {
      console.warn('[Host Booking Email Log Note]:', logErr.message);
    }
  }

  return deliveryResult;
}

/**
 * Creates an in-app alert/notification for a host upon new booking arrival.
 * Stores notification record in host_notifications table in PostgreSQL.
 *
 * @param {Object} booking - Booking data object
 * @returns {Promise<Object|null>}
 */
export async function createHostNotification(booking) {
  const bookingId = booking.booking_id || booking.id || 'SIK-BOOKING';
  let hostEmail = (booking.host_email || booking.hostEmail || booking.owner_email || '').trim().toLowerCase();
  const guestName = (booking.user_name || booking.customerName || booking.guest_name || 'Valued Guest').trim();
  const propertyName = (booking.property_name || booking.propertyName || booking.property || 'Konkan Stay').trim();
  const checkIn = (booking.check_in || booking.checkIn || 'N/A').trim();
  const checkOut = (booking.check_out || booking.checkOut || 'N/A').trim();
  const guests = booking.guests || '2 Guests';
  const totalAmount = Number(booking.total_amount || booking.total_price || booking.total || 0).toLocaleString('en-IN');
  const status = String(booking.status || 'Confirmed').trim();

  if (!hostEmail || hostEmail === 'host@stayinkonkan.com' || !hostEmail.includes('@')) {
    try {
      const propId = booking.property_id || booking.propertyId;
      const propRes = await query(
        'SELECT * FROM properties WHERE id = $1 OR LOWER(title) = LOWER($2) OR LOWER(name) = LOWER($2) LIMIT 1',
        [propId, propertyName]
      );
      if (propRes && propRes.rows && propRes.rows[0]) {
        const p = propRes.rows[0];
        hostEmail = (p.host_email || p.owner_email || p.email || hostEmail).trim().toLowerCase();
      }
    } catch (e) {}
  }

  if (!hostEmail || !hostEmail.includes('@')) return null;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS host_notifications (
        id SERIAL PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        host_email VARCHAR(255) NOT NULL,
        property_name VARCHAR(255),
        title VARCHAR(255) NOT NULL,
        message TEXT NOT NULL,
        type VARCHAR(50) DEFAULT 'new_booking',
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `).catch(() => {});

    // Check duplicate notification
    const existing = await query(
      'SELECT * FROM host_notifications WHERE booking_id = $1 AND LOWER(host_email) = LOWER($2) AND type = $3',
      [bookingId, hostEmail, 'new_booking']
    );

    if (existing && existing.rows && existing.rows.length > 0) {
      return existing.rows[0];
    }

    const title = `New Booking Received: ${bookingId}`;
    const message = `Guest ${guestName} has booked ${propertyName} for ${guests} (${checkIn} to ${checkOut}). Total Amount: ₹${totalAmount}. Status: ${status}.`;

    const insRes = await query(
      `INSERT INTO host_notifications (booking_id, host_email, property_name, title, message, type, is_read, created_at)
       VALUES ($1, $2, $3, $4, $5, 'new_booking', FALSE, NOW())
       RETURNING *;`,
      [bookingId, hostEmail, propertyName, title, message]
    );

    return insRes.rows[0];
  } catch (err) {
    console.warn('[Host Notification Error]:', err.message);
    return null;
  }
}

/**
 * Responsive HTML email template for refund payout notifications sent to guests.
 *
 * @param {Object} refundData - Cancellation/refund object
 * @param {Object} [options] - Additional dynamic template options
 * @returns {string} Fully rendered HTML email string
 */
export function generateRefundEmailHTML(refundData, options = {}) {
  const customerName = (refundData.user_name || refundData.customerName || refundData.guest_name || refundData.guestName || refundData.name || 'Valued Guest').trim();
  const customerEmail = (refundData.user_email || refundData.customerEmail || refundData.guest_email || refundData.email || 'N/A').trim();
  const bookingId = refundData.booking_id || refundData.id || 'SIK-BOOKING';
  const propertyName = (refundData.property_name || refundData.property_title || refundData.propertyName || refundData.property || 'Konkan Stay').trim();
  const checkIn = (refundData.check_in || refundData.checkIn || 'N/A').trim();
  const checkOut = (refundData.check_out || refundData.checkOut || 'N/A').trim();

  const paidAmountNum = Number(refundData.paid_amount || refundData.paidAmount || refundData.paid || refundData.total_amount || 0);
  const paidAmount = paidAmountNum.toLocaleString('en-IN');

  const refundAmountNum = Number(refundData.refund_amount || refundData.refundAmount || 0);
  const refundAmount = refundAmountNum.toLocaleString('en-IN');

  const refundPercentage = refundData.refund_percentage || refundData.refundPercentage || (paidAmountNum > 0 ? Math.round((refundAmountNum / paidAmountNum) * 100) : 80);
  const refundTxnId = (refundData.refund_txn_id || refundData.refundTxnId || refundData.txnRef || `REFUND-${Date.now()}`).trim();

  let destinationText = 'Your Registered Bank Account / UPI ID';
  if (refundData.upi_id) {
    destinationText = `UPI ID: ${refundData.upi_id}`;
  } else if (refundData.account_number) {
    const accStr = String(refundData.account_number).trim();
    const last4 = accStr.length >= 4 ? accStr.slice(-4) : accStr;
    const bankName = refundData.bank_name ? `${refundData.bank_name} ` : '';
    destinationText = `${bankName}Account ending in •••• ${last4}`;
  }

  const frontendBaseUrl = (process.env.FRONTEND_URL || 'https://stayinkonkan.com').replace(/\/$/, '');
  const logoSrc = process.env.LOGO_URL || `${frontendBaseUrl}/assets/logo/StayIn_Konkan.png`;
  const userProfileUrl = `${frontendBaseUrl}/profile`;
  const actionUrl = options.actionUrl || userProfileUrl;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Refund Processed - ${bookingId} | Stay in Konkan</title>
  <style>
    body { margin: 0; padding: 0; background-color: #f4f7f4; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #2d3748; -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    .container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08); }
    .header { background: linear-gradient(135deg, #1b3823 0%, #2d5a37 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
    .badge { display: inline-block; background-color: #22c55e; color: #ffffff; font-size: 12px; font-weight: 700; padding: 6px 16px; border-radius: 50px; text-transform: uppercase; letter-spacing: 1px; margin-top: 16px; }
    .content { padding: 32px 24px; }
    .greeting { font-size: 18px; font-weight: 700; color: #1b3823; margin-bottom: 12px; }
    .intro { font-size: 15px; line-height: 1.6; color: #4a5568; margin-bottom: 24px; }
    .card { background-color: #f8faf8; border: 1px solid #e2e8f0; border-radius: 12px; padding: 20px; margin-bottom: 24px; }
    .card-title { font-size: 16px; font-weight: 700; color: #1b3823; margin-bottom: 16px; border-bottom: 2px solid #22c55e; padding-bottom: 8px; }
    .detail-row { display: table; width: 100%; table-layout: fixed; margin-bottom: 10px; font-size: 14px; }
    .detail-label { display: table-cell; font-weight: 600; color: #718096; width: 38%; padding-bottom: 4px; vertical-align: top; word-wrap: break-word; }
    .detail-value { display: table-cell; font-weight: 600; color: #1a202c; width: 62%; padding-bottom: 4px; text-align: right; vertical-align: top; word-break: break-all; word-wrap: break-word; overflow-wrap: break-word; }
    .price-box { background-color: #f0fdf4; border: 1.5px solid #bbf7d0; border-radius: 12px; padding: 20px; margin-top: 20px; text-align: center; }
    .price-label { font-size: 12px; font-weight: 700; color: #166534; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 4px; }
    .price-amount { font-size: 28px; font-weight: 800; color: #15803d; }
    .utr-box { background-color: #edf2f7; border-radius: 8px; padding: 12px 16px; margin-top: 16px; font-size: 13px; color: #2d3748; word-break: break-all; }
    .utr-val { font-family: monospace; font-weight: 700; color: #1b3823; font-size: 14px; }
    .footer { background-color: #f1f5f1; padding: 24px; text-align: center; font-size: 13px; color: #718096; border-top: 1px solid #e2e8f0; }
    .footer a { color: #1b3823; text-decoration: none; font-weight: 600; }
    .button { display: inline-block; background-color: #1b3823; color: #ffffff !important; font-size: 14px; font-weight: 700; padding: 12px 28px; border-radius: 8px; text-decoration: none; margin-top: 20px; }

    @media only screen and (max-width: 520px) {
      .container { width: 100% !important; margin: 0 !important; border-radius: 0 !important; }
      .content { padding: 20px 14px !important; }
      .header { padding: 24px 16px !important; }
      .card { padding: 16px 12px !important; margin-bottom: 16px !important; }
      .detail-row { display: block !important; width: 100% !important; margin-bottom: 12px !important; }
      .detail-label { display: block !important; width: 100% !important; padding-bottom: 2px !important; text-align: left !important; font-size: 13px !important; }
      .detail-value { display: block !important; width: 100% !important; text-align: left !important; font-size: 14px !important; word-break: break-all !important; word-wrap: break-word !important; overflow-wrap: break-word !important; color: #1a202c !important; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h2 style="margin:0; font-size:24px; font-weight:800; letter-spacing:-0.5px;">Stay in Konkan</h2>
      <p style="margin:4px 0 0 0; font-size:13px; opacity:0.9;">Authentic Homestays & Beach Houses</p>
      <div class="badge">💰 Refund Processed & Credited</div>
    </div>
    <div class="content">
      <div class="greeting">Hello ${customerName},</div>
      <div class="intro">
        Great news! Your booking refund request for stay reservation <strong>${bookingId}</strong> has been processed by our Refund Desk and successfully transferred to your account.
      </div>

      <div class="card">
        <div class="card-title">Refund Settlement Breakdown</div>

        <div class="detail-row">
          <div class="detail-label">Booking Reference:</div>
          <div class="detail-value">${bookingId}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Property Name:</div>
          <div class="detail-value">${propertyName}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Check-in / Check-out:</div>
          <div class="detail-value">${checkIn} to ${checkOut}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Original Amount Paid:</div>
          <div class="detail-value">₹${paidAmount}</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Refund Percentage:</div>
          <div class="detail-value">${refundPercentage}% Refund Policy</div>
        </div>
        <div class="detail-row">
          <div class="detail-label">Payout Destination:</div>
          <div class="detail-value">${destinationText}</div>
        </div>

        <div class="price-box">
          <div class="price-label">Refunded Amount Credited</div>
          <div class="price-amount">₹${refundAmount}</div>
        </div>

        <div class="utr-box">
          <strong>Bank UTR / Transaction Reference ID:</strong><br>
          <span class="utr-val">${refundTxnId}</span>
        </div>
      </div>

      <p style="font-size: 13px; color: #718096; line-height: 1.5;">
        <em>Note: Depending on your bank or payment provider's settlement cycle, the credited amount will reflect in your account balance within 2 to 24 hours. Please retain the UTR reference number above for your records.</em>
      </p>

      <div style="text-align: center;">
        <a href="${actionUrl}" class="button">View My Profile & Bookings</a>
      </div>
    </div>
    <div class="footer">
      <p style="margin: 0 0 8px 0;">Need help with your refund? Reach out to us at <a href="mailto:support@stayinkonkan.com">support@stayinkonkan.com</a></p>
      <p style="margin: 0;">© ${new Date().getFullYear()} Stay in Konkan. All rights reserved.</p>
    </div>
  </div>
</body>
</html>
  `;
}

/**
 * Dispatches automatic refund payout notification email to guest via Brevo REST API (or SMTP fallback).
 * Prevents duplicate email dispatch using refund_email_logs table.
 *
 * @param {Object} refundData - Cancellation/refund object
 * @returns {Promise<Object>} Delivery result object
 */
export async function sendRefundNotificationEmail(refundData) {
  const customerEmail = (refundData.user_email || refundData.customerEmail || refundData.guest_email || refundData.email || '').trim().toLowerCase();
  const bookingId = (refundData.booking_id || refundData.id || 'BK-REFUND').trim();

  const refundAmountNum = Number(refundData.refund_amount || refundData.refundAmount || 0);
  const refundAmount = refundAmountNum.toLocaleString('en-IN');
  const refundTxnId = (refundData.refund_txn_id || refundData.refundTxnId || refundData.txnRef || `REFUND-${Date.now()}`).trim();

  if (!customerEmail || !customerEmail.includes('@')) {
    console.warn(`[Refund Email Skip] Invalid or missing recipient email: "${customerEmail}" for booking ID ${bookingId}`);
    return { success: false, skipped: true, message: 'Invalid recipient email.' };
  }

  // Duplicate Email Prevention via Audit Logs
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS refund_email_logs (
        id SERIAL PRIMARY KEY,
        cancellation_id VARCHAR(255),
        booking_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        refund_amount NUMERIC(10,2),
        refund_txn_id VARCHAR(255),
        delivery_method VARCHAR(50),
        message_id VARCHAR(255),
        triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `).catch(() => {});

    const dupCheck = await query(
      `SELECT * FROM refund_email_logs 
       WHERE booking_id = $1 AND LOWER(user_email) = LOWER($2) AND refund_txn_id = $3 LIMIT 1`,
      [bookingId, customerEmail, refundTxnId]
    );

    if (dupCheck && dupCheck.rows && dupCheck.rows.length > 0) {
      console.log(`[Email Service Skip] Duplicate refund email prevented for booking ID ${bookingId} (Txn: ${refundTxnId})`);
      return { success: true, skipped: true, message: 'Duplicate refund email prevented.' };
    }
  } catch (e) {
    console.warn('[Refund Email Audit Check Note]:', e.message);
  }

  const htmlContent = generateRefundEmailHTML(refundData);
  const subject = `Refund Processed (₹${refundAmount}) for Booking #${bookingId} - Stay in Konkan`;

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SENDER_EMAIL || 'stayinkonkan.com@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || process.env.SENDER_NAME || 'Stay in Konkan Refund Desk';

  let deliveryResult = { success: false };

  // Strategy 1: Brevo REST API v3
  const brevoApiKey = process.env.BREVO_API_KEY;
  if (brevoApiKey && brevoApiKey.startsWith('xkeysib-')) {
    try {
      console.log(`[Refund Email Service] Triggering refund email via Brevo REST API to ${customerEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: customerEmail, name: refundData.user_name || refundData.guest_name || 'Guest' }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      if (response.ok) {
        const data = await response.json();
        console.log(`[Brevo API Success] Refund notification email delivered to ${customerEmail} (MessageID: ${data.messageId || data.messageIds?.[0]})`);
        deliveryResult = {
          success: true,
          method: 'brevo_api',
          messageId: data.messageId || data.messageIds?.[0] || 'brevo-success'
        };
      } else {
        const errText = await response.text();
        console.error(`[Brevo API Error] HTTP ${response.status}: ${errText}`);
      }
    } catch (apiErr) {
      console.error(`[Brevo API Exception] Failed to send refund email:`, apiErr.message);
    }
  }

  // Strategy 2: Nodemailer SMTP Fallback
  if (!deliveryResult.success) {
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || senderEmail;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.BREVO_API_KEY;

    if (smtpUser && smtpPass) {
      try {
        console.log(`[Refund Email Service] Triggering refund email via SMTP to ${customerEmail}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: customerEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[SMTP Success] Refund email delivered to ${customerEmail} (MessageID: ${info.messageId})`);
        deliveryResult = { success: true, method: 'smtp', messageId: info.messageId };
      } catch (smtpErr) {
        console.error(`[SMTP Error] Refund email delivery failed:`, smtpErr.message);
        deliveryResult = {
          success: false,
          message: `Email delivery failed: ${smtpErr.message}`
        };
      }
    }
  }

  // Audit Log Entry
  if (deliveryResult.success) {
    try {
      await query(
        `INSERT INTO refund_email_logs (cancellation_id, booking_id, user_email, refund_amount, refund_txn_id, delivery_method, message_id)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [refundData.id || null, bookingId, customerEmail, refundAmountNum, refundTxnId, deliveryResult.method || 'brevo_api', deliveryResult.messageId || '']
      ).catch(() => {});

      await query(
        `UPDATE cancellations SET refund_status = 'refunded', refund_emailed = TRUE WHERE id = $1 OR booking_id = $1`,
        [bookingId]
      ).catch(() => {});
    } catch (logErr) {
      console.warn('[Refund Email Log Note]:', logErr.message);
    }
  }

  return deliveryResult;
}

/**
 * Generates responsive HTML email template for OTP Verification emails
 *
 * @param {Object} params
 * @param {string} params.otpCode - 6-digit OTP string
 * @param {string} [params.purpose='signup'] - 'signup' | 'login' | 'password_reset'
 * @param {string} [params.userName='Valued Guest'] - Recipient name
 * @param {string} [params.userEmail=''] - Recipient email
 * @returns {string} Fully rendered HTML email string
 */
export function generateOtpEmailHTML({ otpCode, purpose = 'signup', userName = 'Valued Guest', userEmail = '' }) {
  const cleanName = (userName || 'Valued Guest').trim();
  const cleanPurpose = String(purpose).toLowerCase().trim();

  const logoSrc = process.env.LOGO_URL || 'https://stay-in-konkan.vercel.app/assets/logo/StayIn_Konkan.png';

  let purposeTitle = 'Email Verification Code';
  let purposeDesc = 'Thank you for choosing Stay in Konkan! Please use the 6-digit verification code below to complete your email verification.';
  let badgeText = '🔐 SECURITY VERIFICATION';

  if (cleanPurpose === 'login' || cleanPurpose === 'login_otp') {
    purposeTitle = 'Login Verification Code';
    purposeDesc = 'A login attempt was requested for your Stay in Konkan account. Enter the 6-digit code below to securely sign in.';
    badgeText = '🔑 LOGIN AUTHENTICATION';
  } else if (cleanPurpose === 'password_reset' || cleanPurpose === 'reset') {
    purposeTitle = 'Password Reset Verification Code';
    purposeDesc = 'We received a request to reset the password for your Stay in Konkan account. Use the 6-digit code below to set your new password.';
    badgeText = '⚠️ PASSWORD RESET';
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${purposeTitle} - Stay in Konkan</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      background-color: #f4f6f4;
      margin: 0;
      padding: 0;
      color: #1f2937;
    }
    .email-container {
      max-width: 600px;
      margin: 30px auto;
      background-color: #ffffff;
      border-radius: 16px;
      overflow: hidden;
      box-shadow: 0 10px 30px rgba(0, 0, 0, 0.08);
      border: 1px solid #e5e7eb;
    }
    .header {
      background: linear-gradient(135deg, #1b3823 0%, #0f2315 100%);
      padding: 28px 24px;
      text-align: center;
    }
    .header-logo-card {
      background-color: #ffffff;
      display: inline-block;
      padding: 12px 24px;
      border-radius: 14px;
      box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
      margin-bottom: 8px;
    }
    .header-logo-img {
      max-height: 50px;
      width: auto;
      max-width: 240px;
      display: block;
      margin: 0 auto;
    }
    .header-subtitle {
      font-size: 11px;
      color: #a7f3d0;
      letter-spacing: 2px;
      text-transform: uppercase;
      margin-top: 6px;
    }
    .content {
      padding: 36px 32px;
    }
    .badge {
      display: inline-block;
      padding: 6px 14px;
      background-color: #f0fdf4;
      border: 1px solid #bbf7d0;
      color: #166534;
      font-size: 11px;
      font-weight: 700;
      border-radius: 20px;
      letter-spacing: 1px;
      margin-bottom: 20px;
    }
    .title {
      font-size: 24px;
      font-weight: 700;
      color: #1b3823;
      margin-top: 0;
      margin-bottom: 12px;
      font-family: Georgia, serif;
    }
    .description {
      font-size: 15px;
      line-height: 1.6;
      color: #4b5563;
      margin-bottom: 28px;
    }
    .otp-box {
      background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
      border: 2px dashed #10b981;
      border-radius: 14px;
      padding: 20px 12px;
      text-align: center;
      margin-bottom: 28px;
    }
    .otp-label {
      font-size: 11px;
      font-weight: 700;
      color: #047857;
      text-transform: uppercase;
      letter-spacing: 2px;
      margin-bottom: 8px;
    }
    .otp-code {
      font-family: 'Courier New', Courier, monospace, sans-serif;
      font-size: 30px;
      font-weight: 800;
      color: #1b3823;
      letter-spacing: 6px;
      margin: 0;
      padding: 0;
      white-space: nowrap !important;
      word-break: keep-all !important;
      word-wrap: normal !important;
      display: inline-block;
    }
    @media only screen and (max-width: 480px) {
      .content {
        padding: 24px 16px !important;
      }
      .otp-box {
        padding: 16px 6px !important;
      }
      .otp-code {
        font-size: 24px !important;
        letter-spacing: 4px !important;
      }
    }
    .expiry-note {
      font-size: 12px;
      color: #6b7280;
      margin-top: 10px;
      margin-bottom: 0;
    }
    .security-notice {
      background-color: #fffbeb;
      border-left: 4px solid #f59e0b;
      padding: 14px 16px;
      border-radius: 6px;
      font-size: 13px;
      color: #92400e;
      line-height: 1.5;
      margin-bottom: 24px;
    }
    .footer {
      background-color: #f9fafb;
      padding: 24px;
      text-align: center;
      border-top: 1px solid #f3f4f6;
      font-size: 12px;
      color: #9ca3af;
    }
    .footer a {
      color: #10b981;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="header">
      <div class="header-logo-card">
        <img src="${logoSrc}" alt="Stay in Konkan Logo" width="180" style="max-height: 48px; width: auto; max-width: 180px; display: block; margin: 0 auto; border: 0; outline: none;" />
      </div>
      <div class="header-subtitle">Authentic Coastal Living</div>
    </div>
    <div class="content">
      <div class="badge">${badgeText}</div>
      <h2 class="title">${purposeTitle}</h2>
      <p class="description">
        Hello <strong>${cleanName}</strong>,<br><br>
        ${purposeDesc}
      </p>

      <div class="otp-box">
        <div class="otp-label">Your 6-Digit Verification Code</div>
        <div class="otp-code" style="white-space: nowrap !important; word-break: keep-all !important; word-wrap: normal !important; display: inline-block;">${otpCode}</div>
        <p class="expiry-note">⏳ Valid for <strong>10 minutes</strong></p>
      </div>

      <div class="security-notice">
        <strong>🔒 Security Reminder:</strong> Never share your verification code with anyone. Stay in Konkan staff will never ask for your code or password.
      </div>

      <p class="description" style="font-size: 13px; color: #6b7280; margin-bottom: 0;">
        If you did not initiate this request, you can safely ignore this email.
      </p>
    </div>
    <div class="footer">
      &copy; ${new Date().getFullYear()} Stay in Konkan. All rights reserved.<br>
      For support, reach out to <a href="mailto:support@stayinkonkan.com">support@stayinkonkan.com</a>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Sends OTP Email via Brevo REST API v3 with SMTP fallback
 *
 * @param {Object} params
 * @param {string} params.toEmail - Target user email address
 * @param {string} params.otpCode - 6-digit OTP code string
 * @param {string} [params.purpose='signup'] - 'signup' | 'login' | 'password_reset'
 * @param {string} [params.userName='Valued Guest'] - Recipient name
 * @returns {Promise<Object>} { success: boolean, method: string, messageId?: string, message?: string }
 */
export async function sendOtpEmail({ toEmail, otpCode, purpose = 'signup', userName = 'Valued Guest' }) {
  const customerEmail = (toEmail || '').trim().toLowerCase();
  if (!customerEmail) {
    throw new Error('Missing recipient email address for OTP delivery.');
  }

  const senderEmail = process.env.BREVO_SENDER_EMAIL || process.env.SMTP_USER || process.env.GMAIL_USER || 'devnectar27@gmail.com';
  const senderName = process.env.BREVO_SENDER_NAME || 'Stay in Konkan';
  const brevoApiKey = process.env.BREVO_API_KEY;

  let subject = `Your Stay in Konkan Verification Code: ${otpCode}`;
  if (purpose === 'password_reset') {
    subject = `Reset Your Stay in Konkan Password Code: ${otpCode}`;
  } else if (purpose === 'login') {
    subject = `Your Login Verification Code: ${otpCode}`;
  }

  const htmlContent = generateOtpEmailHTML({ otpCode, purpose, userName, userEmail: customerEmail });

  let deliveryResult = { success: false, method: null, messageId: null };

  // Delivery Strategy 1: Brevo REST API v3
  if (brevoApiKey) {
    try {
      console.log(`[Brevo Email OTP] Sending OTP code email via Brevo REST API to ${customerEmail}...`);
      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': brevoApiKey,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: senderName, email: senderEmail },
          to: [{ email: customerEmail, name: userName || customerEmail }],
          subject: subject,
          htmlContent: htmlContent
        })
      });

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        const msgId = data.messageId || data.id || `<brevo_otp.${Date.now()}>`;
        console.log(`[Brevo API Success] OTP Email delivered to ${customerEmail} (MessageID: ${msgId})`);
        deliveryResult = { success: true, method: 'brevo_api', messageId: msgId };
      } else {
        console.warn(`[Brevo API Warning] OTP Status ${response.status}: ${data.message || JSON.stringify(data)}. Trying SMTP fallback...`);
      }
    } catch (brevoErr) {
      console.warn(`[Brevo API Exception] OTP delivery error: ${brevoErr.message}. Trying SMTP fallback...`);
    }
  }

  // Delivery Strategy 2: Nodemailer SMTP Fallback
  if (!deliveryResult.success) {
    const smtpHost = process.env.SMTP_HOST || (process.env.GMAIL_USER ? 'smtp.gmail.com' : 'smtp-relay.brevo.com');
    const smtpPort = Number(process.env.SMTP_PORT || 587);
    const smtpUser = process.env.SMTP_USER || process.env.GMAIL_USER || process.env.BREVO_SMTP_USER || senderEmail;
    const smtpPass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASS || process.env.BREVO_API_KEY;

    if (smtpUser && smtpPass) {
      try {
        console.log(`[Brevo Email OTP] Triggering OTP email via SMTP fallback to ${customerEmail}...`);
        const transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: { user: smtpUser, pass: smtpPass }
        });

        const info = await transporter.sendMail({
          from: `"${senderName}" <${senderEmail}>`,
          to: customerEmail,
          subject: subject,
          html: htmlContent
        });

        console.log(`[SMTP Success] OTP email delivered to ${customerEmail} (MessageID: ${info.messageId})`);
        deliveryResult = { success: true, method: 'smtp', messageId: info.messageId };
      } catch (smtpErr) {
        console.error(`[SMTP Error] OTP email delivery failed:`, smtpErr.message);
        deliveryResult = {
          success: false,
          message: `Email delivery failed: ${smtpErr.message}`
        };
      }
    }
  }

  if (!deliveryResult.success && !brevoApiKey) {
    deliveryResult = {
      success: false,
      message: 'Brevo API key is not configured on the backend server.'
    };
  }

  return deliveryResult;
}




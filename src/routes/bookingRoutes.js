import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';
import { sendBookingConfirmationEmail, sendBookingStatusEmail, sendHostBookingNotificationEmail, createHostNotification } from '../services/emailService.js';

/**
 * Helper to auto-complete past check-outs if not cancelled
 */
export const normalizeBookingStatus = (b) => {
  if (!b) return b;
  const status = String(b.status || 'confirmed').toLowerCase().trim();
  return {
    ...b,
    status: status
  };
};

const router = express.Router();

let isBookingsTableChecked = false;
const ensureBookingsTable = async () => {
  if (isBookingsTableChecked) return;
  isBookingsTableChecked = true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255),
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        guest_email VARCHAR(255),
        user_name VARCHAR(255),
        guest_name VARCHAR(255),
        user_phone VARCHAR(255),
        guest_phone VARCHAR(255),
        property_id VARCHAR(255),
        property_name VARCHAR(255),
        property_title VARCHAR(255),
        host_email VARCHAR(255),
        host_name VARCHAR(255),
        check_in VARCHAR(255),
        check_out VARCHAR(255),
        guests VARCHAR(255),
        rooms VARCHAR(100),
        total_amount VARCHAR(100),
        total_price VARCHAR(100),
        paid_amount VARCHAR(100),
        remaining_amount VARCHAR(100),
        payment_id VARCHAR(255),
        payment_status VARCHAR(100),
        status VARCHAR(50) DEFAULT 'confirmed',
        confirmation_email_sent BOOLEAN DEFAULT FALSE,
        host_email_sent BOOLEAN DEFAULT FALSE,
        last_emailed_status VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS confirmation_email_sent BOOLEAN DEFAULT FALSE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS host_email_sent BOOLEAN DEFAULT FALSE;
      ALTER TABLE bookings ADD COLUMN IF NOT EXISTS last_emailed_status VARCHAR(50);

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
    `).catch(() => {});
  } catch (err) {
    console.warn('[Bookings Table Init Note]:', err.message);
  }
};

/**
 * POST /api/bookings
 * Inserts a new booking directly into PostgreSQL database table [bookings]
 */
router.post('/', async (req, res) => {
  const { 
    id, booking_id, user_id, user_email, guest_email, user_name, guest_name, user_phone, guest_phone, 
    property_id, property_name, property_title, host_email, host_name, check_in, check_out, guests, 
    rooms, roomsCount, rooms_count, total_amount, total_price, paid_amount, payment_status, status, payment_id 
  } = req.body;

  await ensureBookingsTable();

  const finalBookingId = booking_id || id || `SIK-${Math.floor(100000 + Math.random() * 900000)}`;
  const primaryId = id || booking_id || finalBookingId;
  const userIdVal = user_id || req.body.userId || 'guest_user';

  const totalVal = Number(total_amount || total_price || 0);
  const paidVal = Number(paid_amount || totalVal);
  const remainingVal = Math.max(0, totalVal - paidVal);

  const finalUserEmail = (user_email || guest_email || req.body.email || 'guest@example.com').trim().toLowerCase();
  const finalUserName = (user_name || guest_name || 'Guest User').trim();
  const finalUserPhone = (user_phone || guest_phone || '').trim();
  const finalPropId = (property_id || 'prop_homestay').trim();
  const finalPropName = (property_name || property_title || 'Konkan Homestay').trim();
  const finalHostEmail = (host_email || req.body.owner_email || 'host@stayinkonkan.com').trim().toLowerCase();
  const finalHostName = (host_name || req.body.owner_name || 'Local Host').trim();
  const finalCheckIn = (check_in || '').trim();
  const finalCheckOut = (check_out || '').trim();

  const parseRawGuests = (g) => {
    if (typeof g === 'number') return `${g} Guests`;
    const str = String(g || '2 Guests').trim();
    return str.includes('Guest') ? str : `${str} Guests`;
  };

  const finalGuests = parseRawGuests(guests);

  const parseRawRooms = (r, guestsStr) => {
    const num = Number(r);
    if (!isNaN(num) && num > 0) return num;
    const str = String(guestsStr || guests || '').trim();
    const match = str.match(/(\d+)\s*room/i);
    if (match) {
      const parsed = parseInt(match[1], 10);
      if (!isNaN(parsed) && parsed > 0) return parsed;
    }
    return 1;
  };
  const finalRooms = parseRawRooms(rooms || roomsCount || rooms_count, guests);

  const finalStatus = (status || 'pending').trim().toLowerCase();
  const finalPaymentId = (payment_id || '').trim();
  const finalPaymentStatus = (payment_status || 'completed').trim().toLowerCase();

  try {
    const rawSql = `
      INSERT INTO bookings (
        id, booking_id, user_email, user_name, user_phone, property_id, property_name, host_email, host_name, check_in, check_out, guests, rooms, total_amount, paid_amount, remaining_amount, payment_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (id) DO UPDATE SET
        booking_id = EXCLUDED.booking_id,
        user_email = EXCLUDED.user_email,
        user_name = EXCLUDED.user_name,
        user_phone = EXCLUDED.user_phone,
        property_id = EXCLUDED.property_id,
        property_name = EXCLUDED.property_name,
        host_email = EXCLUDED.host_email,
        host_name = EXCLUDED.host_name,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        guests = EXCLUDED.guests,
        rooms = EXCLUDED.rooms,
        total_amount = EXCLUDED.total_amount,
        paid_amount = EXCLUDED.paid_amount,
        remaining_amount = EXCLUDED.remaining_amount,
        payment_id = EXCLUDED.payment_id,
        status = CASE 
          WHEN bookings.status IS NOT NULL AND LOWER(bookings.status) NOT IN ('', 'pending') THEN bookings.status 
          ELSE EXCLUDED.status 
        END
      RETURNING *;
    `;

    const params = [
      primaryId,
      finalBookingId,
      finalUserEmail,
      finalUserName,
      finalUserPhone,
      finalPropId,
      finalPropName,
      finalHostEmail,
      finalHostName,
      finalCheckIn,
      finalCheckOut,
      finalGuests,
      finalRooms,
      totalVal.toString(),
      paidVal.toString(),
      remainingVal.toString(),
      finalPaymentId,
      finalStatus
    ];

    const result = await query(rawSql, params);

    const createdBooking = (result && result.rows && result.rows[0])
      ? result.rows[0]
      : {
          id: primaryId,
          booking_id: finalBookingId,
          user_email: finalUserEmail,
          user_name: finalUserName,
          user_phone: finalUserPhone,
          property_id: finalPropId,
          property_name: finalPropName,
          check_in: finalCheckIn,
          check_out: finalCheckOut,
          guests: finalGuests,
          rooms: finalRooms,
          total_amount: totalVal,
          paid_amount: paidVal,
          status: finalStatus
        };

    // Condition-based status email trigger upon booking creation
    try {
      const mergedBooking = { ...req.body, ...createdBooking };
      const isBackgroundSync = Boolean(req.body.is_background_sync || req.body._isSyncing);
      const emailRes = await sendBookingStatusEmail(mergedBooking, null, { force: !isBackgroundSync });
      if (emailRes && emailRes.success && !emailRes.skipped) {
        createdBooking.confirmation_email_sent = true;
      }
    } catch (emailErr) {
      console.error(`[Brevo Email Failure] Status email failed for new booking ID: ${finalBookingId}. Error:`, emailErr.message);
    }

    // Automatically trigger host email notification and in-app host alert (non-blocking)
    try {
      const mergedBooking = { ...req.body, ...createdBooking };
      sendHostBookingNotificationEmail(mergedBooking).catch(hErr => {
        console.error(`[Host Email Alert Error] ID: ${finalBookingId}.`, hErr.message);
      });
      createHostNotification(mergedBooking).catch(nErr => {
        console.error(`[Host In-App Notification Error] ID: ${finalBookingId}.`, nErr.message);
      });
    } catch (hTriggerErr) {
      console.warn('[Host Notification Trigger Note]:', hTriggerErr.message);
    }

    return res.json({ 
      success: true, 
      message: 'Booking created successfully in PostgreSQL database!', 
      booking: createdBooking
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * POST /api/bookings/send-test-email
 * Test endpoint to trigger a Brevo confirmation email directly
 */
router.post('/send-test-email', async (req, res) => {
  const { email, name, booking_id, property_name } = req.body;
  const testBooking = {
    booking_id: booking_id || `SIK-TEST-${Math.floor(100000 + Math.random() * 900000)}`,
    user_email: email || 'devnectar27@gmail.com',
    user_name: name || 'Test Guest',
    user_phone: '+91 98221 14455',
    property_name: property_name || 'Tarkarli Samudra Sparsh Beach Villa',
    location: 'Tarkarli Beach, Malvan',
    check_in: '2026-10-10',
    check_out: '2026-10-12',
    guests: '2 Guests',
    rooms: 1,
    total_amount: 3500,
    paid_amount: 3500,
    status: 'Confirmed'
  };

  const result = await sendBookingConfirmationEmail(testBooking);
  return res.json({ success: result.success, result, booking: testBooking });
});

/**
 * POST /api/bookings/:id/send-email
 * Trigger or resend confirmation email for an existing booking
 */
router.post('/:id/send-email', async (req, res) => {
  const { id } = req.params;
  const cleanId = (id || '').trim();

  try {
    await ensureBookingsTable();
    const querySql = `
      SELECT * FROM bookings
      WHERE LOWER(id) = LOWER($1)
         OR LOWER(booking_id) = LOWER($1)
         OR LOWER(payment_id) = LOWER($1)
         OR LOWER(REPLACE(id, 'sik-', '')) = LOWER(REPLACE($1, 'sik-', ''))
         OR LOWER(REPLACE(booking_id, 'sik-', '')) = LOWER(REPLACE($1, 'sik-', ''))
      LIMIT 1;
    `;
    const bkRes = await query(querySql, [cleanId]);

    let bookingObj = (bkRes && bkRes.rows && bkRes.rows.length > 0) ? bkRes.rows[0] : null;

    // Fallback: allow passing booking object in request body if not found in DB
    if (!bookingObj && req.body && (req.body.user_email || req.body.guestEmail || req.body.email)) {
      bookingObj = req.body;
    }

    if (!bookingObj) {
      return res.status(404).json({ success: false, message: `Booking ID '${cleanId}' not found.` });
    }

    const emailRes = await sendBookingStatusEmail(bookingObj, null, { force: true });

    if (emailRes && emailRes.success) {
      await query('UPDATE bookings SET confirmation_email_sent = TRUE WHERE id = $1 OR booking_id = $1', [bookingObj.id || cleanId]).catch(() => {});
      return res.json({
        success: true,
        message: `Confirmation email sent to ${bookingObj.user_email || bookingObj.guestEmail || bookingObj.email}!`,
        result: emailRes
      });
    } else {
      return res.status(500).json({
        success: false,
        message: emailRes.message || 'Email delivery failed.',
        details: emailRes.details || emailRes.error
      });
    }
  } catch (err) {
    console.error('Resend email endpoint error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

/**
 * GET /api/bookings/user/:userEmail
 * Fetch all bookings for a user by email or name directly from PostgreSQL database
 */
router.get('/user/:userEmail', async (req, res) => {
  const { userEmail } = req.params;

  try {
    await ensureBookingsTable();
    const cleanParam = (userEmail || '').trim().toLowerCase();
    const rawSql = `
      SELECT * FROM bookings
      WHERE LOWER(COALESCE(user_email, '')) = $1
         OR LOWER(COALESCE(guest_email, '')) = $1
         OR LOWER(COALESCE(user_name, '')) = $1
         OR LOWER(COALESCE(guest_name, '')) = $1
         OR id = $1
         OR booking_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await query(rawSql, [cleanParam]);
    const cleanRows = (result?.rows || []).map(normalizeBookingStatus);

    return res.json({ success: true, count: cleanRows.length, bookings: cleanRows });
  } catch (error) {
    console.error('Fetch user bookings error:', error);
    return res.json({ success: true, count: 0, bookings: [] });
  }
});

/**
 * GET /api/bookings/host/:hostEmail
 * Fetch bookings for properties created by/belonging to a specific host
 */
router.get('/host/:hostEmail', async (req, res) => {
  const { hostEmail } = req.params;

  try {
    await ensureBookingsTable();
    const rawSql = `
      SELECT * FROM bookings
      WHERE LOWER(host_email) = LOWER($1) OR LOWER(user_email) = LOWER($1)
      ORDER BY created_at DESC;
    `;
    const result = await query(rawSql, [hostEmail]);
    const cleanRows = (result?.rows || []).map(normalizeBookingStatus);

    return res.json({ success: true, count: cleanRows.length, bookings: cleanRows });
  } catch (error) {
    console.error('Fetch host bookings error:', error);
    return res.json({ success: true, count: 0, bookings: [] });
  }
});

/**
 * GET /api/bookings/all
 * Fetch ALL bookings across all stays for Admin Dashboard
 */
router.get('/all', async (req, res) => {
  try {
    await ensureBookingsTable();
    const rawSql = `
      SELECT * FROM bookings
      ORDER BY created_at DESC;
    `;
    const result = await query(rawSql);
    const cleanRows = (result?.rows || []).map(normalizeBookingStatus);
    return res.json({ success: true, count: cleanRows.length, bookings: cleanRows });
  } catch (error) {
    console.error('Fetch all bookings error:', error);
    return res.json({ success: true, count: 0, bookings: [] });
  }
});

/**
 * PUT /api/bookings/:id/status
 * Update booking status (confirm / reject / pending)
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const cleanId = (id || '').trim();
  const digitsOnly = cleanId.replace(/\D/g, '');

  try {
    await ensureBookingsTable();

    // 1. Fetch existing booking first to check previous status (for duplicate email prevention)
    let oldStatus = null;
    try {
      const fetchOldRes = await query(
        `SELECT * FROM bookings
         WHERE LOWER(id) = LOWER($1)
            OR LOWER(booking_id) = LOWER($1)
            OR LOWER(payment_id) = LOWER($1)
            OR REPLACE(LOWER(id), 'sik-', '') = REPLACE(LOWER($1), 'sik-', '')
            OR REPLACE(LOWER(booking_id), 'sik-', '') = REPLACE(LOWER($1), 'sik-', '')
         LIMIT 1`,
        [cleanId]
      );
      if (fetchOldRes && fetchOldRes.rows && fetchOldRes.rows.length > 0) {
        oldStatus = fetchOldRes.rows[0].status;
      }
    } catch (fErr) {}

    // 2. Perform status update in database
    const rawSql = `
      UPDATE bookings
      SET status = $1
      WHERE LOWER(id) = LOWER($2)
         OR LOWER(booking_id) = LOWER($2)
         OR LOWER(payment_id) = LOWER($2)
         OR REPLACE(LOWER(id), 'sik-', '') = REPLACE(LOWER($2), 'sik-', '')
         OR REPLACE(LOWER(booking_id), 'sik-', '') = REPLACE(LOWER($2), 'sik-', '')
      RETURNING *;
    `;
    let updateResult = await query(rawSql, [status.toLowerCase().trim(), cleanId]);
    if ((!updateResult || !updateResult.rows || updateResult.rows.length === 0) && digitsOnly) {
      const fallbackSql = `
        UPDATE bookings
        SET status = $1
        WHERE id LIKE '%' || $2 || '%' OR booking_id LIKE '%' || $2 || '%'
        RETURNING *;
      `;
      updateResult = await query(fallbackSql, [status.toLowerCase().trim(), digitsOnly]);
    }

    let updatedBooking = updateResult?.rows?.[0] || null;

    // Fallback: If not in DB yet but request body has booking info, upsert it into bookings table
    if (!updatedBooking && req.body) {
      const bData = req.body;
      const bEmail = bData.user_email || bData.guestEmail || bData.email;
      if (bEmail) {
        try {
          const insertSql = `
            INSERT INTO bookings (
              id, booking_id, user_email, user_name, user_phone, property_name, check_in, check_out, guests, total_amount, paid_amount, status, created_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
            ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status
            RETURNING *;
          `;
          const insRes = await query(insertSql, [
            cleanId,
            bData.booking_id || bData.bookingId || cleanId,
            (bEmail || '').trim().toLowerCase(),
            bData.user_name || bData.guestName || bData.name || 'Guest User',
            bData.user_phone || bData.guestPhone || bData.guestMobile || '',
            bData.property_name || bData.property || bData.propertyName || 'Konkan Homestay',
            bData.check_in || bData.checkIn || '',
            bData.check_out || bData.checkOut || '',
            String(bData.guests || '2 Guests'),
            String(bData.total_amount || bData.total || 0),
            String(bData.paid_amount || bData.paid || 0),
            status.toLowerCase().trim()
          ]);
          if (insRes && insRes.rows && insRes.rows.length > 0) {
            updatedBooking = insRes.rows[0];
          }
        } catch (insErr) {
          console.warn('[Upsert Fallback Note]:', insErr.message);
        }
      }
    }

    // 3. Condition-based automatic email trigger (prevents duplicates if status unchanged)
    if (updatedBooking) {
      try {
        console.log(`[Status Update API] Triggering automatic email for booking ID '${cleanId}' (old: '${oldStatus}' -> new: '${status}')`);
        await sendBookingStatusEmail(updatedBooking, oldStatus);

        const cleanSt = String(status || '').toLowerCase().trim();
        if (cleanSt === 'confirmed' || cleanSt === 'approved') {
          sendHostBookingNotificationEmail(updatedBooking).catch(hErr => {
            console.error(`[Host Email Status Alert Error]:`, hErr.message);
          });
          createHostNotification(updatedBooking).catch(nErr => {
            console.error(`[Host Notification Status Alert Error]:`, nErr.message);
          });
        }
      } catch (emailErr) {
        console.error(`[Email Trigger Exception] Booking status email failed for ID: ${cleanId}.`, emailErr.message);
      }
    } else {
      console.warn(`[Status Update API] No booking record found/updated for ID: ${cleanId}. Status email skipped.`);
    }

    // If status is updated to cancelled, check and auto-create cancellation records
    if (status === 'cancelled') {
      try {
        const bookingRes = await query(
          'SELECT * FROM bookings WHERE id = $1 OR booking_id = $1 OR payment_id = $1',
          [id]
        );
        if (bookingRes && bookingRes.rows && bookingRes.rows.length > 0) {
          const booking = bookingRes.rows[0];
          const bookingId = booking.booking_id || booking.id;

          // Check if cancellation already exists
          const cancelRes = await query(
            'SELECT * FROM cancellations WHERE booking_id = $1 OR id = $2',
            [bookingId, booking.id]
          );

          if (!cancelRes || !cancelRes.rows || cancelRes.rows.length === 0) {
            const cncId = `CNC-${Math.floor(100000 + Math.random() * 900000)}`;
            const paidAmount = parseFloat(booking.paid_amount || booking.total_price || booking.price || 0);
            const hostRefundPct = 80;
            const hostRefundAmt = Math.round(paidAmount * 0.80);

            // Insert into cancel_bookings
            await query(
              `INSERT INTO cancel_bookings (
                id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, cancellation_reason, status, refund_status, created_at, updated_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW(), NOW())`,
              [
                cncId,
                bookingId,
                booking.user_email || 'guest@example.com',
                booking.user_name || 'Guest User',
                booking.property_name || 'Konkan Homestay',
                booking.check_in || '',
                booking.check_out || '',
                paidAmount,
                hostRefundAmt,
                hostRefundPct,
                'Cancelled by Host (80% Refund Policy)',
                'approved'
              ]
            );

            // Insert into cancellations
            await query(
              `INSERT INTO cancellations (
                id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, cancellation_reason, status, refund_status, created_at
              ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', NOW())
              ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status, refund_amount = EXCLUDED.refund_amount`,
              [
                cncId,
                bookingId,
                booking.user_email || 'guest@example.com',
                booking.user_name || 'Guest User',
                booking.property_name || 'Konkan Homestay',
                booking.check_in || '',
                booking.check_out || '',
                paidAmount,
                hostRefundAmt,
                hostRefundPct,
                'Cancelled by Host (80% Refund Policy)',
                'approved'
              ]
            );
          }
        }
      } catch (cncErr) {
        console.error('Error auto-creating cancellation record:', cncErr);
      }
    }

    return res.json({
      success: true,
      message: `Booking status updated to ${status}`,
      booking: updatedBooking
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/bookings/host-notifications/:email
 * Fetch in-app notifications for a property host by email
 */
router.get('/host-notifications/:email', async (req, res) => {
  const { email } = req.params;
  const cleanEmail = String(email || '').trim().toLowerCase();

  try {
    await ensureBookingsTable();
    const result = await query(
      'SELECT * FROM host_notifications WHERE LOWER(host_email) = LOWER($1) ORDER BY created_at DESC LIMIT 50',
      [cleanEmail]
    );

    const unreadCount = (result.rows || []).filter(n => !n.is_read).length;

    return res.json({
      success: true,
      count: result.rows.length,
      unreadCount,
      notifications: result.rows
    });
  } catch (error) {
    console.error('Fetch host notifications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/bookings/host-notifications/:id/read
 * Mark a host notification as read
 */
router.put('/host-notifications/:id/read', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureBookingsTable();
    await query('UPDATE host_notifications SET is_read = TRUE WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Notification marked as read.' });
  } catch (error) {
    console.error('Mark notification read error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/bookings/host-notifications/read-all
 * Mark all notifications for a host email as read
 */
router.put('/host-notifications/read-all', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ success: false, message: 'Host email is required.' });
  try {
    await ensureBookingsTable();
    await query('UPDATE host_notifications SET is_read = TRUE WHERE LOWER(host_email) = LOWER($1)', [email.trim().toLowerCase()]);
    return res.json({ success: true, message: 'All notifications marked as read.' });
  } catch (error) {
    console.error('Mark all notifications read error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/bookings/send-test-host-email
 * Test endpoint to trigger a Brevo host booking notification email directly
 */
router.post('/send-test-host-email', async (req, res) => {
  const { hostEmail, guestName, propertyName, bookingId } = req.body;
  const testBooking = {
    booking_id: bookingId || `SIK-HOST-${Math.floor(100000 + Math.random() * 900000)}`,
    host_email: hostEmail || 'devnectar27@gmail.com',
    host_name: 'Test Host Partner',
    user_email: 'guest.demo@example.com',
    user_name: guestName || 'Rahul Sharma',
    user_phone: '+91 98221 14455',
    property_name: propertyName || 'Tarkarli Samudra Sparsh Beach Villa',
    check_in: '2026-11-01',
    check_out: '2026-11-04',
    guests: '3 Guests',
    rooms: 1,
    total_amount: 7500,
    paid_amount: 7500,
    status: 'Confirmed'
  };

  try {
    const emailRes = await sendHostBookingNotificationEmail(testBooking, { force: true });
    const notifRes = await createHostNotification(testBooking);
    return res.json({
      success: true,
      message: 'Host booking notification email & in-app alert triggered successfully',
      emailResult: emailRes,
      notificationResult: notifRes,
      booking: testBooking
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * DELETE /api/bookings/:id
 * Delete a booking record from database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureBookingsTable();
    await query('DELETE FROM bookings WHERE id = $1 OR booking_id = $1', [id]);
    return res.json({ success: true, message: `Booking ${id} deleted successfully.` });
  } catch (error) {
    console.error('Delete booking error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

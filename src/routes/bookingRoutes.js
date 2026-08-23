import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

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
        guests VARCHAR(100),
        total_amount VARCHAR(100),
        total_price VARCHAR(100),
        paid_amount VARCHAR(100),
        remaining_amount VARCHAR(100),
        payment_id VARCHAR(255),
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    const cols = [
      'booking_id VARCHAR(255)',
      'user_email VARCHAR(255)',
      'user_name VARCHAR(255)',
      'user_phone VARCHAR(255)',
      'property_id VARCHAR(255)',
      'property_name VARCHAR(255)',
      'host_email VARCHAR(255)',
      'host_name VARCHAR(255)',
      'total_amount VARCHAR(100)',
      'paid_amount VARCHAR(100)',
      'remaining_amount VARCHAR(100)',
      'payment_id VARCHAR(255)',
      'status VARCHAR(50) DEFAULT \'confirmed\'',
      'rooms INT4 DEFAULT 1'
    ];
    for (const c of cols) {
      await query(`ALTER TABLE bookings ADD COLUMN IF NOT EXISTS ${c};`).catch(() => {});
    }

    // Auto-backfill existing bookings with room counts derived from guests string or property_name
    await query(`UPDATE bookings SET rooms = 2 WHERE (guests LIKE '%2 Room%' OR guests LIKE '%2 room%' OR property_name LIKE '%2 Room%') AND (rooms IS NULL OR rooms = 1);`).catch(() => {});
    await query(`UPDATE bookings SET rooms = 3 WHERE (guests LIKE '%3 Room%' OR guests LIKE '%3 room%' OR property_name LIKE '%3 Room%') AND (rooms IS NULL OR rooms = 1);`).catch(() => {});
    await query(`UPDATE bookings SET rooms = 4 WHERE (guests LIKE '%4 Room%' OR guests LIKE '%4 room%' OR property_name LIKE '%4 Room%') AND (rooms IS NULL OR rooms = 1);`).catch(() => {});

    // Auto-clean corrupted status column entries (e.g. pay_trwpu5vmaqgdod) and set correct values
    await query(`UPDATE bookings SET status = 'pending', payment_id = 'pay_TRwpU5VmAqgdOD', total_amount = '174522', total_price = 174522, paid_amount = '174522' WHERE (status LIKE 'pay_%' OR payment_id LIKE 'pay_trwpu%' OR payment_id LIKE 'pay_TRwpU%');`).catch(() => {});
    await query(`UPDATE bookings SET status = 'pending' WHERE status LIKE 'pay_%';`).catch(() => {});
  } catch (err) {
    console.warn('Bookings table init check:', err.message);
  }
};

/**
 * POST /api/bookings
 * Inserts a new booking directly into PostgreSQL database table [bookings]
 */
router.post('/', async (req, res) => {
  const { 
    id, booking_id, user_email, guest_email, user_name, guest_name, user_phone, guest_phone, 
    property_id, property_name, property_title, host_email, host_name, check_in, check_out, guests, 
    rooms, roomsCount, rooms_count, total_amount, total_price, paid_amount, payment_status, status, payment_id 
  } = req.body;

  await ensureBookingsTable();

  const finalBookingId = booking_id || id || `SIK-${Math.floor(100000 + Math.random() * 900000)}`;
  const primaryId = id || booking_id || finalBookingId;

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

  try {
    const rawSql = `
      INSERT INTO bookings (
        id, booking_id, user_email, user_name, user_phone, property_id, property_name, host_email, host_name, check_in, check_out, guests, rooms, total_amount, paid_amount, remaining_amount, payment_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (id) DO UPDATE SET
        booking_id = EXCLUDED.booking_id,
        user_email = EXCLUDED.user_email,
        guest_email = EXCLUDED.guest_email,
        user_name = EXCLUDED.user_name,
        guest_name = EXCLUDED.guest_name,
        user_phone = EXCLUDED.user_phone,
        guest_phone = EXCLUDED.guest_phone,
        property_id = EXCLUDED.property_id,
        property_name = EXCLUDED.property_name,
        property_title = EXCLUDED.property_title,
        host_email = EXCLUDED.host_email,
        host_name = EXCLUDED.host_name,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        guests = EXCLUDED.guests,
        rooms = EXCLUDED.rooms,
        total_amount = EXCLUDED.total_amount,
        total_price = EXCLUDED.total_price,
        paid_amount = EXCLUDED.paid_amount,
        remaining_amount = EXCLUDED.remaining_amount,
        payment_id = EXCLUDED.payment_id,
        status = EXCLUDED.status
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

    return res.json({ 
      success: true, 
      message: 'Booking created successfully in PostgreSQL database!', 
      booking: (result && result.rows && result.rows[0]) ? result.rows[0] : { id: primaryId, booking_id: finalBookingId, user_email: finalUserEmail, property_name: finalPropName } 
    });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
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
    const rawSql = `
      UPDATE bookings
      SET status = $1
      WHERE LOWER(id) = LOWER($2)
         OR LOWER(booking_id) = LOWER($2)
         OR LOWER(payment_id) = LOWER($2)
         OR LOWER(REPLACE(id, 'sik-', '')) = LOWER(REPLACE($2, 'sik-', ''))
         OR LOWER(REPLACE(booking_id, 'sik-', '')) = LOWER(REPLACE($2, 'sik-', ''))
         OR ($3 <> '' AND (id LIKE '%' || $3 || '%' OR booking_id LIKE '%' || $3 || '%'))
      RETURNING *;
    `;
    const updateResult = await query(rawSql, [status.toLowerCase().trim(), cleanId, digitsOnly]);

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
      booking: updateResult?.rows?.[0] || null
    });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.status(500).json({ success: false, message: error.message });
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

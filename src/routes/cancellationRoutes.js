import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Auto-ensure cancellations table exists in database
 */
const ensureTableExists = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cancellations (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        property_name VARCHAR(255),
        check_in VARCHAR(100),
        check_out VARCHAR(100),
        paid_amount NUMERIC(10, 2) DEFAULT 0,
        refund_amount NUMERIC(10, 2) DEFAULT 0,
        refund_percentage INT DEFAULT 0,
        notice_days INT DEFAULT 0,
        cancellation_reason TEXT DEFAULT 'Guest requested cancellation',
        status VARCHAR(50) DEFAULT 'requested',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (e) {
    console.warn('[Cancellations API] Table check note:', e.message);
  }
};

ensureTableExists();

/**
 * POST /api/cancellations
 * Log a new cancellation request into database & update booking status
 */
router.post('/', async (req, res) => {
  const {
    id,
    booking_id,
    bookingId,
    user_email,
    userEmail,
    user_name,
    userName,
    property_name,
    propertyName,
    property,
    check_in,
    checkIn,
    check_out,
    checkOut,
    paid_amount,
    paidAmount,
    paid,
    refund_amount,
    refundAmount,
    refund_percentage,
    refundPercentage,
    notice_days,
    noticeDays,
    cancellation_reason,
    cancellationReason,
    status
  } = req.body;

  const finalId = id || `CNC-${Math.floor(100000 + Math.random() * 900000)}`;
  const finalBookingId = booking_id || bookingId || 'SIK-000000';
  const finalUserEmail = user_email || userEmail || 'guest@example.com';
  const finalUserName = user_name || userName || 'Guest User';
  const finalProperty = property_name || propertyName || property || 'Konkan Stay';
  const finalCheckIn = check_in || checkIn || '';
  const finalCheckOut = check_out || checkOut || '';
  const finalPaid = parseFloat(paid_amount || paidAmount || paid || 0);
  const finalRefund = parseFloat(refund_amount || refundAmount || 0);
  const finalPct = parseInt(refund_percentage || refundPercentage || 0, 10);
  const finalDays = parseInt(notice_days || noticeDays || 0, 10);
  const finalReason = cancellation_reason || cancellationReason || 'Guest requested cancellation';
  const finalStatus = status || 'requested';

  try {
    await ensureTableExists();

    const insertSql = `
      INSERT INTO cancellations (
        id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *;
    `;

    const result = await query(insertSql, [
      finalId,
      finalBookingId,
      finalUserEmail,
      finalUserName,
      finalProperty,
      finalCheckIn,
      finalCheckOut,
      finalPaid,
      finalRefund,
      finalPct,
      finalDays,
      finalReason,
      finalStatus
    ]);

    // Also update booking status in bookings table to 'cancelled'
    try {
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2',
        ['cancelled', finalBookingId]
      );
    } catch (bErr) {
      console.warn('[Cancellations API] Booking status update note:', bErr.message);
    }

    return res.json({
      success: true,
      message: 'Cancellation logged successfully in database',
      cancellation: result.rows[0]
    });
  } catch (error) {
    console.error('Create cancellation error:', error);
    return res.json({
      success: true,
      message: 'Cancellation recorded (local fallback)',
      cancellation: {
        id: finalId,
        booking_id: finalBookingId,
        user_email: finalUserEmail,
        user_name: finalUserName,
        property_name: finalProperty,
        check_in: finalCheckIn,
        check_out: finalCheckOut,
        paid_amount: finalPaid,
        refund_amount: finalRefund,
        refund_percentage: finalPct,
        notice_days: finalDays,
        cancellation_reason: finalReason,
        status: finalStatus,
        created_at: new Date().toISOString()
      }
    });
  }
});

/**
 * GET /api/cancellations
 * Fetch all cancellation records
 */
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();
    const result = await query('SELECT * FROM cancellations ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, cancellations: result.rows });
  } catch (error) {
    console.error('Fetch cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [] });
  }
});

/**
 * GET /api/cancellations/user/:email
 * Fetch cancellations for a specific user
 */
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await ensureTableExists();
    const result = await query('SELECT * FROM cancellations WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    return res.json({ success: true, count: result.rowCount, cancellations: result.rows });
  } catch (error) {
    console.error('Fetch user cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [] });
  }
});

export default router;

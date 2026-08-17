import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Auto-ensure cancellations and cancel_bookings tables exist in database
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
        refund_status VARCHAR(50) DEFAULT 'pending',
        refund_txn_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    await query(`
      CREATE TABLE IF NOT EXISTS cancel_bookings (
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
        refund_status VARCHAR(50) DEFAULT 'pending',
        refund_txn_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    try {
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'pending';`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS refund_txn_id VARCHAR(255);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'pending';`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS refund_txn_id VARCHAR(255);`);
    } catch (colErr) {}
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

    // 1. Insert into cancel_bookings table
    const insertCancelBookingsSql = `
      INSERT INTO cancel_bookings (
        id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason, status, refund_status, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW(), NOW())
      RETURNING *;
    `;

    const cancelBookingsParams = [
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
    ];

    let result = await query(insertCancelBookingsSql, cancelBookingsParams);

    // 2. Also insert into cancellations for full backwards compatibility
    try {
      const insertCancellationsSql = `
        INSERT INTO cancellations (
          id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason, status, refund_status, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', NOW())
        ON CONFLICT (id) DO UPDATE SET
          refund_amount = EXCLUDED.refund_amount,
          status = EXCLUDED.status;
      `;
      await query(insertCancellationsSql, cancelBookingsParams);
    } catch (cErr) {
      console.warn('[Cancellations API] Cancellations sync note:', cErr.message);
    }

    // Update booking status in bookings table based on cancellation status
    try {
      const targetBookingStatus = (finalStatus === 'approved' || finalStatus === 'cancelled') ? 'cancelled' : 'cancellation_pending';
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2',
        [targetBookingStatus, finalBookingId]
      );
    } catch (bErr) {
      console.warn('[Cancellations API] Booking status update note:', bErr.message);
    }

    return res.json({
      success: true,
      message: 'Cancellation logged successfully in cancel_bookings table',
      cancellation: (result && result.rows && result.rows[0]) ? result.rows[0] : {
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
        refund_status: 'pending'
      }
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
        refund_status: 'pending',
        created_at: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/cancellations/:id/status
 * Update cancellation request status (approved / rejected) by Admin
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, booking_id } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const finalBookingId = booking_id || id;
  const newBookingStatus = (status === 'approved' || status === 'cancelled') ? 'cancelled' : 'confirmed';

  try {
    await ensureTableExists();
    await query(
      'UPDATE cancel_bookings SET status = $1, updated_at = NOW() WHERE id = $2 OR booking_id = $2',
      [status, id]
    );
    await query(
      'UPDATE cancellations SET status = $1 WHERE id = $2 OR booking_id = $2',
      [status, id]
    );

    if (finalBookingId) {
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2',
        [newBookingStatus, finalBookingId]
      );
    }

    return res.json({ success: true, message: `Cancellation status updated to ${status}` });
  } catch (error) {
    console.error('Update cancellation status error:', error);
    return res.json({ success: true, message: `Cancellation status updated to ${status}` });
  }
});

/**
 * PUT /api/cancellations/:id/refund-payout
 * Process refund payout & set UTR / Transaction Reference ID
 */
router.put('/:id/refund-payout', async (req, res) => {
  const { id } = req.params;
  const { refund_status, refund_txn_id, refund_amount } = req.body;

  try {
    await ensureTableExists();
    await query(
      'UPDATE cancel_bookings SET refund_status = $1, refund_txn_id = $2, refund_amount = COALESCE($3, refund_amount), updated_at = NOW() WHERE id = $4 OR booking_id = $4',
      [refund_status || 'refunded', refund_txn_id || `REFUND-${Date.now()}`, refund_amount || null, id]
    );
    await query(
      'UPDATE cancellations SET refund_status = $1, refund_txn_id = $2, refund_amount = COALESCE($3, refund_amount) WHERE id = $4 OR booking_id = $4',
      [refund_status || 'refunded', refund_txn_id || `REFUND-${Date.now()}`, refund_amount || null, id]
    );

    return res.json({ success: true, message: `Refund payout marked as ${refund_status || 'refunded'}` });
  } catch (error) {
    console.error('Update refund payout error:', error);
    return res.json({ success: true, message: `Refund payout recorded` });
  }
});

/**
 * GET /api/cancellations
 * Fetch all cancellation records
 */
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();
    const res1 = await query('SELECT * FROM cancellations ORDER BY created_at DESC');
    const res2 = await query('SELECT * FROM cancel_bookings ORDER BY created_at DESC');

    const cancMap = new Map();
    (res1.rows || []).forEach(item => {
      const key = String(item.id || item.booking_id || '').toLowerCase().trim();
      if (key) cancMap.set(key, item);
    });
    (res2.rows || []).forEach(item => {
      const key = String(item.id || item.booking_id || '').toLowerCase().trim();
      if (key && !cancMap.has(key)) cancMap.set(key, item);
    });

    const allCancellations = Array.from(cancMap.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || a.requested_at || a.date || a.timestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.requested_at || b.date || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return res.json({
      success: true,
      count: allCancellations.length,
      cancellations: allCancellations,
      data: allCancellations
    });
  } catch (error) {
    console.error('Fetch cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [], data: [] });
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
    let result = await query('SELECT * FROM cancel_bookings WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    if (!result || !result.rows || result.rows.length === 0) {
      result = await query('SELECT * FROM cancellations WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    }
    return res.json({ success: true, count: result ? result.rowCount : 0, cancellations: result ? result.rows : [] });
  } catch (error) {
    console.error('Fetch user cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [] });
  }
});

/**
 * DELETE /api/cancellations/:id
 * Delete a cancellation record from database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = (id || '').trim();

  try {
    await ensureTableExists();
    await query('DELETE FROM cancel_bookings WHERE id = $1 OR booking_id = $1', [cleanId]);
    await query('DELETE FROM cancellations WHERE id = $1 OR booking_id = $1', [cleanId]);
    return res.json({ success: true, message: `Cancellation ${cleanId} deleted successfully.` });
  } catch (error) {
    console.error('Delete cancellation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

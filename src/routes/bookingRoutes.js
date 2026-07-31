import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/bookings
 * Raw SQL query to insert a new booking
 */
router.post('/', async (req, res) => {
  const { 
    id, booking_id, user_email, guest_email, user_name, guest_name, user_phone, guest_phone, 
    property_name, property_title, check_in, check_out, guests, total_amount, total_price, 
    paid_amount, payment_status, status, payment_id 
  } = req.body;

  const finalBookingId = booking_id || id || `SIK-${Math.floor(100000 + Math.random() * 900000)}`;
  const uuid = crypto.randomUUID();

  try {
    const rawSql = `
      INSERT INTO bookings (
        id, booking_id, user_email, user_name, user_phone, property_name, check_in, check_out, guests, total_amount, paid_amount, remaining_amount, payment_id, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
      RETURNING *;
    `;

    const total = total_amount || total_price || 0;
    const paid = paid_amount || total;
    const remaining = Math.max(0, total - paid);

    const params = [
      uuid,
      finalBookingId,
      user_email || guest_email || 'guest@example.com',
      user_name || guest_name || 'Guest User',
      user_phone || guest_phone || null,
      property_name || property_title || 'Konkan Heritage Stay',
      check_in || '',
      check_out || '',
      guests || '2 Guests',
      total.toString(),
      paid.toString(),
      remaining.toString(),
      payment_id || null,
      status || payment_status || 'confirmed'
    ];

    const result = await query(rawSql, params);

    return res.json({ success: true, message: 'Booking created successfully', booking: result.rows[0] });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/bookings/user/:userEmail
 * Raw SQL query to fetch all bookings for a user by email
 */
router.get('/user/:userEmail', async (req, res) => {
  const { userEmail } = req.params;

  try {
    const rawSql = `
      SELECT * FROM bookings
      WHERE LOWER(user_email) = LOWER($1) OR id = $1 OR booking_id = $1
      ORDER BY created_at DESC;
    `;
    const result = await query(rawSql, [userEmail]);

    return res.json({ success: true, count: result.rowCount, bookings: result.rows });
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
    const rawSql = `
      SELECT DISTINCT b.* FROM bookings b
      LEFT JOIN properties p ON LOWER(b.property_name) LIKE CONCAT('%', LOWER(p.name), '%') OR LOWER(b.property_name) LIKE CONCAT('%', LOWER(p.title), '%') OR LOWER(p.name) LIKE CONCAT('%', LOWER(b.property_name), '%')
      WHERE LOWER(p.host_email) = LOWER($1) OR LOWER(p.owner_email) = LOWER($1) OR LOWER(b.host_email) = LOWER($1) OR LOWER(b.user_email) = LOWER($1)
      ORDER BY b.created_at DESC;
    `;
    const result = await query(rawSql, [hostEmail]);

    return res.json({ success: true, count: result.rowCount, bookings: result.rows });
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
    const rawSql = `
      SELECT * FROM bookings
      ORDER BY created_at DESC;
    `;
    const result = await query(rawSql);
    return res.json({ success: true, count: result.rowCount, bookings: result.rows });
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

  try {
    await query(
      'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2',
      [status, id]
    );
    return res.json({ success: true, message: `Booking ${id} status updated to ${status}.` });
  } catch (error) {
    console.error('Update booking status error:', error);
    return res.json({ success: true, message: `Booking ${id} status set to ${status}.` });
  }
});

export default router;

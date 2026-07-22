import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/bookings
 * Raw SQL query to insert a new booking
 */
router.post('/', async (req, res) => {
  const { user_id, property_id, check_in, check_out, guests, total_price, payment_status } = req.body;

  if (!user_id || !property_id || !check_in || !check_out) {
    return res.status(400).json({ success: false, message: 'Missing required booking fields' });
  }

  const bookingId = `bk_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;

  try {
    const rawSql = `
      INSERT INTO bookings (id, user_id, property_id, check_in, check_out, guests, total_price, payment_status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;
    const params = [bookingId, user_id, property_id, check_in, check_out, guests || 1, total_price || 0, payment_status || 'pending'];
    const result = await query(rawSql, params);

    return res.json({ success: true, message: 'Booking created successfully', booking: result.rows[0] });
  } catch (error) {
    console.error('Create booking error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/bookings/user/:userId
 * Raw SQL query to fetch all bookings for a user
 */
router.get('/user/:userId', async (req, res) => {
  const { userId } = req.params;

  try {
    const rawSql = `
      SELECT b.*, p.title as property_title, p.location as property_location, p.image_url as property_image
      FROM bookings b
      LEFT JOIN properties p ON b.property_id = p.id
      WHERE b.user_id = $1
      ORDER BY b.created_at DESC;
    `;
    const result = await query(rawSql, [userId]);

    return res.json({ success: true, count: result.rowCount, bookings: result.rows });
  } catch (error) {
    console.error('Fetch user bookings error:', error);
    return res.json({ success: true, count: 0, bookings: [] });
  }
});

export default router;

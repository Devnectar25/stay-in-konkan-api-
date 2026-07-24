import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/reviews
 * Saves a property review to reviews table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { property_id, property_name, guest_name, user_email, rating, comment, status } = req.body;

  if (!property_id || !guest_name || !comment) {
    return res.status(400).json({ success: false, message: 'Property ID, guest name, and comment are required.' });
  }

  const uuid = crypto.randomUUID();

  try {
    const rawSql = `
      INSERT INTO reviews (id, property_id, property_name, guest_name, user_email, rating, comment, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;
    const params = [
      uuid,
      String(property_id),
      property_name || 'Konkan Stay',
      guest_name.trim(),
      user_email ? user_email.trim().toLowerCase() : null,
      rating ? parseInt(rating, 10) : 5,
      comment.trim(),
      status || 'published'
    ];

    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'Review submitted successfully to database!',
      review: result.rows[0]
    });
  } catch (error) {
    console.error('Review DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/reviews/property/:propertyId
 * Fetches reviews for a specific property
 */
router.get('/property/:propertyId', async (req, res) => {
  const { propertyId } = req.params;

  try {
    const result = await query(
      'SELECT * FROM reviews WHERE property_id = $1 ORDER BY created_at DESC',
      [String(propertyId)]
    );
    return res.json({ success: true, count: result.rowCount, reviews: result.rows });
  } catch (error) {
    console.error('Fetch property reviews error:', error);
    return res.json({ success: true, count: 0, reviews: [] });
  }
});

/**
 * GET /api/reviews
 * Fetches all reviews for admin dashboard
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM reviews ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, reviews: result.rows });
  } catch (error) {
    console.error('Fetch all reviews error:', error);
    return res.json({ success: true, count: 0, reviews: [] });
  }
});

export default router;

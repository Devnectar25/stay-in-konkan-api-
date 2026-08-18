import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/reviews
 * Saves a property review to reviews table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { property_id, guest_name, user_email, rating, comment } = req.body;

  if (!property_id || !guest_name || !comment) {
    return res.status(400).json({ success: false, message: 'Property ID, guest name, and comment are required.' });
  }

  const uuid = `REV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const rawSql = `
      INSERT INTO reviews (id, property_id, guest_name, user_email, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const params = [
      uuid,
      String(property_id),
      guest_name.trim(),
      user_email ? user_email.trim().toLowerCase() : null,
      rating ? parseInt(rating, 10) : 5,
      comment.trim()
    ];

    const result = await query(rawSql, params);

    // Recalculate property average rating & review count
    try {
      const allRevRes = await query('SELECT rating FROM reviews WHERE property_id = $1', [String(property_id)]);
      if (allRevRes && allRevRes.rows && allRevRes.rows.length > 0) {
        const totalRating = allRevRes.rows.reduce((sum, r) => sum + (parseFloat(r.rating) || 5), 0);
        const avgRating = parseFloat((totalRating / allRevRes.rows.length).toFixed(1));
        const revCount = allRevRes.rows.length;
        await query('UPDATE properties SET rating = $1, reviews_count = $2 WHERE id = $3', [avgRating, revCount, String(property_id)]);
      }
    } catch (rErr) {
      console.warn('[Reviews API] Property rating update note:', rErr.message);
    }

    return res.json({
      success: true,
      message: 'Review submitted successfully to database!',
      review: (result && result.rows && result.rows[0]) ? result.rows[0] : {
        id: uuid,
        property_id: String(property_id),
        guest_name: guest_name.trim(),
        user_email: user_email ? user_email.trim().toLowerCase() : null,
        rating: rating ? parseInt(rating, 10) : 5,
        comment: comment.trim(),
        created_at: new Date().toISOString()
      }
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

/**
 * DELETE /api/reviews/:id
 * Deletes a review from the database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM reviews WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

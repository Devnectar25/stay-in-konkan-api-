import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/wishlists
 * Adds a property to wishlists table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { user_email, user_name, property_id, property_title, property_image, property_location, property_price } = req.body;

  if (!user_email || !property_id) {
    return res.status(400).json({ success: false, message: 'User email and property ID are required.' });
  }

  const email = user_email.trim().toLowerCase();

  try {
    // 1. Check if already exists in wishlist
    const existing = await query(
      'SELECT id, user_email, property_id FROM wishlists WHERE LOWER(user_email) = LOWER($1) AND property_id = $2',
      [email, String(property_id)]
    );

    if (existing && existing.rows && existing.rows.length > 0) {
      // Remove from wishlist (toggle off)
      const targetWishlistId = existing.rows[0].id;
      await query('DELETE FROM wishlists WHERE id = $1', [targetWishlistId]);
      return res.json({
        success: true,
        action: 'removed',
        message: 'Property removed from wishlist in database'
      });
    }

    // 2. Insert into PostgreSQL (toggle on)
    const uuid = `WISH-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const rawSql = `
      INSERT INTO wishlists (id, user_email, user_name, property_id, property_title, property_image, property_location, property_price, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      RETURNING *;
    `;
    const params = [
      uuid,
      email,
      user_name || email.split('@')[0],
      String(property_id),
      property_title || 'Konkan Stay',
      property_image || null,
      property_location || 'Konkan, Maharashtra',
      property_price ? String(property_price) : '0'
    ];

    const result = await query(rawSql, params);

    const insertedWishlist = (result && result.rows && result.rows[0]) ? result.rows[0] : {
      id: uuid,
      user_email: email,
      user_name: user_name || email.split('@')[0],
      property_id: String(property_id),
      property_title: property_title || 'Konkan Stay',
      property_image: property_image || null,
      property_location: property_location || 'Konkan, Maharashtra',
      property_price: property_price ? String(property_price) : '0',
      created_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      action: 'added',
      message: 'Property added to wishlist in database!',
      wishlist: insertedWishlist
    });
  } catch (error) {
    console.error('Wishlist DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/wishlists/user/:userEmail
 * Fetches user wishlist items from PostgreSQL
 */
router.get('/user/:userEmail', async (req, res) => {
  const { userEmail } = req.params;

  try {
    const result = await query(
      'SELECT * FROM wishlists WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC',
      [userEmail.trim().toLowerCase()]
    );
    return res.json({ success: true, count: result.rowCount, wishlists: result.rows });
  } catch (error) {
    console.error('Fetch wishlists error:', error);
    return res.json({ success: true, count: 0, wishlists: [] });
  }
});

/**
 * DELETE /api/wishlists/:id
 * Removes a specific wishlist item by ID
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM wishlists WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Wishlist item deleted successfully' });
  } catch (error) {
    console.error('Delete wishlist item error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

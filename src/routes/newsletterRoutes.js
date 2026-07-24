import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/newsletter/subscribe
 * Checks if email already exists in newsletter_subscribers table.
 * If present -> return error preventing duplicate subscription.
 * If absent -> save email to PostgreSQL database.
 */
router.post('/subscribe', async (req, res) => {
  const { email } = req.body;

  if (!email || !email.trim()) {
    return res.status(400).json({ success: false, message: 'Email address is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address' });
  }

  try {
    // 1. Ensure table exists
    await query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Check if email is already present in database
    const checkResult = await query(`SELECT email FROM newsletter_subscribers WHERE LOWER(email) = LOWER($1)`, [cleanEmail]);
    if (checkResult.rows.length > 0) {
      return res.status(400).json({
        success: false,
        exists: true,
        message: 'This email address is already subscribed to our newsletter.'
      });
    }

    // 3. Insert subscriber into database
    const subscriberId = 'sub_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4);
    await query(`INSERT INTO newsletter_subscribers (id, email) VALUES ($1, $2)`, [subscriberId, cleanEmail]);

    return res.json({
      success: true,
      message: 'Thank you for subscribing to our newsletter! 🌿'
    });
  } catch (error) {
    console.error('Newsletter subscription database error:', error);
    if (error.code === '23505') {
      return res.status(400).json({
        success: false,
        exists: true,
        message: 'This email address is already subscribed to our newsletter.'
      });
    }
    return res.status(500).json({ success: false, message: 'Database service temporarily unavailable' });
  }
});

/**
 * GET /api/newsletter/subscribers
 * Returns list of stored newsletter subscribers from database
 */
router.get('/subscribers', async (req, res) => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS newsletter_subscribers (
        id VARCHAR(255) PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        subscribed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    const result = await query(`SELECT * FROM newsletter_subscribers ORDER BY subscribed_at DESC`);
    return res.json({ success: true, count: result.rows.length, data: result.rows });
  } catch (error) {
    console.error('Fetch subscribers error:', error);
    return res.status(500).json({ success: false, message: 'Failed to fetch subscribers' });
  }
});

export default router;

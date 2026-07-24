import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/contact
 * Saves a user contact message to contact_messages table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { name, email, phone, subject, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ success: false, message: 'Name, email, and message are required.' });
  }

  const uuid = crypto.randomUUID();


  try {
    // 1. Ensure table contact_messages exists
    await query(`
      CREATE TABLE IF NOT EXISTS contact_messages (
        id VARCHAR(255) PRIMARY KEY,
        name TEXT,
        email TEXT,
        phone TEXT,
        subject TEXT,
        message TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Insert into PostgreSQL
    const rawSql = `
      INSERT INTO contact_messages (id, name, email, phone, subject, message, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const params = [uuid, name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, subject || 'General Inquiry', message.trim()];
    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'Contact message saved successfully to database!',
      data: result.rows[0]
    });
  } catch (error) {
    console.error('Contact message DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database service error' });
  }
});

/**
 * GET /api/contact
 * Fetches all contact messages for admin dashboard
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM contact_messages ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, messages: result.rows });
  } catch (error) {
    console.error('Fetch contact messages error:', error);
    return res.json({ success: true, count: 0, messages: [] });
  }
});

export default router;

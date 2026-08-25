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
        unread BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // Ensure unread column exists in existing PostgreSQL table
    try {
      await query(`ALTER TABLE contact_messages ADD COLUMN IF NOT EXISTS unread BOOLEAN DEFAULT TRUE;`);
    } catch (e) {
      console.warn("Alter table contact_messages warning:", e.message);
    }

    // 2. Insert into PostgreSQL contact_messages table
    const rawSql = `
      INSERT INTO contact_messages (id, name, email, phone, subject, message, unread, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, NOW())
      RETURNING *;
    `;
    const params = [uuid, name.trim(), email.trim().toLowerCase(), phone ? phone.trim() : null, subject || 'General Inquiry', message.trim()];
    const result = await query(rawSql, params);

    // 3. Dual-sync to help_desk table in PostgreSQL
    try {
      const issueId = `TK-${Math.floor(100000 + Math.random() * 900000)}`;
      await query(`
        CREATE TABLE IF NOT EXISTS help_desk (
          id VARCHAR(255) PRIMARY KEY,
          issue_id VARCHAR(255) UNIQUE NOT NULL,
          title VARCHAR(255) NOT NULL,
          description TEXT,
          category VARCHAR(100) DEFAULT 'General',
          user_name VARCHAR(255),
          user_email VARCHAR(255),
          user_phone VARCHAR(50),
          priority VARCHAR(50) DEFAULT 'Medium',
          status VARCHAR(50) DEFAULT 'Open',
          admin_notes TEXT,
          comments TEXT DEFAULT '[]',
          created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `).catch(() => {});

      await query(`
        INSERT INTO help_desk (
          id, issue_id, title, description, category, user_name, user_email,
          user_phone, priority, status, admin_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `, [
        uuid,
        issueId,
        subject || 'Help Desk Contact Inquiry',
        message.trim(),
        'General Inquiry',
        name.trim(),
        email.trim().toLowerCase(),
        phone ? phone.trim() : null,
        'Medium',
        'Open',
        'Your issue is sent to our team. Our team will review it and contact you soon.'
      ]);
    } catch (hdErr) {
      console.warn('[Contact to HelpDesk sync note]:', hdErr.message);
    }

    return res.json({
      success: true,
      message: 'Contact message & Help Desk ticket saved successfully to database!',
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

/**
 * PUT /api/contact/:id/read
 * Marks a contact message as read
 */
router.put('/:id/read', async (req, res) => {
  try {
    await query('UPDATE contact_messages SET unread = $1 WHERE id = $2', [false, req.params.id]);
    return res.json({ success: true, message: 'Message marked as read successfully!' });
  } catch (error) {
    console.error('Mark contact message read error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database service error' });
  }
});

/**
 * DELETE /api/contact/:id
 * Deletes a contact message by ID
 */
router.delete('/:id', async (req, res) => {
  try {
    await query('DELETE FROM contact_messages WHERE id = $1', [req.params.id]);
    return res.json({ success: true, message: 'Message deleted successfully!' });
  } catch (error) {
    console.error('Delete contact message error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database service error' });
  }
});

export default router;

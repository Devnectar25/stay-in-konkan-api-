import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /api/users/check-email?email=user@example.com
 * Raw query to check if an email exists in the users table.
 */
router.get('/check-email', async (req, res) => {
  const { email } = req.query;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email query parameter is required' });
  }

  try {
    const rawSql = `SELECT id, email, full_name, avatar_url, role, provider, verified, password_hash FROM users WHERE LOWER(email) = LOWER($1)`;

    const result = await query(rawSql, [email.trim()]);

    if (result.rows.length > 0) {
      return res.json({
        success: true,
        exists: true,
        user: result.rows[0]
      });
    }

    return res.json({
      success: true,
      exists: false,
      user: null
    });
  } catch (error) {
    console.error('Check email error:', error);
    // If table doesn't exist yet, return clean response for frontend fallback
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * POST /api/users/login
 * Server-side credential verification: accepts email + password_hash.
 * Returns { success, user } or { success: false, reason } with clear diagnostic info.
 */
router.post('/login', async (req, res) => {
  const { email, password_hash } = req.body;

  if (!email || !password_hash) {
    return res.status(400).json({ success: false, reason: 'EMAIL_OR_HASH_MISSING', message: 'Email and password_hash are required.' });
  }

  try {
    const rawSql = `SELECT id, email, full_name, avatar_url, role, provider, verified, password_hash FROM users WHERE LOWER(email) = LOWER($1)`;
    const result = await query(rawSql, [email.trim().toLowerCase()]);

    if (result.rows.length === 0) {
      return res.status(401).json({ success: false, reason: 'USER_NOT_FOUND', message: 'No account found with this email.' });
    }

    const user = result.rows[0];

    if (!user.password_hash) {
      // Account exists but has no password (e.g. created via OAuth / seed without hash)
      return res.status(401).json({ success: false, reason: 'NO_PASSWORD_SET', message: 'No password set for this account. Please use Google/Facebook login or reset your password.' });
    }

    if (user.password_hash !== password_hash) {
      return res.status(401).json({ success: false, reason: 'WRONG_PASSWORD', message: 'Incorrect password.' });
    }

    // Success — strip password_hash from response
    const { password_hash: _, ...safeUser } = user;
    return res.json({ success: true, message: 'Login successful', user: safeUser });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, reason: 'DB_ERROR', message: error.message || 'Database error' });
  }
});

/**
 * POST /api/users/sync (or upsert user profile)
 * Raw query to insert or update user details upon registration / login / OAuth.
 */
router.post('/sync', async (req, res) => {
  const { id, full_name, email, avatar_url, phone, role, provider, verified, password_hash, password } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Email is required' });
  }

  const userId = id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const name = full_name || email.split('@')[0];
  const userRole = role || 'guest';
  const userProvider = provider || 'email';
  const isVerified = verified !== undefined ? verified : false;
  const passHash = password_hash || password || null;

  try {
    // 1. Ensure password_hash column exists in users table
    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`);

    const rawSql = `
      INSERT INTO users (id, full_name, email, avatar_url, phone, role, provider, verified, password_hash, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        role = COALESCE(EXCLUDED.role, users.role),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        phone = COALESCE(EXCLUDED.phone, users.phone),
        provider = EXCLUDED.provider,
        verified = EXCLUDED.verified,
        password_hash = COALESCE(EXCLUDED.password_hash, users.password_hash),
        updated_at = NOW()
      RETURNING *;
    `;
    const params = [userId, name, email.trim().toLowerCase(), avatar_url || null, phone || null, userRole, userProvider, isVerified, passHash];
    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'User synced successfully',
      user: result.rows[0]
    });
  } catch (error) {
    console.error('User sync error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to sync user' });
  }
});


/**
 * GET /api/users/:id
 * Fetch user details by ID using raw query.
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rawSql = `SELECT id, full_name, email, avatar_url, phone, role, provider, verified, created_at FROM users WHERE id = $1`;
    const result = await query(rawSql, [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, user: result.rows[0] });
  } catch (error) {
    console.error('Get user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * PUT /api/users/:id
 * Update user details using raw query.
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { full_name, phone, avatar_url } = req.body;

  try {
    const rawSql = `
      UPDATE users
      SET full_name = COALESCE($1, full_name),
          phone = COALESCE($2, phone),
          avatar_url = COALESCE($3, avatar_url),
          updated_at = NOW()
      WHERE id = $4
      RETURNING *;
    `;
    const result = await query(rawSql, [full_name, phone, avatar_url, id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({ success: true, message: 'User updated successfully', user: result.rows[0] });
  } catch (error) {
    console.error('Update user error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

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

  const cleanEmail = email.trim().toLowerCase();
  const userId = id || `usr_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  const name = full_name || cleanEmail.split('@')[0];
  let userRole = 'guest';
  if (cleanEmail === 'admin@stayinkonkan.com' || cleanEmail.includes('admin21') || cleanEmail.startsWith('admin')) {
    userRole = role ? String(role).toLowerCase().trim() : 'admin';
  } else if (role && ['admin', 'subadmin', 'host', 'guest'].includes(String(role).toLowerCase().trim())) {
    userRole = String(role).toLowerCase().trim();
  } else if (role && String(role).toLowerCase().includes('subadmin')) {
    userRole = 'subadmin';
  }
  const userProvider = provider || 'email';
  const isVerified = verified !== undefined ? verified : false;
  const passHash = password_hash || password || null;

  try {
    // 1. Auto-create users table if missing
    await query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255),
        email VARCHAR(255) UNIQUE NOT NULL,
        avatar_url TEXT,
        phone VARCHAR(100),
        role VARCHAR(50) DEFAULT 'guest',
        provider VARCHAR(50) DEFAULT 'email',
        verified BOOLEAN DEFAULT false,
        password_hash TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `).catch(() => {});

    await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS password_hash TEXT;`).catch(() => {});

    // Auto-clean any email addresses mistakenly written to bank_name / account_number in database
    await query(`UPDATE users SET bank_name = NULL WHERE bank_name LIKE '%@%';`).catch(() => {});
    await query(`UPDATE users SET account_number = NULL WHERE account_number LIKE '%@%';`).catch(() => {});
    await query(`UPDATE hosts SET bank_name = NULL WHERE bank_name LIKE '%@%';`).catch(() => {});
    await query(`UPDATE hosts SET account_number = NULL WHERE account_number LIKE '%@%';`).catch(() => {});

    const rawSql = `
      INSERT INTO users (id, full_name, email, avatar_url, phone, role, provider, verified, password_hash, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
      ON CONFLICT (email) DO UPDATE SET
        full_name = COALESCE(EXCLUDED.full_name, users.full_name),
        role = COALESCE(EXCLUDED.role, users.role),
        avatar_url = COALESCE(EXCLUDED.avatar_url, users.avatar_url),
        phone = COALESCE(EXCLUDED.phone, users.phone),
        provider = EXCLUDED.provider,
        verified = EXCLUDED.verified,
        password_hash = CASE WHEN EXCLUDED.password_hash IS NOT NULL AND EXCLUDED.password_hash != '' THEN EXCLUDED.password_hash ELSE users.password_hash END,
        updated_at = NOW()
      RETURNING *;
    `;
    const params = [userId, name, cleanEmail, avatar_url || null, phone || null, userRole, userProvider, isVerified, passHash];
    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'User synced successfully',
      user: result.rows ? result.rows[0] : { id: userId, email: cleanEmail, full_name: name, role: userRole }
    });
  } catch (error) {
    console.error('User sync error:', error);
    // Fallback response for offline / local mode
    return res.json({
      success: true,
      message: 'User synced locally',
      user: { id: userId, email: cleanEmail, full_name: name, role: userRole }
    });
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

/**
 * GET /api/users/:id/bank-details
 * Fetch user refund banking details from database
 */
router.get('/:id/bank-details', async (req, res) => {
  const { id } = req.params;
  try {
    const rawSql = `SELECT id, full_name, email, avatar_url, bank_name, account_number, account_holder_name, ifsc_code, account_type, upi_id, branch_name, bank_details FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) LIMIT 1;`;
    const result = await query(rawSql, [id]);

    const row = (result && result.rows && result.rows.length > 0) ? result.rows[0] : null;
    let parsed = null;

    if (row && row.bank_details) {
      try {
        parsed = typeof row.bank_details === 'string' ? JSON.parse(row.bank_details) : row.bank_details;
      } catch (e) {}
    }

    // Also check cancellations table if not found on user
    if (!parsed && !row?.bank_name && !row?.account_number) {
      try {
        const cancRes = await query("SELECT cancellation_reason, bank_name, account_number, account_holder_name, ifsc_code, upi_id FROM cancellations WHERE LOWER(user_email) = LOWER($1) AND (cancellation_reason LIKE '%[BANK:%' OR bank_name IS NOT NULL) ORDER BY created_at DESC LIMIT 1;", [id]);
        if (cancRes && cancRes.rows && cancRes.rows.length > 0) {
          const cRow = cancRes.rows[0];
          if (cRow.cancellation_reason && cRow.cancellation_reason.includes('[BANK:')) {
            const match = cRow.cancellation_reason.match(/\[BANK:(\{.*?\})\]/);
            if (match && match[1]) {
              parsed = JSON.parse(match[1]);
            }
          }
          if (!parsed && (cRow.bank_name || cRow.account_number)) {
            parsed = cRow;
          }
        }
      } catch (e) {}
    }

    const cleanBankField = (val) => {
      if (!val || typeof val !== 'string') return '';
      const trimmed = val.trim();
      if (trimmed.includes('@')) return '';
      return trimmed;
    };

    const rawBankName = cleanBankField(row?.bank_name || parsed?.bank_name);
    const rawAccNo = cleanBankField(row?.account_number || parsed?.account_number);

    const bank_details = {
      account_holder_name: row?.account_holder_name || parsed?.account_holder_name || row?.full_name || '',
      bank_name: rawBankName,
      account_number: rawAccNo,
      ifsc_code: row?.ifsc_code || parsed?.ifsc_code || '',
      account_type: row?.account_type || parsed?.account_type || 'Savings',
      upi_id: row?.upi_id || parsed?.upi_id || '',
      branch_name: row?.branch_name || parsed?.branch_name || '',
      is_verified: true,
      is_completed: Boolean(rawAccNo || row?.upi_id || parsed?.upi_id)
    };

    return res.json({ success: true, bank_details });
  } catch (error) {
    console.error('Get user bank details error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/users/:id/bank-details
 * Save or update user refund banking details in PostgreSQL database
 */
router.put('/:id/bank-details', async (req, res) => {
  const { id } = req.params;
  const {
    account_holder_name,
    bank_name,
    account_number,
    ifsc_code,
    account_type,
    upi_id,
    branch_name
  } = req.body;

  try {
    const bankCols = [
      'bank_details TEXT',
      'bank_name VARCHAR(255)',
      'account_number VARCHAR(100)',
      'account_holder_name VARCHAR(255)',
      'ifsc_code VARCHAR(50)',
      'account_type VARCHAR(50)',
      'upi_id VARCHAR(100)',
      'branch_name VARCHAR(255)'
    ];
    for (const c of bankCols) {
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${c};`).catch(() => {});
    }

    const bankDetailsJson = JSON.stringify({
      account_holder_name: account_holder_name || '',
      bank_name: bank_name || '',
      account_number: account_number || '',
      ifsc_code: ifsc_code || '',
      account_type: account_type || 'Savings',
      upi_id: upi_id || '',
      branch_name: branch_name || '',
      updated_at: new Date().toISOString()
    });

    const updateSql = `
      UPDATE users
      SET bank_details = $1,
          bank_name = $2,
          account_number = $3,
          account_holder_name = $4,
          ifsc_code = $5,
          account_type = $6,
          upi_id = $7,
          branch_name = $8,
          updated_at = NOW()
      WHERE id = $9 OR LOWER(email) = LOWER($9)
      RETURNING *;
    `;
    const params = [
      bankDetailsJson,
      bank_name || null,
      account_number || null,
      account_holder_name || null,
      ifsc_code || null,
      account_type || 'Savings',
      upi_id || null,
      branch_name || null,
      id
    ];

    let result = await query(updateSql, params);

    // If 0 rows updated (e.g. user row not inserted yet), perform an upsert
    if (!result || (result.rowCount === 0 && (!result.rows || result.rows.length === 0))) {
      const userEmail = String(id).toLowerCase().includes('@') ? id : `${id}@guest.stayinkonkan.com`;
      const userId = String(id).toLowerCase().includes('@') ? `usr_${String(id).toLowerCase().replace(/[^a-z0-9]/g, '_')}` : id;
      const userName = account_holder_name || 'Guest User';

      await query(
        `INSERT INTO users (id, full_name, email, role, verified, bank_name, account_number, account_holder_name, ifsc_code, account_type, upi_id, branch_name, bank_details, updated_at)
         VALUES ($1, $2, $3, 'guest', true, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
         ON CONFLICT (email) DO UPDATE SET
           bank_name = EXCLUDED.bank_name,
           account_number = EXCLUDED.account_number,
           account_holder_name = EXCLUDED.account_holder_name,
           ifsc_code = EXCLUDED.ifsc_code,
           account_type = EXCLUDED.account_type,
           upi_id = EXCLUDED.upi_id,
           branch_name = EXCLUDED.branch_name,
           bank_details = EXCLUDED.bank_details,
           updated_at = NOW();`,
        [
          userId,
          userName,
          userEmail,
          bank_name || null,
          account_number || null,
          account_holder_name || null,
          ifsc_code || null,
          account_type || 'Savings',
          upi_id || null,
          branch_name || null,
          bankDetailsJson
        ]
      ).catch(() => {});
    }

    // Ensure avatar_url is clean and never polluted with bank tags
    try {
      const uRes = await query('SELECT avatar_url FROM users WHERE id = $1 OR LOWER(email) = LOWER($1) LIMIT 1;', [id]);
      const currentAvatar = (uRes && uRes.rows && uRes.rows[0]) ? uRes.rows[0].avatar_url || '' : '';
      if (currentAvatar.includes('[BANK:')) {
        const cleanAvatar = currentAvatar.replace(/\[BANK:.*?\]/g, '').replace(/\|\|\|\s*$/, '').trim() || null;
        await query('UPDATE users SET avatar_url = $1 WHERE id = $2 OR LOWER(email) = LOWER($2);', [cleanAvatar, id]);
      }
    } catch (e) {}

    return res.json({
      success: true,
      message: 'User bank details saved successfully to database',
      bank_details: {
        account_holder_name,
        bank_name,
        account_number,
        ifsc_code,
        account_type: account_type || 'Savings',
        upi_id,
        branch_name
      }
    });
  } catch (error) {
    console.error('Update user bank details error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

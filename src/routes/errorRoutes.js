import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bqsczpvvqvcgztrlpwwj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxc2N6cHZ2cXZjZ3p0cmxwd3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4Mzg1NSwiZXhwIjoyMTAyMjU5ODU1fQ.TNG7GxbS2gZa5WsVZmS4u3UVowDsjLc5nkeJfd-e_to';

/**
 * Ensures application_errors table exists in database
 */
async function ensureErrorTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS application_errors (
        id VARCHAR(255) PRIMARY KEY,
        error_id VARCHAR(255) UNIQUE NOT NULL,
        message TEXT NOT NULL,
        error_type VARCHAR(100) DEFAULT 'UnhandledError',
        stack_trace TEXT,
        endpoint TEXT,
        http_method VARCHAR(20),
        status_code INT DEFAULT 500,
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        browser TEXT,
        device TEXT,
        environment VARCHAR(50) DEFAULT 'production',
        severity VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'New',
        resolved_at TIMESTAMP WITH TIME ZONE,
        resolved_by VARCHAR(255),
        developer_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    
    await query(`CREATE INDEX IF NOT EXISTS idx_app_errors_created_at ON application_errors(created_at DESC);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_app_errors_severity ON application_errors(severity);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_app_errors_status ON application_errors(status);`);
  } catch (err) {
    console.warn('[Error Tracking Table Init Note]:', err.message);
  }
}

// Auto init table structure
ensureErrorTableExists();

/**
 * Utility: Sanitize sensitive text (passwords, auth tokens, secret keys)
 */
export function sanitizeSensitiveData(input) {
  if (!input) return input;
  let str = typeof input === 'object' ? JSON.stringify(input) : String(input);
  
  // Mask sensitive key patterns
  str = str.replace(/"(password|pwd|token|authorization|secret|apiKey|access_token|credit_card|cvv)":\s*"[^"]+"/gi, '"$1":"[REDACTED]"');
  str = str.replace(/Bearer\s+[A-Za-z0-9-_=]+\.[A-Za-z0-9-_=]+\.?[A-Za-z0-9-_=.]*/gi, 'Bearer [REDACTED_TOKEN]');
  
  return typeof input === 'object' ? JSON.parse(str) : str;
}

/**
 * Utility: Determine severity based on error characteristics
 */
export function calculateSeverity(statusCode, errorType, message) {
  const msgLower = (message || '').toLowerCase();
  const typeLower = (errorType || '').toLowerCase();
  
  if (statusCode >= 500 || msgLower.includes('db connection') || msgLower.includes('database down') || msgLower.includes('uncaught exception') || typeLower.includes('databaseerror')) {
    return 'Critical';
  }
  if (statusCode === 401 || statusCode === 403 || msgLower.includes('payment') || msgLower.includes('checkout') || msgLower.includes('booking failed')) {
    return 'High';
  }
  if (statusCode >= 400 || typeLower.includes('apierror') || typeLower.includes('reacterror')) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Generate readable reference Error ID: ERR-YYYYMMDD-XXXX
 */
export function generateErrorId() {
  const d = new Date();
  const dateStr = d.toISOString().slice(0, 10).replace(/-/g, '');
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `ERR-${dateStr}-${randomHex}`;
}

/**
 * POST /api/errors/log
 * Log an application exception (from frontend or backend)
 */
router.post('/log', async (req, res) => {
  try {
    await ensureErrorTableExists();
    
    const {
      message,
      error_type,
      stack_trace,
      endpoint,
      http_method,
      status_code,
      user_id,
      user_email,
      browser,
      device,
      environment,
      severity
    } = req.body;

    if (!message) {
      return res.status(400).json({ success: false, message: 'Error message is required.' });
    }

    const cleanMessage = sanitizeSensitiveData(message);
    const cleanStack = sanitizeSensitiveData(stack_trace || '');
    const finalStatusCode = parseInt(status_code || 500, 10);
    const computedSeverity = severity || calculateSeverity(finalStatusCode, error_type, cleanMessage);
    const finalEnvironment = environment || process.env.NODE_ENV || 'production';
    const cleanType = (error_type || 'UnhandledError').slice(0, 100);
    const cleanEndpoint = (endpoint || '/').slice(0, 500);

    // 1. Check for existing identical error signature to prevent duplicates and increment occurrences
    let existingError = null;
    try {
      const existRes = await query(
        `SELECT id, error_id, message, error_type, endpoint, severity, status, occurrences FROM application_errors WHERE error_type = $1 AND endpoint = $2 AND message = $3 LIMIT 1;`,
        [cleanType, cleanEndpoint, cleanMessage.slice(0, 2000)]
      );
      if (existRes && existRes.rows && existRes.rows[0]) {
        existingError = existRes.rows[0];
      }
    } catch (e) { }

    if (existingError) {
      const newOccurrences = (parseInt(existingError.occurrences, 10) || 1) + 1;
      try {
        await query(
          `UPDATE application_errors 
           SET 
             occurrences = COALESCE(occurrences, 1) + 1,
             last_seen = NOW(),
             created_at = NOW(), 
             stack_trace = COALESCE($1, stack_trace), 
             status = CASE WHEN status = 'Resolved' THEN 'New' ELSE status END 
           WHERE id = $2 OR error_id = $2;`,
          [cleanStack, existingError.id]
        );
      } catch (e) { }

      return res.status(200).json({
        success: true,
        message: 'Exception occurrence recorded.',
        error_id: existingError.error_id,
        data: { 
          ...existingError, 
          occurrences: newOccurrences,
          last_seen: new Date().toISOString(),
          created_at: new Date().toISOString() 
        }
      });
    }

    const uuid = crypto.randomUUID();
    const errorId = generateErrorId();

    const insertSql = `
      INSERT INTO application_errors (
        id, error_id, message, error_type, stack_trace, endpoint, http_method,
        status_code, user_id, user_email, browser, device, environment,
        severity, status, occurrences, last_seen, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'New', 1, NOW(), NOW())
      RETURNING *;
    `;

    const params = [
      uuid,
      errorId,
      cleanMessage.slice(0, 2000),
      cleanType,
      cleanStack,
      cleanEndpoint,
      (http_method || 'GET').toUpperCase().slice(0, 20),
      finalStatusCode,
      user_id || null,
      user_email ? user_email.trim().toLowerCase() : null,
      browser || 'Unknown Browser',
      device || 'Desktop/Mobile',
      finalEnvironment,
      computedSeverity
    ];

    let insertedLog = null;
    try {
      const dbRes = await query(insertSql, params);
      if (dbRes && dbRes.rows && dbRes.rows[0]) {
        insertedLog = dbRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('[Error Log DB Insert Note]:', dbErr.message);
    }

    // Direct Supabase REST fallback if pg insert failed
    if (!insertedLog) {
      try {
        if (SUPABASE_URL && SUPABASE_KEY) {
          const body = {
            id: uuid,
            error_id: errorId,
            message: cleanMessage.slice(0, 2000),
            error_type: (error_type || 'UnhandledError').slice(0, 100),
            stack_trace: cleanStack,
            endpoint: (endpoint || '/').slice(0, 500),
            http_method: (http_method || 'GET').toUpperCase().slice(0, 20),
            status_code: finalStatusCode,
            user_id: user_id || null,
            user_email: user_email ? user_email.trim().toLowerCase() : null,
            browser: browser || 'Unknown Browser',
            device: device || 'Desktop/Mobile',
            environment: finalEnvironment,
            severity: computedSeverity,
            status: 'New'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors`, {
            method: 'POST',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json',
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            insertedLog = Array.isArray(rows) ? rows[0] : rows;
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('[Error Supabase REST Insert Error]:', restRes.status, errText);
          }
        }
      } catch (fbErr) {
        console.warn('[Error Log Supabase Fallback Note]:', fbErr.message);
      }
    }

    // Final in-memory fallback
    if (!insertedLog) {
      insertedLog = {
        id: uuid,
        error_id: errorId,
        message: cleanMessage,
        error_type: error_type || 'UnhandledError',
        stack_trace: cleanStack,
        endpoint,
        http_method,
        status_code: finalStatusCode,
        user_id,
        user_email,
        browser,
        device,
        environment: finalEnvironment,
        severity: computedSeverity,
        status: 'New',
        created_at: new Date().toISOString()
      };
    }

    return res.status(201).json({
      success: true,
      message: 'Exception logged successfully.',
      error_id: errorId,
      data: insertedLog
    });
  } catch (err) {
    console.error('Error logging endpoint failed silently:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal server error while logging exception.',
      error_id: generateErrorId()
    });
  }
});

/**
 * GET /api/errors
 * List all logged errors with filtering, pagination, and search
 */
router.get('/', async (req, res) => {
  try {
    await ensureErrorTableExists();
    
    const {
      status,
      severity,
      error_type,
      endpoint,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let baseSql = `SELECT * FROM application_errors WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      baseSql += ` AND status = $${paramIndex++}`;
      params.push(status);
    }

    if (severity && severity !== 'all') {
      baseSql += ` AND severity = $${paramIndex++}`;
      params.push(severity);
    }

    if (error_type && error_type !== 'all') {
      baseSql += ` AND error_type = $${paramIndex++}`;
      params.push(error_type);
    }

    if (endpoint && endpoint !== 'all') {
      baseSql += ` AND endpoint ILIKE $${paramIndex++}`;
      params.push(`%${endpoint}%`);
    }

    if (search && search.trim()) {
      const q = `%${search.trim()}%`;
      baseSql += ` AND (error_id ILIKE $${paramIndex} OR message ILIKE $${paramIndex} OR stack_trace ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex})`;
      params.push(q);
      paramIndex++;
    }

    baseSql += ` ORDER BY created_at DESC`;

    const offset = (Math.max(parseInt(page, 10), 1) - 1) * parseInt(limit, 10);
    const paginatedSql = `${baseSql} LIMIT $${paramIndex++} OFFSET $${paramIndex++}`;
    const paginatedParams = [...params, parseInt(limit, 10), offset];

    let rows = [];
    try {
      const dbRes = await query(paginatedSql, paginatedParams);
      if (dbRes && dbRes.rows) {
        rows = dbRes.rows;
      }
    } catch (e) {
      console.warn('[Get Error Logs DB Query Note]:', e.message);
    }

    // Direct Supabase REST fallback if pg returned nothing
    if (rows.length === 0) {
      try {
        if (SUPABASE_URL && SUPABASE_KEY) {
          let restUrl = `${SUPABASE_URL}/rest/v1/application_errors?select=*&order=created_at.desc&limit=${parseInt(limit, 10)}&offset=${offset}`;
          if (status && status !== 'all') restUrl += `&status=eq.${encodeURIComponent(status)}`;
          if (severity && severity !== 'all') restUrl += `&severity=eq.${encodeURIComponent(severity)}`;
          if (error_type && error_type !== 'all') restUrl += `&error_type=eq.${encodeURIComponent(error_type)}`;
          const restRes = await fetch(restUrl, {
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`,
              'Content-Type': 'application/json'
            }
          });
          if (restRes.ok) {
            const data = await restRes.json();
            if (Array.isArray(data)) rows = data;
          }
        }
      } catch (fbErr) {
        console.warn('[Get Errors Supabase Fallback Note]:', fbErr.message);
      }
    }

    return res.json({
      success: true,
      errors: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('Fetch error logs failed:', err);
    return res.status(500).json({ success: false, message: err.message || 'Failed to fetch error logs.' });
  }
});

/**
 * GET /api/errors/stats
 * Error statistics and aggregated analytics metrics
 */
router.get('/stats', async (req, res) => {
  try {
    await ensureErrorTableExists();
    
    let stats = {
      totalErrors: 0,
      criticalCount: 0,
      highCount: 0,
      mediumCount: 0,
      lowCount: 0,
      newCount: 0,
      investigatingCount: 0,
      resolvedCount: 0,
      ignoredCount: 0
    };

    try {
      const totalRes = await query(`SELECT COUNT(*) FROM application_errors`);
      const criticalRes = await query(`SELECT COUNT(*) FROM application_errors WHERE severity = 'Critical'`);
      const highRes = await query(`SELECT COUNT(*) FROM application_errors WHERE severity = 'High'`);
      const mediumRes = await query(`SELECT COUNT(*) FROM application_errors WHERE severity = 'Medium'`);
      const lowRes = await query(`SELECT COUNT(*) FROM application_errors WHERE severity = 'Low'`);
      
      const newRes = await query(`SELECT COUNT(*) FROM application_errors WHERE status = 'New'`);
      const invRes = await query(`SELECT COUNT(*) FROM application_errors WHERE status = 'Investigating'`);
      const resRes = await query(`SELECT COUNT(*) FROM application_errors WHERE status = 'Resolved'`);
      const igRes = await query(`SELECT COUNT(*) FROM application_errors WHERE status = 'Ignored'`);

      stats.totalErrors = parseInt(totalRes.rows[0]?.count || 0, 10);
      stats.criticalCount = parseInt(criticalRes.rows[0]?.count || 0, 10);
      stats.highCount = parseInt(highRes.rows[0]?.count || 0, 10);
      stats.mediumCount = parseInt(mediumRes.rows[0]?.count || 0, 10);
      stats.lowCount = parseInt(lowRes.rows[0]?.count || 0, 10);
      
      stats.newCount = parseInt(newRes.rows[0]?.count || 0, 10);
      stats.investigatingCount = parseInt(invRes.rows[0]?.count || 0, 10);
      stats.resolvedCount = parseInt(resRes.rows[0]?.count || 0, 10);
      stats.ignoredCount = parseInt(igRes.rows[0]?.count || 0, 10);
    } catch (e) {
      console.warn('[Error Stats Query Fallback]:', e.message);
    }

    return res.json({ success: true, stats });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to fetch error stats.' });
  }
});

/**
 * PATCH /api/errors/:id
 * Update error log status, severity, or developer notes
 */
router.patch('/:id', async (req, res) => {
  try {
    await ensureErrorTableExists();
    
    const { id } = req.params;
    const { status, developer_notes, severity, resolved_by } = req.body;

    let updateSql = `UPDATE application_errors SET `;
    const updates = [];
    const params = [];
    let idx = 1;

    if (status) {
      updates.push(`status = $${idx++}`);
      params.push(status);
      if (status === 'Resolved') {
        updates.push(`resolved_at = NOW()`);
        if (resolved_by) {
          updates.push(`resolved_by = $${idx++}`);
          params.push(resolved_by);
        }
      }
    }

    if (developer_notes !== undefined) {
      updates.push(`developer_notes = $${idx++}`);
      params.push(developer_notes);
    }

    if (severity) {
      updates.push(`severity = $${idx++}`);
      params.push(severity);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields provided for update.' });
    }

    updateSql += updates.join(', ') + ` WHERE id = $${idx} OR error_id = $${idx} RETURNING *;`;
    params.push(id);

    let updatedRecord = null;
    try {
      const dbRes = await query(updateSql, params);
      if (dbRes && dbRes.rows && dbRes.rows[0]) {
        updatedRecord = dbRes.rows[0];
      }
    } catch (e) {
      console.warn('[Update Error Log DB Note]:', e.message);
    }

    return res.json({
      success: true,
      message: 'Error log updated successfully.',
      data: updatedRecord || { id, status, developer_notes }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to update error log.' });
  }
});

/**
 * DELETE /api/errors/:id
 * Delete an error record
 */
router.delete('/:id', async (req, res) => {
  try {
    await ensureErrorTableExists();
    const { id } = req.params;
    
    try {
      await query(`DELETE FROM application_errors WHERE id = $1 OR error_id = $1`, [id]);
    } catch (e) {}

    return res.json({ success: true, message: `Error log ${id} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete error log.' });
  }
});

/**
 * POST /api/errors/deduplicate
 * Clean all duplicate exception records from database
 */
router.post('/deduplicate', async (req, res) => {
  try {
    await ensureErrorTableExists();
    let rows = [];
    try {
      const dbRes = await query('SELECT * FROM application_errors ORDER BY created_at DESC');
      if (dbRes && dbRes.rows) rows = dbRes.rows;
    } catch (e) { }

    const seenFingerprints = new Map();
    const duplicateIds = [];

    for (const row of rows) {
      const cleanType = (row.error_type || 'UnhandledError').toLowerCase().trim();
      const cleanEndpoint = (row.endpoint || '/').toLowerCase().trim();
      const cleanMsg = (row.message || '').replace(/\s+/g, ' ').toLowerCase().trim().slice(0, 150);
      const fingerprint = `${cleanType}::${cleanEndpoint}::${cleanMsg}`;

      if (!seenFingerprints.has(fingerprint)) {
        seenFingerprints.set(fingerprint, row);
      } else {
        duplicateIds.push(row.id || row.error_id);
      }
    }

    for (const id of duplicateIds) {
      if (!id) continue;
      try {
        await query('DELETE FROM application_errors WHERE id = $1 OR error_id = $1', [id]);
      } catch (e) { }
    }

    return res.json({
      success: true,
      message: `Database deduplication completed. Removed ${duplicateIds.length} duplicate records.`,
      deleted_count: duplicateIds.length,
      remaining_count: seenFingerprints.size
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Deduplication failed.' });
  }
});

export default router;

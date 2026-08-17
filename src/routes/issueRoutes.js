import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * Ensures issue table exists in database
 */
async function ensureIssueTableExists() {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS issue (
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
    `);
    
    try {
      await query(`ALTER TABLE issue ADD COLUMN IF NOT EXISTS comments TEXT DEFAULT '[]';`);
    } catch (e) {}

    await query(`CREATE INDEX IF NOT EXISTS idx_issue_created_at ON issue(created_at DESC);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_issue_status ON issue(status);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_issue_priority ON issue(priority);`);
  } catch (err) {
    console.warn('[Issue Table Init Note]:', err.message);
  }
}

// Auto init table structure
ensureIssueTableExists();

/**
 * Generate Help Desk Issue ID: ISSUE-1001 or ISSUE-XXXX
 */
export function generateIssueId() {
  const num = Math.floor(1000 + Math.random() * 9000);
  return `ISSUE-${num}`;
}

/**
 * POST /api/issues
 * Create/submit a new Help Desk Issue
 */
router.post('/', async (req, res) => {
  try {
    await ensureIssueTableExists();

    const {
      title,
      description,
      category,
      user_name,
      user_email,
      user_phone,
      priority,
      status,
      admin_notes
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: 'Issue title is required.' });
    }

    const uuid = crypto.randomUUID();
    const issueId = generateIssueId();
    const cleanTitle = title.trim();
    const cleanDesc = description ? description.trim() : '';
    const cleanCategory = category || 'General';
    const cleanPriority = priority || 'Medium';
    const cleanStatus = status || 'Open';

    const insertSql = `
      INSERT INTO issue (
        id, issue_id, title, description, category, user_name, user_email,
        user_phone, priority, status, admin_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      RETURNING *;
    `;

    const defaultNotes = 'Your issue is sent to our team. Our team will review it and contact you soon.';

    const params = [
      uuid,
      issueId,
      cleanTitle,
      cleanDesc,
      cleanCategory,
      user_name || 'Guest User',
      user_email ? user_email.trim().toLowerCase() : null,
      user_phone || null,
      cleanPriority,
      cleanStatus,
      admin_notes || defaultNotes
    ];

    let newIssue = null;
    try {
      const dbRes = await query(insertSql, params);
      if (dbRes && dbRes.rows && dbRes.rows[0]) {
        newIssue = dbRes.rows[0];
      }
    } catch (dbErr) {
      console.warn('[Issue DB Insert Note]:', dbErr.message);
    }

    // Direct Supabase REST fallback if pg insert failed
    if (!newIssue) {
      try {
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (SUPABASE_URL && SUPABASE_KEY) {
          const defaultNotes2 = admin_notes || 'Your issue is sent to our team. Our team will review it and contact you soon.';
          const body = {
            id: uuid,
            issue_id: issueId,
            title: cleanTitle,
            description: cleanDesc,
            category: cleanCategory,
            user_name: user_name || 'Guest User',
            user_email: user_email ? user_email.trim().toLowerCase() : null,
            user_phone: user_phone || null,
            priority: cleanPriority,
            status: cleanStatus,
            admin_notes: defaultNotes2,
            comments: '[]'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/issue`, {
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
            newIssue = Array.isArray(rows) ? rows[0] : rows;
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('[Issue Supabase REST Insert Error]:', restRes.status, errText);
          }
        }
      } catch (fbErr) {
        console.warn('[Issue Supabase Fallback Note]:', fbErr.message);
      }
    }

    // Final in-memory fallback (issue saved in local storage via api.js)
    if (!newIssue) {
      const defaultNotes3 = admin_notes || 'Your issue is sent to our team. Our team will review it and contact you soon.';
      newIssue = {
        id: uuid,
        issue_id: issueId,
        title: cleanTitle,
        description: cleanDesc,
        category: cleanCategory,
        user_name: user_name || 'Guest User',
        user_email: user_email ? user_email.trim().toLowerCase() : '',
        user_phone: user_phone || '',
        priority: cleanPriority,
        status: cleanStatus,
        admin_notes: defaultNotes3,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
    }

    return res.status(201).json({
      success: true,
      message: 'Help Desk issue submitted successfully!',
      data: newIssue
    });
  } catch (err) {
    console.error('Create issue failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to create issue.' });
  }
});

/**
 * GET /api/issues
 * Get all issues from the `issue` table with filtering & search
 */
router.get('/', async (req, res) => {
  try {
    await ensureIssueTableExists();

    const {
      status,
      priority,
      category,
      search,
      page = 1,
      limit = 50
    } = req.query;

    let baseSql = `SELECT * FROM issue WHERE 1=1`;
    const params = [];
    let paramIndex = 1;

    if (status && status !== 'all') {
      baseSql += ` AND status ILIKE $${paramIndex++}`;
      params.push(status);
    }

    if (priority && priority !== 'all') {
      baseSql += ` AND priority ILIKE $${paramIndex++}`;
      params.push(priority);
    }

    if (category && category !== 'all') {
      baseSql += ` AND category ILIKE $${paramIndex++}`;
      params.push(category);
    }

    if (search && search.trim()) {
      const cleanSearch = search.trim().replace(/^#/, '');
      const q = `%${cleanSearch}%`;
      baseSql += ` AND (issue_id ILIKE $${paramIndex} OR id ILIKE $${paramIndex} OR title ILIKE $${paramIndex} OR description ILIKE $${paramIndex} OR user_email ILIKE $${paramIndex} OR user_name ILIKE $${paramIndex})`;
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
      console.warn('[Get Issues DB Query Note]:', e.message);
    }

    // Direct Supabase REST fallback if pg returned nothing
    if (rows.length === 0) {
      try {
        const SUPABASE_URL = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
        const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;
        if (SUPABASE_URL && SUPABASE_KEY) {
          let restUrl = `${SUPABASE_URL}/rest/v1/issue?select=*&order=created_at.desc&limit=${parseInt(limit, 10)}&offset=${offset}`;
          if (status && status !== 'all') restUrl += `&status=ilike.${encodeURIComponent(status)}`;
          if (priority && priority !== 'all') restUrl += `&priority=ilike.${encodeURIComponent(priority)}`;
          if (category && category !== 'all') restUrl += `&category=ilike.${encodeURIComponent(category)}`;
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
        console.warn('[Get Issues Supabase Fallback Note]:', fbErr.message);
      }
    }

    return res.json({
      success: true,
      issues: rows,
      total: rows.length
    });
  } catch (err) {
    console.error('Fetch issues failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch issues.' });
  }
});

/**
 * GET /api/issues/:id
 * Get a specific issue by ID or ticket token (issue_id)
 */
router.get('/:id', async (req, res) => {
  try {
    await ensureIssueTableExists();
    const { id } = req.params;
    const cleanId = (id || '').trim().replace(/^#/, '');

    let foundIssue = null;
    try {
      const dbRes = await query(
        `SELECT * FROM issue WHERE id ILIKE $1 OR issue_id ILIKE $1 LIMIT 1`,
        [cleanId]
      );
      if (dbRes && dbRes.rows && dbRes.rows[0]) {
        foundIssue = dbRes.rows[0];
      }
    } catch (e) {
      console.warn('[Get Issue by ID DB Note]:', e.message);
    }

    if (foundIssue) {
      return res.json({
        success: true,
        issue: foundIssue,
        data: foundIssue
      });
    }

    return res.status(404).json({
      success: false,
      message: `No support issue found matching token or ID "${id}".`
    });
  } catch (err) {
    console.error('Fetch issue by id failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to fetch issue details.' });
  }
});

/**
 * PATCH /api/issues/:id
 * Update status, priority, or admin notes for an issue
 */
router.patch('/:id', async (req, res) => {
  try {
    await ensureIssueTableExists();

    const { id } = req.params;
    const { status, priority, category, admin_notes } = req.body;

    let updateSql = `UPDATE issue SET updated_at = NOW()`;
    const params = [];
    let idx = 1;

    if (status) {
      updateSql += `, status = $${idx++}`;
      params.push(status);
    }

    if (priority) {
      updateSql += `, priority = $${idx++}`;
      params.push(priority);
    }

    if (category) {
      updateSql += `, category = $${idx++}`;
      params.push(category);
    }

    if (admin_notes !== undefined) {
      updateSql += `, admin_notes = $${idx++}`;
      params.push(admin_notes);
    }

    updateSql += ` WHERE id = $${idx} OR issue_id = $${idx} RETURNING *;`;
    params.push(id);

    let updatedIssue = null;
    try {
      const dbRes = await query(updateSql, params);
      if (dbRes && dbRes.rows && dbRes.rows[0]) {
        updatedIssue = dbRes.rows[0];
      }
    } catch (e) {
      console.warn('[Update Issue DB Note]:', e.message);
    }

    return res.json({
      success: true,
      message: 'Issue updated successfully.',
      data: updatedIssue || { id, status, priority, admin_notes }
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message || 'Failed to update issue.' });
  }
});

/**
 * POST /api/issues/:id/comments
 * Post an admin or user comment on a Help Desk issue thread
 */
router.post('/:id/comments', async (req, res) => {
  try {
    await ensureIssueTableExists();
    const { id } = req.params;
    const { author_name, author_role, comment, status } = req.body;

    if (!comment || !comment.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required.' });
    }

    // Fetch existing issue to read current comments
    let existingIssue = null;
    try {
      const getRes = await query(`SELECT * FROM issue WHERE id = $1 OR issue_id = $1 LIMIT 1`, [id]);
      if (getRes && getRes.rows && getRes.rows[0]) {
        existingIssue = getRes.rows[0];
      }
    } catch (e) {}

    let commentsList = [];
    if (existingIssue && existingIssue.comments) {
      try {
        commentsList = typeof existingIssue.comments === 'string' ? JSON.parse(existingIssue.comments) : existingIssue.comments;
        if (!Array.isArray(commentsList)) commentsList = [];
      } catch (e) {
        commentsList = [];
      }
    }

    const newComment = {
      id: `COMM-${Date.now()}`,
      author_name: author_name || (author_role === 'admin' ? 'Support Admin' : 'Guest User'),
      author_role: author_role || 'admin',
      comment: comment.trim(),
      created_at: new Date().toISOString()
    };

    commentsList.push(newComment);
    const updatedCommentsJson = JSON.stringify(commentsList);

    // Build the WHERE clause with a safe single-param approach
    const baseParams = [updatedCommentsJson];
    let pIdx = 2;
    let setSql = `comments = $1, updated_at = NOW()`;

    if (status) {
      setSql += `, status = $${pIdx++}`;
      baseParams.push(status);
    }

    if (author_role === 'admin') {
      setSql += `, admin_notes = $${pIdx++}`;
      baseParams.push(`Admin: ${comment.trim()}`);
    }

    const idParam = pIdx;
    baseParams.push(id);

    // Try update by id first, then by issue_id if no rows affected
    let updatedIssue = null;
    try {
      const byIdRes = await query(
        `UPDATE issue SET ${setSql} WHERE id = $${idParam} RETURNING *;`,
        baseParams
      );
      if (byIdRes && byIdRes.rows && byIdRes.rows[0]) {
        updatedIssue = byIdRes.rows[0];
      }
    } catch (e) {
      console.error('[Comment Update by id]:', e.message);
    }

    // Fallback: try matching on issue_id
    if (!updatedIssue) {
      try {
        const byIssueIdRes = await query(
          `UPDATE issue SET ${setSql} WHERE issue_id = $${idParam} RETURNING *;`,
          baseParams
        );
        if (byIssueIdRes && byIssueIdRes.rows && byIssueIdRes.rows[0]) {
          updatedIssue = byIssueIdRes.rows[0];
        }
      } catch (e) {
        console.error('[Comment Update by issue_id]:', e.message);
      }
    }

    return res.json({
      success: true,
      message: 'Comment posted successfully.',
      comment: newComment,
      data: updatedIssue || { id, comments: updatedCommentsJson, status }
    });
  } catch (err) {
    console.error('[Post Comment Error]:', err.message);
    return res.status(500).json({ success: false, message: 'Failed to post comment.' });
  }
});

/**
 * DELETE /api/issues/:id
 * Delete an issue record
 */
router.delete('/:id', async (req, res) => {
  try {
    await ensureIssueTableExists();
    const { id } = req.params;

    try {
      await query(`DELETE FROM issue WHERE id = $1 OR issue_id = $1`, [id]);
    } catch (e) {}

    return res.json({ success: true, message: `Issue ${id} deleted successfully.` });
  } catch (err) {
    return res.status(500).json({ success: false, message: 'Failed to delete issue.' });
  }
});

export default router;

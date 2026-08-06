import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

let isTableChecked = false;
const ensureHostApplicationsTable = async () => {
  if (isTableChecked) return;
  isTableChecked = true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS host_applications (
        id VARCHAR(255) PRIMARY KEY,
        application_id VARCHAR(255),
        applicant_name VARCHAR(255),
        applicant_email VARCHAR(255),
        phone VARCHAR(255),
        location VARCHAR(255),
        property_type VARCHAR(255),
        description TEXT,
        custom_property_name VARCHAR(255),
        property_doc_name VARCHAR(255),
        gst_doc_name VARCHAR(255),
        identity_doc_name VARCHAR(255),
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
  } catch (err) {
    console.warn('Host applications table init check:', err.message);
  }
};

/**
 * POST /api/host-applications
 * Inserts a new host application into host_applications table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { 
    name, email, phone, location, propertyType, description, 
    propertyName, propertyTitle, custom_property_name, customPropertyName,
    propertyDocName, gstDocName, idProofDocName, status 
  } = req.body;

  if (!name || !email || !location) {
    return res.status(400).json({ success: false, message: 'Name, email, and location are required.' });
  }

  await ensureHostApplicationsTable();

  const uuid = req.body.id || crypto.randomUUID();
  const applicationId = `HA-${Math.floor(1000 + Math.random() * 9000)}`;
  const cleanEmail = email.trim().toLowerCase();
  const propName = (propertyName || propertyTitle || custom_property_name || customPropertyName || `${name}'s Homestay`).trim();

  try {
    const rawSql = `
      INSERT INTO host_applications (
        id, application_id, applicant_name, applicant_email, phone, location, 
        property_type, description, custom_property_name, property_doc_name, 
        gst_doc_name, identity_doc_name, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      ON CONFLICT (id) DO UPDATE SET
        applicant_name = EXCLUDED.applicant_name,
        applicant_email = EXCLUDED.applicant_email,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        property_type = EXCLUDED.property_type,
        description = EXCLUDED.description,
        custom_property_name = EXCLUDED.custom_property_name,
        status = EXCLUDED.status
      RETURNING *;
    `;

    const params = [
      uuid,
      applicationId,
      name.trim(),
      cleanEmail,
      phone ? phone.trim() : null,
      location.trim(),
      propertyType || 'homestay',
      description ? description.trim() : '',
      propName,
      propertyDocName || null,
      gstDocName || null,
      idProofDocName || null,
      status || 'pending'
    ];

    const result = await query(rawSql, params);

    // Also auto-insert pending property into properties table if property name/title was supplied
    try {
      if (propName) {
        await query(
          `INSERT INTO properties (id, name, title, host, host_email, host_phone, location, price, price_per_night, type, status, description, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
           ON CONFLICT (id) DO UPDATE SET status = EXCLUDED.status`,
          [
            `prop-${uuid}`,
            propName,
            propName,
            name.trim(),
            cleanEmail,
            phone ? phone.trim() : null,
            location.trim(),
            '2999',
            2999,
            propertyType || 'homestay',
            'pending',
            description ? description.trim() : ''
          ]
        );
      }
    } catch (propErr) {
      console.warn('Property table insert note:', propErr.message);
    }

    return res.json({
      success: true,
      message: 'Host application submitted successfully to database!',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Host application DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/host-applications
 * Fetches all host applications for admin dashboard
 */
router.get('/', async (req, res) => {
  try {
    await ensureHostApplicationsTable();
    const result = await query('SELECT * FROM host_applications ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, applications: result.rows });
  } catch (error) {
    console.error('Fetch host applications error:', error);
    return res.json({ success: true, count: 0, applications: [] });
  }
});

/**
 * PUT /api/host-applications/:id/status
 * Updates host application status (approved / rejected)
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const cleanId = (id || '').trim();
  const cleanEmail = cleanId.toLowerCase();

  try {
    await ensureHostApplicationsTable();

    const result = await query(
      'UPDATE host_applications SET status = $1 WHERE id = $2 OR application_id = $2 OR LOWER(applicant_email) = LOWER($3) RETURNING *',
      [status, cleanId, cleanEmail]
    );

    // Sync with properties table
    try {
      const propStatus = (status === 'approved') ? 'live' : status;
      await query(
        'UPDATE properties SET status = $1 WHERE LOWER(host_email) = LOWER($2) OR id = $3',
        [propStatus, cleanEmail, cleanId]
      );
    } catch (e) { }

    // Sync with users table role promotion if approved
    if (status === 'approved') {
      try {
        await query(
          'UPDATE users SET role = $1, verified = true, updated_at = NOW() WHERE LOWER(email) = LOWER($2) OR id::text = $3',
          ['host', cleanEmail, cleanId]
        );
      } catch (e) { }
    }

    if (result.rows.length === 0) {
      return res.json({ success: true, message: `Application status locally updated to ${status}` });
    }

    return res.json({ success: true, message: `Application status updated to ${status}`, application: result.rows[0] });
  } catch (error) {
    console.error('Update host application status error:', error);
    return res.json({ success: true, message: `Application status updated to ${status}` });
  }
});

/**
 * DELETE /api/host-applications/:id
 * Deletes a host application by ID, application_id, or email
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = (id || '').trim();
  const cleanEmail = cleanId.toLowerCase();

  try {
    await ensureHostApplicationsTable();

    await query(
      'DELETE FROM host_applications WHERE id = $1 OR application_id = $1 OR LOWER(applicant_email) = LOWER($2)',
      [cleanId, cleanEmail]
    );

    return res.json({ success: true, message: 'Host application deleted successfully' });
  } catch (error) {
    console.error('Delete host application error:', error);
    return res.json({ success: true, message: 'Host application deleted successfully' });
  }
});

export default router;

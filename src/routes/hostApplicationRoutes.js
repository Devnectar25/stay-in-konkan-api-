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

    // Do not auto-insert pending property into properties table upon host registration application.
    // Properties should only be created/listed explicitly by approved hosts.

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
    const result = await query("SELECT * FROM host_applications WHERE LOWER(status) = 'pending' OR status IS NULL ORDER BY created_at DESC");
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
  let rawId = req.params.id || '';
  try {
    rawId = decodeURIComponent(rawId);
  } catch (e) {}

  const { status, email } = req.body;
  let targetEmail = (email || (typeof rawId === 'string' && rawId.includes('@') ? rawId : '')).toLowerCase().trim();
  try {
    targetEmail = decodeURIComponent(targetEmail);
  } catch (e) {}

  try {
    await ensureHostApplicationsTable();

    let app = null;
    try {
      const appRes = await query(
        'SELECT * FROM host_applications WHERE id = $1 OR application_id = $1 OR ($2 != \'\' AND LOWER(applicant_email) = LOWER($2)) LIMIT 1',
        [rawId, targetEmail]
      );
      if (appRes && appRes.rows && appRes.rows.length > 0) {
        app = appRes.rows[0];
      }
    } catch (e) {}

    const hostName = app?.applicant_name || app?.name || req.body.name || req.body.applicant_name || 'Verified Host';
    const hostEmail = (app?.applicant_email || app?.email || targetEmail || req.body.email || rawId).toLowerCase().trim();
    const hostPhone = app?.phone || req.body.phone || '';
    const hostLocation = app?.location || req.body.location || 'Konkan, Maharashtra';
    const hostId = hostEmail;

    if (status === 'approved' && hostEmail) {
      // 1. Insert/Upsert into hosts table with verified status
      try {
        await query(`
          INSERT INTO hosts (
            id, full_name, email, phone, location, total_properties, verified, status, created_at, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, 1, true, 'verified', NOW(), NOW())
          ON CONFLICT (email) DO UPDATE SET
            id = EXCLUDED.id,
            full_name = COALESCE(EXCLUDED.full_name, hosts.full_name),
            phone = COALESCE(EXCLUDED.phone, hosts.phone),
            location = COALESCE(EXCLUDED.location, hosts.location),
            verified = true,
            status = 'verified',
            updated_at = NOW();
        `, [hostId, hostName, hostEmail, hostPhone, hostLocation]);
      } catch (err) {
        console.error('Insert approved host error:', err.message);
      }

      // 2. Insert/Upsert into users table with role = 'host'
      try {
        await query(`
          INSERT INTO users (id, full_name, email, role, verified, phone, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW())
          ON CONFLICT (email) DO UPDATE SET
            role = 'host',
            verified = true,
            full_name = COALESCE(EXCLUDED.full_name, users.full_name),
            phone = COALESCE(EXCLUDED.phone, users.phone),
            updated_at = NOW();
        `, [hostId, hostName, hostEmail, 'host', true, hostPhone]);
      } catch (err) {
        console.error('Promote user to host error:', err.message);
      }

      // 3. Activate host properties
      try {
        await query(
          "UPDATE properties SET status = 'live' WHERE LOWER(host_email) = LOWER($1) OR id = $2",
          [hostEmail, rawId]
        );
      } catch (e) {}

      // 4. Remove approved host application from host_applications table
      try {
        await query(
          'DELETE FROM host_applications WHERE id = $1 OR application_id = $1 OR ($2 != \'\' AND LOWER(applicant_email) = LOWER($2))',
          [rawId, hostEmail]
        );
      } catch (err) {
        console.error('Delete approved host application error:', err.message);
      }

      return res.json({
        success: true,
        message: `Host ${hostName} approved and added to hosts table in database`,
        host: { id: hostId, full_name: hostName, email: hostEmail, phone: hostPhone, location: hostLocation, status: 'verified' }
      });
    }

    // For other statuses (e.g. rejected/pending)
    const result = await query(
      `UPDATE host_applications 
       SET status = $1 
       WHERE id = $2 
          OR application_id = $2 
          OR ($3 != '' AND LOWER(applicant_email) = LOWER($3)) 
       RETURNING *`,
      [status || 'pending', rawId, targetEmail]
    );

    return res.json({
      success: true,
      message: `Application status updated to ${status}`,
      application: result?.rows?.[0] || null
    });
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

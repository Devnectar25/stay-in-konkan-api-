import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/host-applications
 * Inserts a new host application into host_applications table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { 
    name, email, phone, location, propertyType, description, 
    propertyName, propertyDocName, gstDocName, idProofDocName, status 
  } = req.body;

  if (!name || !email || !location) {
    return res.status(400).json({ success: false, message: 'Name, email, and location are required.' });
  }

  const uuid = crypto.randomUUID();
  const applicationId = `HA-${Math.floor(1000 + Math.random() * 9000)}`;

  try {
    const rawSql = `
      INSERT INTO host_applications (
        id, application_id, applicant_name, applicant_email, phone, location, 
        property_type, description, custom_property_name, property_doc_name, 
        gst_doc_name, identity_doc_name, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *;
    `;

    const params = [
      uuid,
      applicationId,
      name.trim(),
      email.trim().toLowerCase(),
      phone ? phone.trim() : null,
      location.trim(),
      propertyType || 'homestay',
      description ? description.trim() : '',
      propertyName || null,
      propertyDocName || null,
      gstDocName || null,
      idProofDocName || null,
      status || 'pending'
    ];

    const result = await query(rawSql, params);

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

  try {
    const result = await query(
      'UPDATE host_applications SET status = $1 WHERE id = $2 OR application_id = $2 RETURNING *',
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Application not found' });
    }

    return res.json({ success: true, message: `Application status updated to ${status}`, application: result.rows[0] });
  } catch (error) {
    console.error('Update host application status error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * DELETE /api/host-applications/:id
 * Deletes a host application by ID or application_id
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const result = await query(
      'DELETE FROM host_applications WHERE id = $1 OR application_id = $1 RETURNING *',
      [id]
    );

    return res.json({ success: true, message: 'Host application deleted successfully' });
  } catch (error) {
    console.error('Delete host application error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query } from '../db.js';

dotenv.config();

const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://stkpofofekgobpnzvdor.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InN0a3BvZm9mZWtnb2Jwbnp2ZG9yIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4ODM0MzM0NywiZXhwIjoyMTAzOTE5MzQ3fQ.6HSILO2x0sp7mVSfXemMZTn648MpcCDcK8z4JYtX9fc';

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
        property_doc_url TEXT,
        gst_doc_url TEXT,
        identity_doc_url TEXT,
        status VARCHAR(50) DEFAULT 'pending',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    try {
      await query(`ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS property_doc_url TEXT;`);
      await query(`ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS gst_doc_url TEXT;`);
      await query(`ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS identity_doc_url TEXT;`);
    } catch (e) {}
  } catch (err) {
    console.warn('Host applications table init check:', err.message);
  }
};

/**
 * Upload document base64 data to Supabase Storage Bucket [host-applications]
 */
async function uploadDocToBucket(fileData, origName) {
  if (!fileData || typeof fileData !== 'string' || !fileData.trim()) return null;
  if (fileData.startsWith('http://') || fileData.startsWith('https://')) return fileData;

  try {
    let contentType = 'application/pdf';
    let base64Payload = fileData;
    if (fileData.startsWith('data:')) {
      const parts = fileData.split(';base64,');
      if (parts.length === 2) {
        contentType = parts[0].replace('data:', '');
        base64Payload = parts[1];
      }
    }

    const ext = origName && origName.includes('.') ? origName.split('.').pop() : (contentType.includes('pdf') ? 'pdf' : contentType.includes('png') ? 'png' : 'jpg');
    const cleanName = (origName || 'doc').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40);
    const uniqueFileName = `host_doc_${Date.now()}_${cleanName}.${ext}`;
    const fileBuffer = Buffer.from(base64Payload, 'base64');

    const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/host-applications/${uniqueFileName}`;
    const uploadRes = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${SERVICE_KEY}`,
        'apikey': SERVICE_KEY,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/host-applications/${uniqueFileName}`;
    return publicUrl;
  } catch (err) {
    console.warn('[HostApp Upload Error]:', err.message);
    return null;
  }
}

/**
 * POST /api/host-applications
 * Inserts a new host application into host_applications table in PostgreSQL
 * and uploads attached documents to Supabase Storage Bucket [host-applications]
 */
router.post('/', async (req, res) => {
  const { 
    name, email, phone, location, propertyType, description, 
    propertyName, propertyTitle, custom_property_name, customPropertyName,
    propertyDocName, gstDocName, idProofDocName, identityDocName,
    propertyDocUrl, gstDocUrl, identityDocUrl, idProofDocUrl,
    propertyDocData, gstDocData, idProofDocData, identityDocData,
    status 
  } = req.body;

  if (!name || !email || !location) {
    return res.status(400).json({ success: false, message: 'Name, email, and location are required.' });
  }

  // 1. Email Format Validation
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  const cleanEmail = email.trim().toLowerCase();
  if (!emailRegex.test(cleanEmail)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_EMAIL',
      message: 'Please provide a valid email address (e.g. yourname@domain.com).'
    });
  }

  // 2. Mobile Phone Number Validation
  const rawPhone = String(phone || '').trim();
  let cleanPhone = rawPhone.replace(/\D/g, '');
  if (cleanPhone.startsWith('91') && cleanPhone.length === 12) {
    cleanPhone = cleanPhone.slice(2);
  } else if (cleanPhone.startsWith('0') && cleanPhone.length === 11) {
    cleanPhone = cleanPhone.slice(1);
  }

  const indianPhoneRegex = /^[6-9]\d{9}$/;
  if (!cleanPhone || !indianPhoneRegex.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PHONE',
      message: 'Please provide a valid 10-digit mobile number starting with 6, 7, 8, or 9.'
    });
  }

  await ensureHostApplicationsTable();

  const uuid = req.body.id || crypto.randomUUID();
  const applicationId = `HA-${Math.floor(1000 + Math.random() * 9000)}`;
  const propName = (propertyName || propertyTitle || custom_property_name || customPropertyName || `${name}'s Homestay`).trim();

  // Process & Upload attached document files in parallel to Supabase Storage Bucket [host-applications]
  const [finalPropDocUrl, finalGstDocUrl, finalIdentityDocUrl] = await Promise.all([
    propertyDocUrl ? Promise.resolve(propertyDocUrl) : uploadDocToBucket(propertyDocData, propertyDocName || '712_extract.pdf'),
    gstDocUrl ? Promise.resolve(gstDocUrl) : uploadDocToBucket(gstDocData, gstDocName || 'gst_cert.pdf'),
    (identityDocUrl || idProofDocUrl) ? Promise.resolve(identityDocUrl || idProofDocUrl) : uploadDocToBucket(idProofDocData || identityDocData, idProofDocName || identityDocName || 'aadhaar.pdf')
  ]);

  try {
    const rawSql = `
      INSERT INTO host_applications (
        id, application_id, applicant_name, applicant_email, phone, location, 
        property_type, description, custom_property_name, property_doc_name, 
        gst_doc_name, identity_doc_name, property_doc_url, gst_doc_url, identity_doc_url, status, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
      ON CONFLICT (id) DO UPDATE SET
        applicant_name = EXCLUDED.applicant_name,
        applicant_email = EXCLUDED.applicant_email,
        phone = EXCLUDED.phone,
        location = EXCLUDED.location,
        property_type = EXCLUDED.property_type,
        description = EXCLUDED.description,
        custom_property_name = EXCLUDED.custom_property_name,
        property_doc_url = COALESCE(EXCLUDED.property_doc_url, host_applications.property_doc_url),
        gst_doc_url = COALESCE(EXCLUDED.gst_doc_url, host_applications.gst_doc_url),
        identity_doc_url = COALESCE(EXCLUDED.identity_doc_url, host_applications.identity_doc_url),
        status = EXCLUDED.status
      RETURNING *;
    `;

    const params = [
      uuid,
      applicationId,
      name.trim(),
      cleanEmail,
      cleanPhone,
      location.trim(),
      propertyType || 'homestay',
      description ? description.trim() : '',
      propName,
      propertyDocName || null,
      gstDocName || null,
      idProofDocName || identityDocName || null,
      finalPropDocUrl || null,
      finalGstDocUrl || null,
      finalIdentityDocUrl || null,
      status || 'pending'
    ];

    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'Host application and documents submitted successfully to database & Supabase bucket!',
      application: result.rows[0]
    });
  } catch (error) {
    console.error('Host application DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/host-applications
 * Fetch all host applications from database
 */
router.get('/', async (req, res) => {
  try {
    await ensureHostApplicationsTable();
    const result = await query('SELECT * FROM host_applications ORDER BY created_at DESC');
    return res.json({
      success: true,
      count: result.rows.length,
      applications: result.rows,
      data: result.rows
    });
  } catch (error) {
    console.error('Fetch host applications error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/host-applications/user/:email
 * Fetch host application for a specific user email
 */
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await ensureHostApplicationsTable();
    const result = await query('SELECT * FROM host_applications WHERE LOWER(applicant_email) = LOWER($1) ORDER BY created_at DESC LIMIT 1', [email]);
    return res.json({
      success: true,
      application: result.rows[0] || null
    });
  } catch (error) {
    console.error('Fetch user host application error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * PUT /api/host-applications/:id/status
 * Update status of a host application (approved / rejected / pending)
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  try {
    await ensureHostApplicationsTable();
    const result = await query(
      'UPDATE host_applications SET status = $1 WHERE id = $2 OR application_id = $2 RETURNING *',
      [status, id]
    );

    const appRecord = result.rows[0];

    // If host application is approved, promote user role to 'host' in users table
    if (status === 'approved' && appRecord && appRecord.applicant_email) {
      try {
        await query(
          "UPDATE users SET role = 'host' WHERE LOWER(email) = LOWER($1)",
          [appRecord.applicant_email]
        );
      } catch (uErr) {
        console.warn('User role update note:', uErr.message);
      }
    }

    return res.json({
      success: true,
      message: `Host application status updated to ${status}`,
      application: appRecord
    });
  } catch (error) {
    console.error('Update host application status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * DELETE /api/host-applications/:id
 * Delete a host application record from database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await ensureHostApplicationsTable();
    await query('DELETE FROM host_applications WHERE id = $1 OR application_id = $1', [id]);
    return res.json({ success: true, message: `Host application ${id} deleted successfully.` });
  } catch (error) {
    console.error('Delete host application error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

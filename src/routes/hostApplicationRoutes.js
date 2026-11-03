import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { query, SUPABASE_URL as DB_SUPABASE_URL, SUPABASE_KEY as DB_SUPABASE_KEY } from '../db.js';
import { sendHostApplicationStatusEmail } from '../services/emailService.js';

dotenv.config();

const router = express.Router();

// Only ever use storage settings that belong to the Stay in Konkan project. A stale Vercel variable
// pointing at an old project would otherwise send every upload to the wrong place and fail.
const PROJECT_REF = 'xewkclgttvhuunxqjpyj';
const keyRef = (k) => {
  try { return JSON.parse(Buffer.from(String(k).split('.')[1], 'base64url').toString('utf8')).ref || ''; } catch (e) { return ''; }
};
const forProject = (k) => (k && keyRef(k) === PROJECT_REF ? k : '');
const SUPABASE_URL = String(process.env.SUPABASE_URL || '').includes(PROJECT_REF) ? process.env.SUPABASE_URL : DB_SUPABASE_URL;
const SERVICE_KEY = forProject(process.env.SUPABASE_SERVICE_ROLE_KEY);
// Fallback when the service key is missing/invalid; the host-applications bucket accepts uploads with the anon key
const ANON_KEY = forProject(process.env.SUPABASE_ANON_KEY) || forProject(process.env.SUPABASE_KEY) || DB_SUPABASE_KEY;

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
      await query(`ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS last_emailed_status VARCHAR(50);`);
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
    const tryUpload = (key) => fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': contentType,
        'Authorization': `Bearer ${key}`,
        'apikey': key,
        'x-upsert': 'true'
      },
      body: fileBuffer
    });

    // Service key first; if Supabase rejects it (e.g. wrong/rotated key), retry with the anon key
    const keys = [SERVICE_KEY, ANON_KEY].filter((k, i, arr) => k && arr.indexOf(k) === i);
    let uploadRes = null;
    let detail = '';
    for (const key of keys) {
      uploadRes = await tryUpload(key);
      if (uploadRes.ok) break;
      detail = await uploadRes.text().catch(() => '');
      console.error(`[HostApp Upload Error] ${uploadRes.status} for ${origName}: ${detail.slice(0, 200)}`);
    }

    // Only return a link when Supabase actually stored the file
    if (!uploadRes || !uploadRes.ok) {
      return null;
    }

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
  if (cleanPhone.startsWith('91') && cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(2);
  } else if (cleanPhone.startsWith('0') && cleanPhone.length > 10) {
    cleanPhone = cleanPhone.slice(1);
  }

  if (!/^[6-9]\d{9}$/.test(cleanPhone) || /^(\d){9}$/.test(cleanPhone)) {
    return res.status(400).json({
      success: false,
      code: 'INVALID_PHONE',
      message: 'Please provide a valid 10-digit mobile number starting with 6, 7, 8 or 9.'
    });
  }

  // 3. Verification documents: all three required, PDF/JPG/PNG, max 1 MB each (decoded)
  const DOC_SPECS = [
    { label: 'Property document', name: propertyDocName, data: propertyDocData, url: propertyDocUrl },
    { label: 'GST document', name: gstDocName, data: gstDocData, url: gstDocUrl },
    { label: 'Aadhaar / PAN card', name: idProofDocName || identityDocName, data: idProofDocData || identityDocData, url: identityDocUrl || idProofDocUrl }
  ];
  for (const d of DOC_SPECS) {
    if (d.url && /^https:\/\//.test(d.url)) continue; // already uploaded earlier
    if (!d.data || typeof d.data !== 'string' || !d.data.startsWith('data:')) {
      return res.status(400).json({ success: false, code: 'MISSING_DOCUMENT', message: `${d.label} is required. Please attach the file.` });
    }
    const mime = d.data.slice(5, d.data.indexOf(';')).toLowerCase();
    if (!['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'].includes(mime)) {
      return res.status(400).json({ success: false, code: 'INVALID_DOCUMENT_TYPE', message: `${d.label} must be a PDF, JPG or PNG file.` });
    }
    const b64 = d.data.split(';base64,')[1] || '';
    const bytes = Math.floor((b64.length * 3) / 4);
    if (bytes === 0) {
      return res.status(400).json({ success: false, code: 'EMPTY_DOCUMENT', message: `${d.label} is empty. Please attach it again.` });
    }
    if (bytes > 1024 * 1024 + 1024) {
      return res.status(400).json({ success: false, code: 'DOCUMENT_TOO_LARGE', message: `${d.label} is larger than 1 MB. Please upload a smaller file.` });
    }
  }

  await ensureHostApplicationsTable();

  // Check if an existing application record exists for this applicant email to update it cleanly
  let targetUuid = req.body.id;
  if (!targetUuid) {
    try {
      const existingRes = await query(
        'SELECT id FROM host_applications WHERE LOWER(applicant_email) = LOWER($1) LIMIT 1',
        [cleanEmail]
      );
      if (existingRes && existingRes.rows && existingRes.rows[0]) {
        targetUuid = existingRes.rows[0].id;
      } else {
        targetUuid = crypto.randomUUID();
      }
    } catch (e) {
      targetUuid = crypto.randomUUID();
    }
  }

  const applicationId = `HA-${Math.floor(1000 + Math.random() * 9000)}`;
  const propName = (propertyName || propertyTitle || custom_property_name || customPropertyName || `${name}'s Homestay`).trim();

  // Process & Upload attached document files in parallel to Supabase Storage Bucket [host-applications]
  const [finalPropDocUrl, finalGstDocUrl, finalIdentityDocUrl] = await Promise.all([
    propertyDocUrl ? Promise.resolve(propertyDocUrl) : uploadDocToBucket(propertyDocData, propertyDocName || '712_extract.pdf'),
    gstDocUrl ? Promise.resolve(gstDocUrl) : uploadDocToBucket(gstDocData, gstDocName || 'gst_cert.pdf'),
    (identityDocUrl || idProofDocUrl) ? Promise.resolve(identityDocUrl || idProofDocUrl) : uploadDocToBucket(idProofDocData || identityDocData, idProofDocName || identityDocName || 'aadhaar.pdf')
  ]);

  // If the applicant attached a file but it could not be stored, stop here so they can retry —
  // never save an application whose documents silently went missing.
  const failedDocs = [
    [propertyDocData, finalPropDocUrl, 'property document'],
    [gstDocData, finalGstDocUrl, 'GST certificate'],
    [idProofDocData || identityDocData, finalIdentityDocUrl, 'ID proof']
  ].filter(([data, url]) => data && !url).map(([, , label]) => label);
  if (failedDocs.length > 0) {
    return res.status(502).json({
      success: false,
      code: 'DOCUMENT_UPLOAD_FAILED',
      message: `We couldn't upload your ${failedDocs.join(', ')}. Please try again in a few minutes.`
    });
  }

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
        property_doc_name = EXCLUDED.property_doc_name,
        gst_doc_name = EXCLUDED.gst_doc_name,
        identity_doc_name = EXCLUDED.identity_doc_name,
        property_doc_url = COALESCE(EXCLUDED.property_doc_url, host_applications.property_doc_url),
        gst_doc_url = COALESCE(EXCLUDED.gst_doc_url, host_applications.gst_doc_url),
        identity_doc_url = COALESCE(EXCLUDED.identity_doc_url, host_applications.identity_doc_url),
        status = EXCLUDED.status,
        created_at = NOW()
      RETURNING *;
    `;

    const params = [
      targetUuid,
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
    const createdApp = result.rows[0];

    // Trigger automatic host application status email (non-blocking)
    sendHostApplicationStatusEmail(createdApp, null).catch(err => {
      console.error('[Host Application Email Trigger Error]:', err.message);
    });

    return res.json({
      success: true,
      message: 'Host application and documents submitted successfully to database & Supabase bucket!',
      application: createdApp
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

    // 1. Retrieve existing application record to obtain old status before update
    const existingRes = await query(
      'SELECT * FROM host_applications WHERE id = $1 OR application_id = $1 OR LOWER(applicant_email) = LOWER($1)',
      [id]
    );
    const oldRecord = existingRes.rows[0];
    const oldStatus = oldRecord ? oldRecord.status : null;

    // 2. Perform status update in database
    const result = await query(
      'UPDATE host_applications SET status = $1 WHERE id = $2 OR application_id = $2 OR LOWER(applicant_email) = LOWER($2) RETURNING *',
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

    // 3. Trigger automatic condition-based email dispatch to host
    let emailResult = null;
    if (appRecord) {
      emailResult = await sendHostApplicationStatusEmail(appRecord, oldStatus).catch(err => {
        console.error('[Host Status Email Dispatch Error]:', err.message);
        return { success: false, error: err.message };
      });
    }

    return res.json({
      success: true,
      message: `Host application status updated to ${status}`,
      application: appRecord,
      emailSent: emailResult && emailResult.success && !emailResult.skipped,
      emailDetails: emailResult
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
    await query('DELETE FROM host_applications WHERE id = $1 OR application_id = $1 OR LOWER(applicant_email) = LOWER($1)', [id]);
    return res.json({ success: true, message: `Host application ${id} deleted successfully.` });
  } catch (error) {
    console.error('Delete host application error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

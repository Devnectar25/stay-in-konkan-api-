import express from 'express';
import dotenv from 'dotenv';

dotenv.config();
const router = express.Router();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://luggntcaytyyyedeytha.supabase.co';
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1Z2dudGNheXR5eXllZGV5dGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwNDc1MCwiZXhwIjoyMTAyOTgwNzUwfQ.sS3XlFeYB47RYZwl0_JskrV82Z_LuO3BEjCR3eh67jk';

const ALLOWED_BUCKETS = ['properties', 'host-applications', 'avatars', 'documents', 'wishlists', 'issues'];

/**
 * POST /api/upload
 * Uploads an image or document file (base64 data URL) to Supabase Storage Bucket
 */
router.post('/', async (req, res) => {
  try {
    const { fileData, base64, fileBase64, fileName, originalName, bucket } = req.body;

    const rawFileStr = fileData || base64 || fileBase64;
    if (!rawFileStr) {
      return res.status(400).json({
        success: false,
        message: 'No file data provided. Please send fileData or fileBase64 as a base64 string or data URL.'
      });
    }

    // Determine target bucket
    let targetBucket = (bucket || 'documents').toLowerCase().trim();
    if (!ALLOWED_BUCKETS.includes(targetBucket)) {
      targetBucket = 'documents';
    }

    // Parse base64 header and content type
    let contentType = 'application/octet-stream';
    let base64Payload = rawFileStr;

    if (rawFileStr.startsWith('data:')) {
      const parts = rawFileStr.split(';base64,');
      if (parts.length === 2) {
        contentType = parts[0].replace('data:', '');
        base64Payload = parts[1];
      }
    }

    // Sanitize and generate unique filename
    const origName = fileName || originalName || 'file';
    const ext = origName.includes('.') ? origName.split('.').pop() : (contentType.includes('pdf') ? 'pdf' : contentType.includes('png') ? 'png' : contentType.includes('jpeg') || contentType.includes('jpg') ? 'jpg' : 'bin');
    const cleanBaseName = origName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 50);
    const uniqueFileName = `${Date.now()}_${cleanBaseName}.${ext}`;

    const fileBuffer = Buffer.from(base64Payload, 'base64');

    // Upload file to Supabase Storage Bucket via REST API
    const uploadEndpoint = `${SUPABASE_URL}/storage/v1/object/${targetBucket}/${uniqueFileName}`;
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

    const resultData = await uploadRes.json();

    if (!uploadRes.ok && !resultData.Key) {
      console.error('[Upload API] Supabase storage error:', resultData);
      return res.status(500).json({
        success: false,
        message: resultData.message || resultData.error || 'Failed to store file in Supabase bucket.',
        error: resultData
      });
    }

    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${targetBucket}/${uniqueFileName}`;

    return res.json({
      success: true,
      message: `File uploaded successfully to Supabase bucket [${targetBucket}]!`,
      url: publicUrl,
      publicUrl: publicUrl,
      bucket: targetBucket,
      fileName: uniqueFileName
    });
  } catch (err) {
    console.error('[Upload API Exception]:', err);
    return res.status(500).json({
      success: false,
      message: err.message || 'Internal server error uploading file.'
    });
  }
});

export default router;

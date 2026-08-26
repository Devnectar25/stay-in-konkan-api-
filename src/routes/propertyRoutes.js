import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

let isSeeded = false;
const seedDatabasePropertiesIfEmpty = async () => {
  // Hardcoded mock properties removed — only real user/host database properties are served
  return;
};

/**
 * GET /api/properties
 * Raw SQL query to fetch property listings with optional location filtering
 */
router.get('/', async (req, res) => {
  const { location, type } = req.query;

  try {
    await seedDatabasePropertiesIfEmpty();

    let rawSql = `SELECT * FROM properties WHERE status IS NULL OR LOWER(status) != 'rejected'`;
    const params = [];

    if (location) {
      params.push(`%${location.trim().toLowerCase()}%`);
      rawSql += ` AND LOWER(location) LIKE $${params.length}`;
    }

    if (type) {
      params.push(type.trim().toLowerCase());
      rawSql += ` AND LOWER(type) = $${params.length}`;
    }

    rawSql += ` ORDER BY created_at DESC`;

    const result = await query(rawSql, params);
    const dbProperties = (result.rows || []).map(p => {
      const fallbackTitle = p.title && p.title !== 'EMPTY' ? p.title : (p.name && p.name !== 'EMPTY' ? p.name : 'Konkan Homestay');
      const parsedRooms = typeof p.rooms === 'string' ? (() => { try { return JSON.parse(p.rooms); } catch (e) { return []; } })() : (p.rooms || []);
      return {
        ...p,
        title: fallbackTitle,
        name: fallbackTitle,
        hostName: p.host_name || p.host || 'Registered Host',
        host_name: p.host_name || p.host || 'Registered Host',
        host: p.host || p.host_name || 'Registered Host',
        hostPhone: p.host_phone || p.phone || '',
        host_phone: p.host_phone || p.phone || '',
        facilityImage1: p.facility1_image || p.facilityImage1 || '',
        facilityImage2: p.facility2_image || p.facilityImage2 || '',
        facilityImage3: p.facility3_image || p.facilityImage3 || '',
        facility1_image: p.facility1_image || p.facilityImage1 || '',
        facility2_image: p.facility2_image || p.facilityImage2 || '',
        facility3_image: p.facility3_image || p.facilityImage3 || '',
        rooms: parsedRooms
      };
    });
    return res.json({ success: true, count: dbProperties.length, properties: dbProperties, data: dbProperties });
  } catch (error) {
    console.error('Fetch properties error:', error);
    return res.json({ success: true, count: 0, properties: [], data: [], notice: 'Database error' });
  }
});

/**
 * GET /api/properties/:id
 * Raw SQL query to fetch a single property details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;
  const normalizedId = (id || '').trim().toLowerCase();
  const hyphenatedId = normalizedId.replace(/_/g, '-');

  try {
    const rawSql = `
      SELECT * FROM properties 
      WHERE LOWER(id) = $1 
         OR LOWER(id) = $2 
         OR LOWER(REPLACE(id, '_', '-')) = $2
    `;
    const result = await query(rawSql, [normalizedId, hyphenatedId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Property not found' });
    }

    const prop = result.rows[0];
    const fallbackTitle = prop.title && prop.title !== 'EMPTY' ? prop.title : (prop.name && prop.name !== 'EMPTY' ? prop.name : 'Konkan Homestay');
    const parsedRooms = typeof prop.rooms === 'string' ? (() => { try { return JSON.parse(prop.rooms); } catch (e) { return []; } })() : (prop.rooms || []);
    
    prop.title = fallbackTitle;
    prop.name = fallbackTitle;
    prop.hostName = prop.host_name || prop.host || 'Registered Host';
    prop.host_name = prop.host_name || prop.host || 'Registered Host';
    prop.host = prop.host || prop.host_name || 'Registered Host';
    prop.hostPhone = prop.host_phone || prop.phone || '';
    prop.host_phone = prop.host_phone || prop.phone || '';
    prop.facilityImage1 = prop.facility1_image || prop.facilityImage1 || '';
    prop.facilityImage2 = prop.facility2_image || prop.facilityImage2 || '';
    prop.facilityImage3 = prop.facility3_image || prop.facilityImage3 || '';
    prop.facility1_image = prop.facility1_image || prop.facilityImage1 || '';
    prop.facility2_image = prop.facility2_image || prop.facilityImage2 || '';
    prop.facility3_image = prop.facility3_image || prop.facilityImage3 || '';
    prop.rooms = parsedRooms;

    return res.json({ success: true, property: prop });
  } catch (error) {
    console.error('Get property error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * POST /api/properties
 * Saves a new property listing to properties table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const {
    id,
    title,
    name,
    location,
    price,
    price_per_night,
    pricePerNight,
    type,
    description,
    amenities,
    image,
    image_url,
    status,
    host,
    host_name,
    hostName,
    host_email,
    hostEmail,
    host_phone,
    hostPhone,
    facility1_image,
    facility2_image,
    facility3_image,
    facilityImage1,
    facilityImage2,
    facilityImage3,
    rooms
  } = req.body;

  const finalTitle = (title || name || 'Konkan Homestay').trim();
  const finalLocation = (location || 'Konkan Coast, Maharashtra').trim();
  const finalPrice = Number(price || price_per_night || pricePerNight || 1500);
  const finalType = (type || 'homestay').trim().toLowerCase();
  const finalDesc = (description || 'Authentic Konkan homestay listing.').trim();
  const finalImage = image || image_url || '/assets/images/properties/konkan_village_home.png';
  const finalStatus = (status || 'live').trim().toLowerCase();
  const propId = (id || `prop-${Date.now()}`).trim();
  const finalHostName = host_name || hostName || host || 'Registered Host';
  const finalHostEmail = host_email || hostEmail || 'host@stayinkonkan.com';
  const finalHostPhone = host_phone || hostPhone || '';
  const finalFac1 = facility1_image || facilityImage1 || null;
  const finalFac2 = facility2_image || facilityImage2 || null;
  const finalFac3 = facility3_image || facilityImage3 || null;
  const finalRooms = typeof rooms === 'string' ? rooms : JSON.stringify(rooms || []);

  try {
    const rawSql = `
      INSERT INTO properties (
        id, title, description, location, type, price_per_night, image_url, status,
        facility1_image, facility2_image, facility3_image, rooms, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        location = EXCLUDED.location,
        type = EXCLUDED.type,
        price_per_night = EXCLUDED.price_per_night,
        image_url = EXCLUDED.image_url,
        status = EXCLUDED.status,
        facility1_image = EXCLUDED.facility1_image,
        facility2_image = EXCLUDED.facility2_image,
        facility3_image = EXCLUDED.facility3_image,
        rooms = EXCLUDED.rooms
      RETURNING *;
    `;

    const result = await query(rawSql, [
      propId,
      finalTitle,
      finalDesc,
      finalLocation,
      finalType,
      finalPrice,
      finalImage,
      finalStatus,
      finalFac1,
      finalFac2,
      finalFac3,
      finalRooms
    ]);

    return res.json({ success: true, property: result.rows[0] });
  } catch (error) {
    console.error('Create property error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * PUT /api/properties/:id/featured
 * Updates is_featured flag of a property (e.g. true or false)
 */
router.put('/:id/featured', async (req, res) => {
  const { id } = req.params;
  const { is_featured, showOnHomeScreen } = req.body;
  const flag = is_featured !== undefined ? Boolean(is_featured) : Boolean(showOnHomeScreen);

  try {
    const rawSql = `
      UPDATE properties
      SET is_featured = $1, updated_at = NOW()
      WHERE LOWER(id) = LOWER($2) OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($2, '_', '-'))
      RETURNING *;
    `;
    const result = await query(rawSql, [flag, id.trim()]);
    return res.json({ success: true, message: 'Property featured status updated', property: result.rows[0] });
  } catch (error) {
    console.error('Update property featured error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * PUT /api/properties/:id/status
 * Updates status of a property (e.g. 'live', 'pending', 'rejected')
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required' });
  }

  try {
    const rawSql = `
      UPDATE properties
      SET status = $1, updated_at = NOW()
      WHERE LOWER(id) = LOWER($2) OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($2, '_', '-'))
      RETURNING *;
    `;
    const result = await query(rawSql, [status.toLowerCase().trim(), id.trim()]);
    return res.json({ success: true, message: 'Property status updated', property: result.rows[0] });
  } catch (error) {
    console.error('Update property status error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * PUT /api/properties/:id
 * Updates an existing property in PostgreSQL safely without overwriting fields with NULL/EMPTY
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
    originalId,
    originalTitle,
    title,
    name,
    location,
    price,
    price_per_night,
    pricePerNight,
    type,
    description,
    amenities,
    image,
    image_url,
    status,
    host,
    host_name,
    hostName,
    host_email,
    hostEmail,
    host_phone,
    hostPhone,
    facilityImage1,
    facilityImage2,
    facilityImage3,
    facility1_image,
    facility2_image,
    facility3_image,
    rooms,
    is_featured,
    isFeatured,
    showOnHomeScreen
  } = req.body;

  const passedTitle = title || name ? (title || name).trim() : null;
  const passedLocation = location ? location.trim() : null;
  const passedPrice = (price || price_per_night || pricePerNight) ? Number(price || price_per_night || pricePerNight) : null;
  const passedType = type ? type.trim().toLowerCase() : null;
  const passedDesc = description ? description.trim() : null;
  const passedImage = image || image_url || null;
  const passedStatus = status ? status.trim().toLowerCase() : null;
  const passedHostName = host_name || hostName || host || null;
  const passedHostEmail = host_email || hostEmail || null;
  const passedHostPhone = host_phone || hostPhone || null;
  const passedFac1 = facility1_image || facilityImage1 || null;
  const passedFac2 = facility2_image || facilityImage2 || null;
  const passedFac3 = facility3_image || facilityImage3 || null;
  const passedRooms = rooms !== undefined ? (typeof rooms === 'string' ? rooms : JSON.stringify(rooms || [])) : null;
  const passedIsFeatured = (is_featured !== undefined && is_featured !== null) ? Boolean(is_featured) : ((isFeatured !== undefined && isFeatured !== null) ? Boolean(isFeatured) : ((showOnHomeScreen !== undefined && showOnHomeScreen !== null) ? Boolean(showOnHomeScreen) : null));

  const lookupId = (originalId || id || '').trim();
  const lookupTitle = (originalTitle || title || name || '').trim();

  try {
    const rawSql = `
      UPDATE properties
      SET 
        title = COALESCE(NULLIF($1, ''), NULLIF(title, 'EMPTY'), NULLIF(name, 'EMPTY'), title),
        name = COALESCE(NULLIF($1, ''), NULLIF(name, 'EMPTY'), NULLIF(title, 'EMPTY'), name),
        location = COALESCE(NULLIF($2, ''), location),
        price = CASE WHEN $3 IS NOT NULL AND $3 > 0 THEN $3 ELSE COALESCE(price, 1500) END,
        type = COALESCE(NULLIF($4, ''), type),
        description = COALESCE(NULLIF($5, ''), description),
        image = COALESCE($6, image),
        image_url = COALESCE($6, image_url),
        status = COALESCE(NULLIF($7, ''), status),
        host = COALESCE($8, host),
        host_name = COALESCE($8, host_name),
        host_email = COALESCE($9, host_email),
        host_phone = COALESCE($10, host_phone),
        facility1_image = COALESCE($11, facility1_image),
        facility2_image = COALESCE($12, facility2_image),
        facility3_image = COALESCE($13, facility3_image),
        rooms = COALESCE($14, rooms),
        is_featured = COALESCE($15, is_featured)
      WHERE LOWER(id) = LOWER($16) 
         OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($16, '_', '-')) 
         OR LOWER(title) = LOWER($16)
         OR LOWER(title) = LOWER($17)
         OR LOWER(name) = LOWER($16)
         OR LOWER(name) = LOWER($17)
      RETURNING *;
    `;

    const result = await query(rawSql, [
      passedTitle,
      passedLocation,
      passedPrice,
      passedType,
      passedDesc,
      passedImage,
      passedStatus,
      passedHostName,
      passedHostEmail,
      passedHostPhone,
      passedFac1,
      passedFac2,
      passedFac3,
      passedRooms,
      passedIsFeatured,
      lookupId,
      lookupTitle
    ]);

    if (!result.rows || result.rows.length === 0) {
      const propIdToSave = lookupId || `prop-${Date.now()}`;
      const insertSql = `
        INSERT INTO properties (id, title, name, location, price, type, description, image, image_url, status, host, host_name, host_email, host_phone, facility1_image, facility2_image, facility3_image, rooms)
        VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          name = EXCLUDED.name,
          location = EXCLUDED.location,
          price = EXCLUDED.price,
          type = EXCLUDED.type,
          description = EXCLUDED.description,
          image = EXCLUDED.image,
          image_url = EXCLUDED.image_url,
          status = EXCLUDED.status,
          host = EXCLUDED.host,
          host_name = EXCLUDED.host_name,
          host_email = EXCLUDED.host_email,
          host_phone = EXCLUDED.host_phone,
          facility1_image = EXCLUDED.facility1_image,
          facility2_image = EXCLUDED.facility2_image,
          facility3_image = EXCLUDED.facility3_image,
          rooms = EXCLUDED.rooms
        RETURNING *;
      `;
      const insRes = await query(insertSql, [
        propIdToSave,
        passedTitle || 'Konkan Stay',
        passedLocation || 'Konkan Coast',
        passedPrice || 1500,
        passedType || 'homestay',
        passedDesc || '',
        passedImage || '/assets/images/properties/konkan_village_home.png',
        passedStatus || 'live',
        passedHostName || 'Registered Host',
        passedHostEmail || 'host@stayinkonkan.com',
        passedHostPhone || '',
        passedFac1,
        passedFac2,
        passedFac3,
        passedRooms
      ]);
      return res.json({
        success: true,
        message: 'Property saved successfully in database!',
        property: (insRes.rows && insRes.rows[0]) ? insRes.rows[0] : req.body
      });
    }

    return res.json({
      success: true,
      message: 'Property updated successfully in database!',
      property: (result.rows && result.rows[0]) ? result.rows[0] : req.body
    });
  } catch (error) {
    console.error('Update property error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * DELETE /api/properties/:id
 * Deletes a property listing from database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const normalizedId = (id || '').trim();

  try {
    const rawSql = `
      DELETE FROM properties
      WHERE LOWER(id) = LOWER($1) 
         OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($1, '_', '-'))
         OR LOWER(title) = LOWER($1)
    `;
    const result = await query(rawSql, [normalizedId]);
    return res.json({ success: true, message: `Property ${normalizedId} deleted successfully.` });
  } catch (error) {
    console.error('Delete property error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

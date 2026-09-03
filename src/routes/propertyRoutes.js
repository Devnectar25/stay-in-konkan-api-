import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

let isSeeded = false;
const seedDatabasePropertiesIfEmpty = async () => {
  // Hardcoded mock properties removed — only real user/host database properties are served
  return;
};

const ensurePropertyColumns = async () => {
  try {
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT;`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_name VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_email VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_phone VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_languages VARCHAR(255);`);
  } catch (e) {}
};

/**
 * GET /api/properties
 * Raw SQL query to fetch property listings with optional location filtering
 */
router.get('/', async (req, res) => {
  const { location, type, includePending, status: requestedStatus } = req.query;

  try {
    await ensurePropertyColumns();
    await seedDatabasePropertiesIfEmpty();

    const isIncludePending = includePending === 'true' || includePending === '1' || requestedStatus === 'pending' || requestedStatus === 'all';

    let rawSql = isIncludePending
      ? `SELECT * FROM properties WHERE (status IS NULL OR LOWER(status) != 'rejected')`
      : `SELECT * FROM properties WHERE (status IS NULL OR LOWER(status) IN ('live', 'approved'))`;

    const params = [];

    if (location && location.trim() !== '') {
      const cleanLoc = location.trim().toLowerCase();
      const ignoreWords = ['stay', 'stays', 'hotel', 'hotels', 'resort', 'resorts', 'villa', 'villas', 'homestay', 'homestays', 'guest', 'guests', 'room', 'rooms', 'konkan', 'maharashtra'];
      const words = cleanLoc.split(/[\s,/\&]+/).map(w => w.trim()).filter(w => w.length > 1 && !ignoreWords.includes(w));

      if (words.length > 0) {
        const wordConditions = [];
        words.forEach(w => {
          params.push(`%${w}%`);
          const pIdx = params.length;
          wordConditions.push(`(LOWER(location) LIKE $${pIdx} OR LOWER(title) LIKE $${pIdx} OR LOWER(description) LIKE $${pIdx})`);
        });
        rawSql += ` AND (${wordConditions.join(' OR ')})`;
      } else {
        params.push(`%${cleanLoc}%`);
        rawSql += ` AND (LOWER(location) LIKE $${params.length} OR LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
      }
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
      
      let hName = p.host_name || p.host || p.owner_name || p.hostName || '';
      let hEmail = p.host_email || p.owner_email || p.email || p.hostEmail || '';
      let hPhone = p.host_phone || p.phone || p.owner_phone || p.hostPhone || p.contact || '';
      let hLanguages = p.host_languages || p.languages || p.languages_spoken || 'Marathi, Malvani, Hindi & English';

      if (!hName && p.facility1_image && typeof p.facility1_image === 'string' && !p.facility1_image.includes('/') && !p.facility1_image.includes('http')) {
        hName = p.facility1_image;
      }
      if (!hEmail && p.facility2_image && typeof p.facility2_image === 'string' && p.facility2_image.includes('@')) {
        hEmail = p.facility2_image;
      }

      if (!hName) hName = 'Registered Host';

      return {
        ...p,
        title: fallbackTitle,
        name: fallbackTitle,
        hostName: hName,
        host_name: hName,
        host: hName,
        owner_name: hName,
        hostEmail: hEmail,
        host_email: hEmail,
        owner_email: hEmail,
        hostPhone: hPhone,
        host_phone: hPhone,
        owner_phone: hPhone,
        hostLanguages: hLanguages,
        host_languages: hLanguages,
        amenities: p.amenities || '',
        facilityImage1: (p.facility1_image && p.facility1_image.includes('/')) ? p.facility1_image : (p.facilityImage1 || ''),
        facilityImage2: (p.facility2_image && p.facility2_image.includes('/')) ? p.facility2_image : (p.facilityImage2 || ''),
        facilityImage3: (p.facility3_image && p.facility3_image.includes('/')) ? p.facility3_image : (p.facilityImage3 || ''),
        facility1_image: (p.facility1_image && p.facility1_image.includes('/')) ? p.facility1_image : (p.facility1_image || ''),
        facility2_image: (p.facility2_image && p.facility2_image.includes('/')) ? p.facility2_image : (p.facility2_image || ''),
        facility3_image: (p.facility3_image && p.facility3_image.includes('/')) ? p.facility3_image : (p.facility3_image || ''),
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
    await ensurePropertyColumns();
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
    
    let hName = prop.host_name || prop.host || prop.owner_name || prop.hostName || '';
    let hEmail = prop.host_email || prop.owner_email || prop.email || prop.hostEmail || '';
    let hPhone = prop.host_phone || prop.phone || prop.owner_phone || prop.hostPhone || prop.contact || '';
    let hLanguages = prop.host_languages || prop.languages || prop.languages_spoken || '';

    if (!hName && prop.facility1_image && typeof prop.facility1_image === 'string' && !prop.facility1_image.includes('/') && !prop.facility1_image.includes('http')) {
      hName = prop.facility1_image;
    }
    if (!hEmail && prop.facility2_image && typeof prop.facility2_image === 'string' && prop.facility2_image.includes('@')) {
      hEmail = prop.facility2_image;
    }

    try {
      if (hEmail || prop.owner_id || (hName && hName !== 'Registered Host')) {
        const uRes = await query(
          `SELECT full_name, name, email, phone, mobile, contact, languages FROM users WHERE (LOWER(email) = LOWER($1) OR id = $2 OR LOWER(full_name) = LOWER($3)) LIMIT 1;`,
          [hEmail || '', prop.owner_id || '', hName || '']
        );
        if (uRes && uRes.rows && uRes.rows.length > 0) {
          const u = uRes.rows[0];
          if (!hName || hName === 'Registered Host' || hName === 'Local Host') hName = u.full_name || u.name || hName;
          if (!hPhone) hPhone = u.phone || u.mobile || u.contact || hPhone;
          if (!hEmail) hEmail = u.email || hEmail;
          if (!hLanguages && u.languages) hLanguages = u.languages;
        }
        const hRes = await query(
          `SELECT name, full_name, email, phone, mobile, languages FROM hosts WHERE (LOWER(email) = LOWER($1) OR LOWER(name) = LOWER($2)) LIMIT 1;`,
          [hEmail || '', hName || '']
        );
        if (hRes && hRes.rows && hRes.rows.length > 0) {
          const h = hRes.rows[0];
          if (!hName || hName === 'Registered Host' || hName === 'Local Host') hName = h.full_name || h.name || hName;
          if (!hPhone) hPhone = h.phone || h.mobile || hPhone;
          if (!hEmail) hEmail = h.email || hEmail;
          if (!hLanguages && h.languages) hLanguages = h.languages;
        }
      }
    } catch (e) {}

    if (!hName) hName = 'Registered Host';
    if (!hLanguages) hLanguages = 'Marathi, Malvani, Hindi & English';

    prop.title = fallbackTitle;
    prop.name = fallbackTitle;
    prop.hostName = hName;
    prop.host_name = hName;
    prop.host = hName;
    prop.owner_name = hName;
    prop.hostEmail = hEmail;
    prop.host_email = hEmail;
    prop.owner_email = hEmail;
    prop.hostPhone = hPhone;
    prop.host_phone = hPhone;
    prop.owner_phone = hPhone;
    prop.hostLanguages = hLanguages;
    prop.host_languages = hLanguages;
    prop.amenities = prop.amenities || '';
    prop.facilityImage1 = (prop.facility1_image && prop.facility1_image.includes('/')) ? prop.facility1_image : (prop.facilityImage1 || '');
    prop.facilityImage2 = (prop.facility2_image && prop.facility2_image.includes('/')) ? prop.facility2_image : (prop.facilityImage2 || '');
    prop.facilityImage3 = (prop.facility3_image && prop.facility3_image.includes('/')) ? prop.facility3_image : (prop.facilityImage3 || '');
    prop.facility1_image = (prop.facility1_image && prop.facility1_image.includes('/')) ? prop.facility1_image : (prop.facility1_image || '');
    prop.facility2_image = (prop.facility2_image && prop.facility2_image.includes('/')) ? prop.facility2_image : (prop.facility2_image || '');
    prop.facility3_image = (prop.facility3_image && prop.facility3_image.includes('/')) ? prop.facility3_image : (prop.facility3_image || '');
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
    owner_name,
    host_email,
    hostEmail,
    owner_email,
    host_phone,
    hostPhone,
    owner_phone,
    phone,
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
  const finalAmenities = typeof amenities === 'string' ? amenities : JSON.stringify(amenities || []);
  const finalImage = image || image_url || '/assets/images/properties/konkan_village_home.png';
  const finalStatus = (status || 'pending').trim().toLowerCase();
  const propId = (id || `prop-${Date.now()}`).trim();
  const finalHostName = host_name || hostName || host || owner_name || 'Registered Host';
  const finalHostEmail = host_email || hostEmail || owner_email || '';
  const finalHostPhone = host_phone || hostPhone || owner_phone || phone || '';
  const finalFac1 = facility1_image || facilityImage1 || null;
  const finalFac2 = facility2_image || facilityImage2 || null;
  const finalFac3 = facility3_image || facilityImage3 || null;
  const finalRooms = typeof rooms === 'string' ? rooms : JSON.stringify(rooms || []);

  try {
    await ensurePropertyColumns();

    // Check for duplicate property title/name (excluding current id and rejected properties)
    const duplicateCheck = await query(
      `SELECT id, title FROM properties WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) AND id != $2 AND (status IS NULL OR LOWER(status) != 'rejected') LIMIT 1`,
      [finalTitle, propId]
    );

    if (duplicateCheck.rows && duplicateCheck.rows.length > 0) {
      return res.status(400).json({
        success: false,
        code: 'DUPLICATE_PROPERTY_TITLE',
        message: `A property with the name "${finalTitle}" already exists. Please choose a unique name for your property.`
      });
    }

    const rawSql = `
      INSERT INTO properties (
        id, title, description, location, type, price_per_night, image_url, status,
        facility1_image, facility2_image, facility3_image, rooms, amenities,
        host_name, host_email, host_phone, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, NOW())
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
        rooms = EXCLUDED.rooms,
        amenities = EXCLUDED.amenities,
        host_name = EXCLUDED.host_name,
        host_email = EXCLUDED.host_email,
        host_phone = EXCLUDED.host_phone
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
      finalRooms,
      finalAmenities,
      finalHostName,
      finalHostEmail,
      finalHostPhone
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
  const passedAmenities = amenities !== undefined ? (typeof amenities === 'string' ? amenities : JSON.stringify(amenities || [])) : null;
  const passedIsFeatured = (is_featured !== undefined ? is_featured : (isFeatured !== undefined ? isFeatured : (showOnHomeScreen !== undefined ? showOnHomeScreen : null)));

  const lookupId = (originalId || id || '').trim();
  const lookupTitle = (originalTitle || title || name || '').trim();

  try {
    if (passedTitle) {
      const dupCheck = await query(
        `SELECT id, title FROM properties WHERE LOWER(TRIM(title)) = LOWER(TRIM($1)) AND LOWER(id) != LOWER($2) AND LOWER(REPLACE(id, '_', '-')) != LOWER(REPLACE($2, '_', '-')) AND (status IS NULL OR LOWER(status) != 'rejected') LIMIT 1`,
        [passedTitle, lookupId]
      );
      if (dupCheck.rows && dupCheck.rows.length > 0) {
        return res.status(400).json({
          success: false,
          code: 'DUPLICATE_PROPERTY_TITLE',
          message: `A property with the name "${passedTitle}" already exists. Please choose a unique name.`
        });
      }
    }

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
        is_featured = COALESCE($15, is_featured),
        amenities = COALESCE($16, amenities)
      WHERE LOWER(id) = LOWER($17) 
         OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($17, '_', '-')) 
         OR LOWER(title) = LOWER($17)
         OR LOWER(title) = LOWER($18)
         OR LOWER(name) = LOWER($17)
         OR LOWER(name) = LOWER($18)
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
      passedAmenities,
      lookupId,
      lookupTitle
    ]);

    if (!result.rows || result.rows.length === 0) {
      const propIdToSave = lookupId || `prop-${Date.now()}`;
      const insertSql = `
        INSERT INTO properties (id, title, name, location, price, type, description, image, image_url, status, host, host_name, host_email, host_phone, facility1_image, facility2_image, facility3_image, rooms, amenities)
        VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15, $16)
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
          rooms = EXCLUDED.rooms,
          amenities = EXCLUDED.amenities
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
        passedRooms,
        passedAmenities
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

import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

let isSeeded = false;
const seedDatabasePropertiesIfEmpty = async () => {
  if (isSeeded) return;
  isSeeded = true;
  try {
    const checkRes = await query('SELECT COUNT(*) as count FROM properties');
    const count = parseInt(checkRes.rows[0]?.count || 0, 10);
    if (count === 0) {
      const defaultProps = [
        ['shree-ganesh', 'Shree Ganesh Homestay', 'A traditional family-run home near Guhagar beach offering authentic Malvani thalis and a warm village atmosphere.', 'Guhagar, Maharashtra • Near Beach', 'homestay', 1800, 4.9, '/assets/images/properties/konkan_village_home.png', 'live'],
        ['mango-farmstay', 'Mango Farmstay', 'Experience life on a working mango farm. Wake up to the sound of birds and enjoy freshly plucked fruits.', 'Ratnagiri, Maharashtra • Orchard', 'farmstay', 2200, 4.8, '/assets/images/properties/konkan_laterite_house.png', 'live'],
        ['sindhudurg-heritage', 'Sindhudurg Heritage House', 'A restored 100-year-old traditional Konkani courtyard house with red laterite stone walls and antique wooden pillars.', 'Malvan, Maharashtra • Heritage', 'heritage', 3500, 4.95, '/assets/images/home/sindhudurg_heritage_house.png', 'live'],
        ['tarkarli-beach-villa', 'Tarkarli Beach Breeze Villa', 'Luxury seaside villa surrounded by coconut groves with private beach access and scenic ocean views.', 'Tarkarli, Malvan • Beachfront', 'villa', 4200, 4.9, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80', 'live'],
        ['prop-deepmagare-sea-breeze', 'Malvan Sea Breeze Villa', 'Authentic 2-bedroom seaside villa hosted by Deep Magare right on Tarkarli beach.', 'Tarkarli, Malvan, Sindhudurg • Beachfront', 'villa', 2500, 5.0, 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80', 'live'],
        ['guhagar-coastal-hut', 'Guhagar Coastal Coconut Hut', 'Rustic eco-cottage tucked amidst coconut palms 200m from Guhagar white sand beach.', 'Guhagar, Maharashtra • Coconut Grove', 'homestay', 1900, 4.85, 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80', 'live'],
        ['ratnagiri-spice-farm', 'Ratnagiri Organic Spice Farmstay', 'Serene farmstay surrounded by cinnamon, nutmeg, and Alphonso mango plantations.', 'Ratnagiri, Maharashtra • Countryside', 'farmstay', 2400, 4.75, 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80', 'live'],
        ['devgad-mango-villa', 'Devgad Alphonso Haven', 'Cliffside retreat overlooking Devgad harbor with panoramic sunset vistas and fresh sea catch thalis.', 'Devgad, Sindhudurg • Sea View', 'villa', 3800, 4.92, 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80', 'live'],
        ['alibaug-palm-cottage', 'Alibaug Palm Beach Cottage', 'Cozy private cottage with lush green lawns and immediate walkway access to Nagaon beach.', 'Alibaug, Maharashtra • Beachside', 'homestay', 3100, 4.8, 'https://images.unsplash.com/photo-1587061949409-02df41d5e562?auto=format&fit=crop&w=800&q=80', 'live'],
        ['kashid-white-sand', 'Kashid White Sand Villa', 'Modern luxury villa situated on Kashid hillside featuring infinity pool views of the coastline.', 'Kashid, Raigad • Hilltop View', 'villa', 4800, 4.96, 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=800&q=80', 'live'],
        ['chiplun-river-wada', 'Chiplun Vashishti River Wada', 'Peaceful riverside ancestral wada surrounded by lush Sahyadri mountain slopes.', 'Chiplun, Ratnagiri • Riverfront', 'heritage', 2800, 4.88, 'https://images.unsplash.com/photo-1542314831-068cd1dbfeeb?auto=format&fit=crop&w=800&q=80', 'live'],
        ['murud-sea-fort-house', 'Murud Janjira View House', 'Charming coastal house offering direct balcony views of the historic Murud Janjira sea fort.', 'Murud, Raigad • Sea Fort View', 'homestay', 2600, 4.84, 'https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?auto=format&fit=crop&w=800&q=80', 'live']
      ];

      for (const p of defaultProps) {
        await query(
          `INSERT INTO properties (id, title, description, location, type, price_per_night, rating, image_url, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
           ON CONFLICT (id) DO NOTHING`,
          p
        );
      }
    }

    // Auto-repair any orphaned property rows where title or name was saved as EMPTY or NULL in PostgreSQL
    try {
      await query(`
        UPDATE properties
        SET 
          title = 'Konkan Coastal Stay',
          name = 'Konkan Coastal Stay'
        WHERE LOWER(id) = 'prop-1786387042439' AND (title IS NULL OR title = '' OR title = 'EMPTY' OR name IS NULL OR name = '' OR name = 'EMPTY');

        UPDATE properties
        SET 
          title = COALESCE(NULLIF(NULLIF(title, ''), 'EMPTY'), NULLIF(NULLIF(name, ''), 'EMPTY'), 'Konkan Homestay'),
          name = COALESCE(NULLIF(NULLIF(name, ''), 'EMPTY'), NULLIF(NULLIF(title, ''), 'EMPTY'), 'Konkan Homestay')
        WHERE title IS NULL OR title = '' OR title = 'EMPTY' OR name IS NULL OR name = '' OR name = 'EMPTY';
      `);
    } catch (e) {
      console.warn('Property title auto-heal note:', e);
    }
  } catch (err) {
    console.warn('Property auto-seed check:', err.message);
  }
};

/**
 * GET /api/properties
 * Raw SQL query to fetch property listings with optional location filtering
 */
router.get('/', async (req, res) => {
  const { location, type } = req.query;

  try {
    await seedDatabasePropertiesIfEmpty();

    // Auto-repair any DB rows where title or name was saved as EMPTY or blank
    try {
      await query(`
        UPDATE properties
        SET 
          title = CASE 
            WHEN title IS NULL OR title = '' OR title = 'EMPTY' THEN COALESCE(NULLIF(name, ''), NULLIF(name, 'EMPTY'), 'Konkan Homestay')
            ELSE title
          END,
          name = CASE 
            WHEN name IS NULL OR name = '' OR name = 'EMPTY' THEN COALESCE(NULLIF(title, ''), NULLIF(title, 'EMPTY'), 'Konkan Homestay')
            ELSE name
          END
        WHERE title IS NULL OR title = '' OR title = 'EMPTY' OR name IS NULL OR name = '' OR name = 'EMPTY';
      `);
    } catch (e) {
      console.warn('Auto-repair property titles note:', e);
    }

    let rawSql = `SELECT * FROM properties WHERE status IS NULL OR status != 'rejected'`;
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
  const finalStatus = (status || 'pending').trim().toLowerCase();
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
        id, title, name, location, price, type, description, image, image_url, status,
        host, host_name, host_email, host_phone, facility1_image, facility2_image, facility3_image, rooms, created_at
      )
      VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7, $8, $9, $9, $10, $11, $12, $13, $14, $15, NOW())
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

    const result = await query(rawSql, [
      propId,
      finalTitle,
      finalLocation,
      finalPrice,
      finalType,
      finalDesc,
      finalImage,
      finalStatus,
      finalHostName,
      finalHostEmail,
      finalHostPhone,
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
    rooms
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

  const lookupId = (originalId || id || '').trim();
  const lookupTitle = (originalTitle || title || name || '').trim();

  try {
    const rawSql = `
      UPDATE properties
      SET 
        title = COALESCE(NULLIF($1, ''), NULLIF(title, 'EMPTY'), NULLIF(name, 'EMPTY'), 'Konkan Stay'),
        name = COALESCE(NULLIF($1, ''), NULLIF(name, 'EMPTY'), NULLIF(title, 'EMPTY'), 'Konkan Stay'),
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
        rooms = COALESCE($14, rooms)
      WHERE LOWER(id) = LOWER($15) 
         OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($15, '_', '-')) 
         OR LOWER(title) = LOWER($15)
         OR LOWER(title) = LOWER($16)
         OR LOWER(name) = LOWER($15)
         OR LOWER(name) = LOWER($16)
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

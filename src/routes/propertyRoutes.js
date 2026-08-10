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
    const dbProperties = result.rows || [];
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

    return res.json({ success: true, property: result.rows[0] });
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
    name, title, host, host_email, host_phone, location, price, pricePerNight, price_per_night, type, 
    description, image, image_url, rooms, status,
    facility1_image, facility2_image, facility3_image,
    facilityImage1, facilityImage2, facilityImage3
  } = req.body;

  if (!title && !name) {
    return res.status(400).json({ success: false, message: 'Property name or title is required.' });
  }

  const propTitle = (title || name || 'New Konkan Property').trim();
  const propName = (name || title || 'New Konkan Property').trim();
  const propId = req.body.id || req.body.property_id || ('prop-' + Date.now());
  const finalPrice = Number(price || pricePerNight || price_per_night || 2000);
  const finalImage = image || image_url || '/assets/images/home/default_property.png';
  const finalHost = (host || req.body.hostName || req.body.owner_name || 'Local Host').trim();
  const finalHostEmail = (host_email || req.body.hostEmail || req.body.owner_email || '').trim().toLowerCase();
  const finalHostPhone = (host_phone || req.body.hostPhone || '').trim();
  const finalStatus = (status || 'pending').trim().toLowerCase();
  const roomsJson = typeof rooms === 'string' ? rooms : JSON.stringify(rooms || []);
  const finalFac1 = facility1_image || facilityImage1 || null;
  const finalFac2 = facility2_image || facilityImage2 || null;
  const finalFac3 = facility3_image || facilityImage3 || null;

  try {
    const rawSql = `
      INSERT INTO properties (
        id, name, title, host, host_email, host_phone, location, price, type, 
        status, image, image_url, description, rating, reviews_count, rooms, 
        "facility1_image", "facility2_image", "facility3_image", created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        name = EXCLUDED.name,
        host = EXCLUDED.host,
        host_email = EXCLUDED.host_email,
        location = EXCLUDED.location,
        price = EXCLUDED.price,
        type = EXCLUDED.type,
        status = EXCLUDED.status,
        image = EXCLUDED.image,
        image_url = EXCLUDED.image_url,
        description = EXCLUDED.description,
        rooms = EXCLUDED.rooms,
        "facility1_image" = EXCLUDED."facility1_image",
        "facility2_image" = EXCLUDED."facility2_image",
        "facility3_image" = EXCLUDED."facility3_image",
        updated_at = NOW()
      RETURNING *;
    `;

    const params = [
      propId,
      propName,
      propTitle,
      finalHost,
      finalHostEmail,
      finalHostPhone,
      location ? location.trim() : 'Konkan',
      finalPrice,
      type ? type.trim().toLowerCase() : 'homestay',
      finalStatus,
      finalImage,
      finalImage,
      description ? description.trim() : '',
      5.0,
      0,
      roomsJson,
      finalFac1,
      finalFac2,
      finalFac3
    ];

    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'Property saved successfully to database!',
      property: result.rows[0]
    });
  } catch (error) {
    console.error('Property DB save error:', error);
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
 * Updates full property details (title, location, price, type, description, amenities, image, status)
 */
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const {
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
    facilityImage1,
    facilityImage2,
    facilityImage3,
    rooms
  } = req.body;

  const finalTitle = (title || name || '').trim();
  const finalLocation = (location || '').trim();
  const finalPrice = Number(price || price_per_night || pricePerNight || 0);
  const finalType = (type || 'homestay').trim().toLowerCase();
  const finalDesc = (description || '').trim();
  const finalImage = image || image_url || null;
  const finalStatus = (status || 'live').trim().toLowerCase();
  const finalAmenities = amenities || '';
  const finalFacilityImage1 = facilityImage1 || null;
  const finalFacilityImage2 = facilityImage2 || null;
  const finalFacilityImage3 = facilityImage3 || null;
  const finalRooms = typeof rooms === 'string' ? rooms : JSON.stringify(rooms || []);

  try {
    const rawSql = `
      UPDATE properties
      SET 
        title = $1,
        name = $1,
        location = $2,
        price = $3,
        type = $4,
        description = $5,
        image = COALESCE($6, image),
        image_url = COALESCE($6, image_url),
        status = $7,
        facility1_image = COALESCE($8, facility1_image),
        facility2_image = COALESCE($9, facility2_image),
        facility3_image = COALESCE($10, facility3_image),
        rooms = $11,
        updated_at = NOW()
      WHERE LOWER(id) = LOWER($12) OR LOWER(REPLACE(id, '_', '-')) = LOWER(REPLACE($12, '_', '-')) OR LOWER(title) = LOWER($12)
      RETURNING *;
    `;

    const result = await query(rawSql, [
      finalTitle,
      finalLocation,
      finalPrice,
      finalType,
      finalDesc,
      finalImage,
      finalStatus,
      finalFacilityImage1,
      finalFacilityImage2,
      finalFacilityImage3,
      finalRooms,
      id.trim()
    ]);

    return res.json({
      success: true,
      message: 'Property updated successfully in database!',
      property: result.rows[0]
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

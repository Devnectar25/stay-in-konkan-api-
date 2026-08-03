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
  const { name, title, host, host_email, host_phone, location, price, type, description, image, rooms } = req.body;

  if (!title && !name) {
    return res.status(400).json({ success: false, message: 'Property name or title is required.' });
  }

  const propId = req.body.id || req.body.property_id || crypto.randomUUID();
  const propTitle = title || name;
  const propName = name || title;

  try {
    const rawSql = `
      INSERT INTO properties (
        id, name, title, host, host_email, host_phone, location, price, type, 
        status, image, description, rating, reviews_count, is_featured, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())
      RETURNING *;
    `;

    const params = [
      propId,
      propName.trim(),
      propTitle.trim(),
      host ? host.trim() : 'Konkan Host',
      host_email ? host_email.trim().toLowerCase() : null,
      host_phone ? host_phone.trim() : null,
      location ? location.trim() : 'Konkan',
      price ? String(price) : '0',
      type ? type.trim().toLowerCase() : 'homestay',
      req.body.status || 'pending',
      image || null,
      description ? description.trim() : '',
      '5.0',
      0,
      true
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

export default router;

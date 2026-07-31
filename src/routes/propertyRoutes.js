import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * GET /api/properties
 * Raw SQL query to fetch property listings with optional location filtering
 */
router.get('/', async (req, res) => {
  const { location, type } = req.query;

  try {
    let rawSql = `SELECT * FROM properties WHERE 1=1`;
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
    const MASTER_12_IDS = [
      'shree-ganesh',
      'mango-farmstay',
      'sindhudurg-heritage',
      'tarkarli-beach-villa',
      'prop-deepmagare-sea-breeze',
      'guhagar-coastal-hut',
      'ratnagiri-spice-farm',
      'devgad-mango-villa',
      'alibaug-palm-cottage',
      'kashid-white-sand',
      'chiplun-river-wada',
      'murud-sea-fort-house'
    ];

    const filteredRows = (result.rows || []).filter(p => p && p.id && (MASTER_12_IDS.includes(p.id) || String(p.id).startsWith('host_prop_') || p.is_custom_host));
    return res.json({ success: true, count: filteredRows.length, properties: filteredRows, data: filteredRows });
  } catch (error) {
    console.error('Fetch properties error:', error);
    return res.json({ success: true, count: 0, properties: [], data: [], notice: 'Database table or connection pending' });
  }
});

/**
 * GET /api/properties/:id
 * Raw SQL query to fetch a single property details
 */
router.get('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const rawSql = `SELECT * FROM properties WHERE id = $1`;
    const result = await query(rawSql, [id]);

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

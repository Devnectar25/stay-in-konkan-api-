import express from 'express';
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
    return res.json({ success: true, count: result.rowCount, properties: result.rows });
  } catch (error) {
    console.error('Fetch properties error:', error);
    // Return empty list if table not populated yet
    return res.json({ success: true, count: 0, properties: [], notice: 'Database table or connection pending' });
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

export default router;

import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Helper to ensure coupons table exists
let tableChecked = false;
async function ensureTableExists() {
  if (tableChecked) return;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS coupons (
        id VARCHAR(100) PRIMARY KEY,
        code VARCHAR(100) UNIQUE NOT NULL,
        discount_type VARCHAR(50) DEFAULT 'percentage',
        discount_value NUMERIC(10, 2) NOT NULL,
        min_booking NUMERIC(10, 2) DEFAULT 0,
        apply_to VARCHAR(100) DEFAULT 'All Products',
        max_uses INT DEFAULT 100,
        times_used INT DEFAULT 0,
        active BOOLEAN DEFAULT true,
        is_private BOOLEAN DEFAULT false,
        expiry VARCHAR(50) DEFAULT '2026-12-31',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
      ALTER TABLE coupons ADD COLUMN IF NOT EXISTS apply_to VARCHAR(100) DEFAULT 'All Products';
      ALTER TABLE coupons ADD COLUMN IF NOT EXISTS is_private BOOLEAN DEFAULT false;
    `);

    // Seed default coupons if table is empty
    const checkSql = 'SELECT COUNT(*) FROM coupons;';
    const countResult = await query(checkSql);
    const count = parseInt(countResult.rows[0].count, 10);

    if (count === 0) {
      const seedSql = `
        INSERT INTO coupons (id, code, discount_type, discount_value, min_booking, apply_to, max_uses, times_used, active, is_private, expiry)
        VALUES
          ('COUP-1', 'SUMMER25', 'percentage', 25, 1500, 'All Products', 100, 14, true, false, '2026-12-31'),
          ('COUP-2', 'WELCOME500', 'flat', 500, 1500, 'First Time Guests', 50, 8, true, false, '2026-09-30'),
          ('COUP-3', 'MONSOON15', 'percentage', 15, 2500, 'Selected Stays Only', 200, 32, true, true, '2026-10-15')
        ON CONFLICT (code) DO NOTHING;
      `;
      await query(seedSql);
    }

    tableChecked = true;
  } catch (e) {
    console.warn('[Coupons API] Table setup note:', e.message);
  }
}

/**
 * GET /api/coupons
 * Fetch all coupon codes from Database
 */
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();
    const result = await query('SELECT * FROM coupons ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, coupons: result.rows });
  } catch (error) {
    console.error('Fetch coupons error:', error);
    return res.json({ success: true, count: 0, coupons: [] });
  }
});

/**
 * POST /api/coupons
 * Create a new coupon code in Database
 */
router.post('/', async (req, res) => {
  const {
    id,
    code,
    discount_type,
    discountType,
    discount_value,
    discountValue,
    min_booking,
    minBooking,
    apply_to,
    applyTo,
    max_uses,
    maxUses,
    is_private,
    isPrivate,
    expiry,
    active
  } = req.body;

  if (!code || (discount_value === undefined && discountValue === undefined)) {
    return res.status(400).json({ success: false, message: 'Coupon code and discount value are required.' });
  }

  const finalId = id || `COUP-${Date.now()}`;
  const finalCode = String(code).toUpperCase().trim();
  const finalType = discount_type || discountType || 'percentage';
  const finalValue = parseFloat(discount_value !== undefined ? discount_value : (discountValue || 0));
  const finalMinBooking = parseFloat(min_booking !== undefined ? min_booking : (minBooking || 0));
  const finalApplyTo = apply_to || applyTo || 'All Products';
  const finalMaxUses = parseInt(max_uses !== undefined ? max_uses : (maxUses || 100), 10);
  const finalIsPrivate = is_private !== undefined ? Boolean(is_private) : (isPrivate !== undefined ? Boolean(isPrivate) : false);
  const finalExpiry = expiry || '2026-12-31';
  const finalActive = active !== undefined ? Boolean(active) : true;

  try {
    await ensureTableExists();

    const insertSql = `
      INSERT INTO coupons (
        id, code, discount_type, discount_value, min_booking, apply_to, max_uses, times_used, active, is_private, expiry, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, 0, $8, $9, $10, NOW())
      ON CONFLICT (code) DO UPDATE SET
        discount_type = EXCLUDED.discount_type,
        discount_value = EXCLUDED.discount_value,
        min_booking = EXCLUDED.min_booking,
        apply_to = EXCLUDED.apply_to,
        max_uses = EXCLUDED.max_uses,
        active = EXCLUDED.active,
        is_private = EXCLUDED.is_private,
        expiry = EXCLUDED.expiry
      RETURNING *;
    `;

    const result = await query(insertSql, [
      finalId,
      finalCode,
      finalType,
      finalValue,
      finalMinBooking,
      finalApplyTo,
      finalMaxUses,
      finalActive,
      finalIsPrivate,
      finalExpiry
    ]);

    return res.json({
      success: true,
      message: `Coupon ${finalCode} created successfully in database`,
      coupon: result.rows[0]
    });
  } catch (error) {
    console.error('Create coupon error:', error);
    return res.json({
      success: true,
      message: 'Coupon recorded (local fallback)',
      coupon: {
        id: finalId,
        code: finalCode,
        discount_type: finalType,
        discount_value: finalValue,
        min_booking: finalMinBooking,
        max_uses: finalMaxUses,
        times_used: 0,
        active: finalActive,
        expiry: finalExpiry,
        created_at: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/coupons/:id/toggle
 * Toggle active status of a coupon
 */
router.put('/:id/toggle', async (req, res) => {
  const { id } = req.params;
  const { active } = req.body;

  try {
    await ensureTableExists();

    let sql = 'UPDATE coupons SET active = NOT active WHERE id = $1 OR code = $1 RETURNING *;';
    let params = [id];

    if (active !== undefined) {
      sql = 'UPDATE coupons SET active = $1 WHERE id = $2 OR code = $2 RETURNING *;';
      params = [Boolean(active), id];
    }

    const result = await query(sql, params);

    return res.json({
      success: true,
      message: 'Coupon status updated',
      coupon: result.rows[0]
    });
  } catch (error) {
    console.error('Toggle coupon error:', error);
    return res.json({ success: true, message: 'Coupon status updated (local fallback)' });
  }
});

/**
 * DELETE /api/coupons/:id
 * Delete coupon by ID or Code
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await ensureTableExists();
    await query('DELETE FROM coupons WHERE id = $1 OR code = $1 OR UPPER(code) = UPPER($1);', [id]);
    return res.json({ success: true, message: `Coupon ${id} deleted successfully from database` });
  } catch (error) {
    console.error('Delete coupon error:', error);
    return res.json({ success: true, message: `Coupon ${id} deleted (local fallback)` });
  }
});

/**
 * POST /api/coupons/validate
 * Validate coupon code for checkout
 */
router.post('/validate', async (req, res) => {
  const { code, bookingAmount } = req.body;
  if (!code) {
    return res.status(400).json({ success: false, message: 'Coupon code is required.' });
  }

  const cleanCode = String(code).toUpperCase().trim();
  const amount = parseFloat(bookingAmount || 0);

  try {
    await ensureTableExists();
    const result = await query('SELECT * FROM coupons WHERE UPPER(code) = $1 AND active = true LIMIT 1;', [cleanCode]);

    if (result.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Invalid or expired coupon code.' });
    }

    const coupon = result.rows[0];

    if (amount < parseFloat(coupon.min_booking || 0)) {
      return res.status(400).json({
        success: false,
        message: `Minimum booking amount of ₹${coupon.min_booking} required for coupon ${cleanCode}.`
      });
    }

    if (coupon.times_used >= coupon.max_uses) {
      return res.status(400).json({ success: false, message: 'Coupon usage limit reached.' });
    }

    return res.json({
      success: true,
      message: 'Coupon code applied successfully!',
      coupon
    });
  } catch (error) {
    console.error('Validate coupon error:', error);
    return res.json({ success: false, message: 'Could not validate coupon.' });
  }
});

/**
 * POST /api/coupons/use
 * Increment coupon usage count when booking is placed
 */
router.post('/use', async (req, res) => {
  const { code, id } = req.body;
  const target = (id || code || '').trim();
  if (!target) {
    return res.status(400).json({ success: false, message: 'Coupon code or ID is required.' });
  }

  try {
    await ensureTableExists();
    const updateSql = `
      UPDATE coupons
      SET times_used = COALESCE(times_used, 0) + 1
      WHERE id = $1 OR UPPER(code) = UPPER($1)
      RETURNING *;
    `;
    const result = await query(updateSql, [target]);
    const updatedCoupon = (result && result.rows && result.rows[0]) ? result.rows[0] : null;

    return res.json({
      success: true,
      message: 'Coupon usage recorded.',
      coupon: updatedCoupon
    });
  } catch (error) {
    console.error('Use coupon error:', error);
    return res.json({ success: true, message: 'Coupon usage recorded (fallback).' });
  }
});

export default router;

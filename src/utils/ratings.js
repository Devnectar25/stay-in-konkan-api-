import { query } from '../db.js';

/**
 * Replace each stay's stored rating with the real one, calculated from its reviews.
 * No reviews means rating 0 and reviews_count 0, which the website shows as "New".
 */
export const withRealRatings = async (properties) => {
  const list = Array.isArray(properties) ? properties : [];
  const totals = new Map();
  try {
    const result = await query('SELECT property_id, rating FROM reviews');
    (result.rows || []).forEach((r) => {
      const key = String(r.property_id || '').trim().toLowerCase();
      const value = Number(r.rating);
      if (!key || !(value >= 1 && value <= 5)) return;
      const t = totals.get(key) || { sum: 0, count: 0 };
      t.sum += value;
      t.count += 1;
      totals.set(key, t);
    });
  } catch (err) {
    console.warn('[Ratings] Could not read reviews:', err.message);
  }
  return list.map((p) => {
    const t = totals.get(String(p?.id || '').trim().toLowerCase());
    return { ...p, rating: t ? Number((t.sum / t.count).toFixed(1)) : 0, reviews_count: t ? t.count : 0 };
  });
};

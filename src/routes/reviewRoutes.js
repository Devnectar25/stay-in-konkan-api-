import express from 'express';
import crypto from 'crypto';
import { query } from '../db.js';

const router = express.Router();

/**
 * POST /api/reviews/feedback
 * Saves dedicated guest feedback from /feedback page
 */
router.post('/feedback', async (req, res) => {
  const { rating, categories, comment, name, guest_name, email, user_email, property_id } = req.body;
  const numRating = Number(rating) || 5;

  if (!numRating || numRating < 1 || numRating > 5) {
    return res.status(400).json({ success: false, message: 'Please select a valid rating between 1 and 5 stars.' });
  }

  const uuid = `FBD-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const cleanName = (name || guest_name || 'Guest').trim();
  const cleanEmail = (email || user_email || '').trim().toLowerCase() || null;
  const propId = String(property_id || 'general_feedback');

  const catList = Array.isArray(categories) ? categories.join(', ') : (categories || '');
  let fullComment = (comment || '').trim();
  if (catList) {
    fullComment = fullComment ? `[Highlights: ${catList}] ${fullComment}` : `[Highlights: ${catList}]`;
  }

  try {
    const rawSql = `
      INSERT INTO reviews (id, property_id, guest_name, user_email, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const params = [
      uuid,
      propId,
      cleanName,
      cleanEmail,
      numRating,
      fullComment || 'Guest Feedback'
    ];

    const result = await query(rawSql, params);

    return res.json({
      success: true,
      message: 'Thank you for your feedback! Your response has been saved.',
      feedback: (result && result.rows && result.rows[0]) ? result.rows[0] : {
        id: uuid,
        property_id: propId,
        guest_name: cleanName,
        user_email: cleanEmail,
        rating: numRating,
        comment: fullComment,
        created_at: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('Save feedback error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit feedback' });
  }
});

// A review counts only from a guest who finished a stay here, and only once per stay.
const lc = (v) => String(v || '').trim().toLowerCase();

const checkReviewEligibility = async (propertyId, email) => {
  const cleanEmail = lc(email);
  const cleanProperty = lc(propertyId);
  if (!cleanEmail) return { canReview: false, reason: 'NOT_LOGGED_IN' };

  const reviewRes = await query('SELECT * FROM reviews WHERE LOWER(user_email) = $1', [cleanEmail]);
  if ((reviewRes.rows || []).some(r => lc(r.user_email) === cleanEmail && lc(r.property_id) === cleanProperty)) {
    return { canReview: false, reason: 'ALREADY_REVIEWED' };
  }

  const bookingRes = await query('SELECT * FROM bookings WHERE LOWER(user_email) = $1', [cleanEmail]);
  const cancelRes = await query('SELECT * FROM cancellations WHERE LOWER(user_email) = $1', [cleanEmail]);
  const cancelledIds = new Set((cancelRes.rows || [])
    .filter(c => lc(c.status) !== 'rejected')
    .map(c => lc(c.booking_id)));
  const now = Date.now();
  const completedStay = (bookingRes.rows || []).some((b) => {
    if (lc(b.user_email) !== cleanEmail || lc(b.property_id) !== cleanProperty) return false;
    if (cancelledIds.has(lc(b.booking_id)) || cancelledIds.has(lc(b.id))) return false;
    if (!['confirmed', 'approved', 'paid', 'completed', 'checked_out'].includes(lc(b.status))) return false;
    const checkOut = new Date(b.check_out).getTime();
    return !Number.isNaN(checkOut) && checkOut <= now;
  });
  return completedStay ? { canReview: true } : { canReview: false, reason: 'NO_COMPLETED_STAY' };
};

/**
 * GET /api/reviews/eligibility?property_id=&email=
 * Can this user review this stay?
 */
router.get('/eligibility', async (req, res) => {
  try {
    return res.json({ success: true, ...(await checkReviewEligibility(req.query.property_id, req.query.email)) });
  } catch (error) {
    console.error('Review eligibility error:', error);
    return res.status(503).json({ success: false, canReview: false, reason: 'CHECK_FAILED' });
  }
});

/**
 * POST /api/reviews
 * Saves a property review to reviews table in PostgreSQL
 */
router.post('/', async (req, res) => {
  const { property_id, guest_name, user_email, rating, comment } = req.body;
  const cleanComment = String(comment || '').trim();
  const stars = Number(rating);

  if (!property_id || !guest_name || !cleanComment) {
    return res.status(400).json({ success: false, message: 'Property ID, guest name, and comment are required.' });
  }
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    return res.status(400).json({ success: false, message: 'Please select a rating from 1 to 5 stars.' });
  }

  const uuid = `REV-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;

  try {
    const eligibility = await checkReviewEligibility(property_id, user_email);
    if (!eligibility.canReview) {
      const messages = {
        NOT_LOGGED_IN: 'Please log in to write a review.',
        ALREADY_REVIEWED: 'You have already reviewed this stay.',
        NO_COMPLETED_STAY: 'Only guests who have completed a stay here can write a review.'
      };
      const status = eligibility.reason === 'ALREADY_REVIEWED' ? 409 : 403;
      return res.status(status).json({ success: false, code: eligibility.reason, message: messages[eligibility.reason] });
    }

    const rawSql = `
      INSERT INTO reviews (id, property_id, guest_name, user_email, rating, comment, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW())
      RETURNING *;
    `;
    const params = [uuid, String(property_id), String(guest_name).trim(), lc(user_email), stars, cleanComment];
    const result = await query(rawSql, params);
    const saved = result && result.rows && result.rows[0];

    // Never report success unless the database returned the saved review
    if (!saved) {
      return res.status(503).json({ success: false, message: 'We could not save your review. Please try again in a few minutes.' });
    }

    // The average and count are calculated from reviews whenever stays are read (utils/ratings.js)
    return res.json({ success: true, message: 'Review submitted successfully to database!', review: saved });
  } catch (error) {
    console.error('Review DB save error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * GET /api/reviews/property/:propertyId
 * Fetches reviews for a specific property (public, so guest emails are not included)
 */
router.get('/property/:propertyId', async (req, res) => {
  const { propertyId } = req.params;

  try {
    const result = await query(
      'SELECT * FROM reviews WHERE property_id = $1 ORDER BY created_at DESC',
      [String(propertyId)]
    );
    const reviews = (result.rows || [])
      .map(({ user_email: _hidden, ...publicReview }) => publicReview)
      .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    return res.json({ success: true, count: reviews.length, reviews });
  } catch (error) {
    console.error('Fetch property reviews error:', error);
    return res.json({ success: false, count: 0, reviews: [] });
  }
});

/**
 * GET /api/reviews
 * Fetches all reviews for admin dashboard
 */
router.get('/', async (req, res) => {
  try {
    const result = await query('SELECT * FROM reviews ORDER BY created_at DESC');
    return res.json({ success: true, count: result.rowCount, reviews: result.rows });
  } catch (error) {
    console.error('Fetch all reviews error:', error);
    return res.json({ success: true, count: 0, reviews: [] });
  }
});

/**
 * DELETE /api/reviews/:id
 * Deletes a review from the database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;

  try {
    await query('DELETE FROM reviews WHERE id = $1', [id]);
    return res.json({ success: true, message: 'Review deleted successfully.' });
  } catch (error) {
    console.error('Delete review error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

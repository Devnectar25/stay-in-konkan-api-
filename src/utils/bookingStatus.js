import { query } from '../db.js';

/**
 * The one rule for a booking's status. Every screen (admin, guest, host) shows what this returns.
 *   pending, confirmed, completed, expired, cancellation_pending, cancelled, rejected
 */
const lc = (v) => String(v || '').trim().toLowerCase();

// 0 refused request, 1 waiting for review, 2 approved, 3 refund paid
export const cancellationRank = (c) => {
  const status = lc(c?.status);
  if (status === 'rejected') return 0;
  if (c?.refund_txn_id || ['refunded', 'processed'].includes(lc(c?.refund_status))) return 3;
  if (['approved', 'cancelled', 'refunded'].includes(status)) return 2;
  return 1;
};

const isBetterCancellation = (a, b) => {
  const rank = cancellationRank(a) - cancellationRank(b);
  if (rank !== 0) return rank > 0;
  const time = new Date(a?.created_at || 0).getTime() - new Date(b?.created_at || 0).getTime();
  if (time !== 0) return time > 0;
  return String(a?.id || '') > String(b?.id || '');
};

/** One cancellation per booking: the furthest along, then the newest. */
export const pickCancellations = (rows) => {
  const best = new Map();
  (rows || []).forEach((c) => {
    if (!c) return;
    const key = lc(c.booking_id || c.id);
    if (!key) return;
    const current = best.get(key);
    if (!current || isBetterCancellation(c, current)) best.set(key, c);
  });
  return Array.from(best.values()).sort(
    (a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime()
  );
};

export const getCancelledBy = (rawStatus, cancellation) => {
  if (['rejected', 'declined'].includes(rawStatus)) return 'host';
  if (!cancellation) return null;
  const reason = lc(cancellation.cancellation_reason);
  if (reason.startsWith('guest')) return 'guest';
  if (/\badmin\b/.test(reason)) return 'admin';
  if (/host|declin/.test(reason)) return 'host';
  return null; // older rows may not say; better to show "not recorded" than to guess
};

export const resolveBooking = (booking, cancellation, now = Date.now()) => {
  const raw = lc(booking?.status) || 'pending';
  const rank = cancellation ? cancellationRank(cancellation) : -1;
  const wasRefused = rank === 0;
  let status = raw;

  if (['rejected', 'declined'].includes(raw)) {
    status = 'rejected';
  } else if (rank >= 2 || (raw.startsWith('cancelled') && !wasRefused) || raw === 'refunded') {
    status = 'cancelled';
  } else if (rank === 1 || (raw.startsWith('cancellation') && !wasRefused)) {
    status = 'cancellation_pending';
  } else if (wasRefused && (raw.startsWith('cancel') || raw === 'refunded')) {
    status = 'confirmed';
  } else if (['approved', 'paid', 'checked_in'].includes(raw)) {
    status = 'confirmed';
  } else if (raw === 'checked_out') {
    status = 'completed';
  }

  const checkOut = new Date(booking?.check_out || booking?.checkOut || '').getTime();
  if (!Number.isNaN(checkOut) && checkOut <= now) {
    if (status === 'confirmed') status = 'completed';
    if (status === 'pending') status = 'expired';
  }

  const hasEnded = ['cancelled', 'cancellation_pending', 'rejected'].includes(status);
  return {
    ...booking,
    status,
    stored_status: raw,
    cancelled_by: hasEnded ? getCancelledBy(raw, rank > 0 ? cancellation : null) : null,
    cancellation_reason: (rank > 0 && cancellation?.cancellation_reason) || booking?.cancellation_reason || null,
    refund_status: (rank > 0 && cancellation?.refund_status) || booking?.refund_status || null,
    refund_txn_id: (rank > 0 && cancellation?.refund_txn_id) || booking?.refund_txn_id || null
  };
};

export const applyBookingStatus = (bookings, cancellations) => {
  const byBooking = new Map(pickCancellations(cancellations).map((c) => [lc(c.booking_id || c.id), c]));
  return (bookings || []).filter(Boolean).map((b) => {
    const match = [b.booking_id, b.id, b.payment_id].map(lc).filter(Boolean).map((k) => byBooking.get(k)).find(Boolean);
    return resolveBooking(b, match);
  });
};

/** Throws if cancellations can't be read, so a caller never reports a half-worked-out status. */
export const withBookingStatus = async (bookings) => {
  const result = await query('SELECT * FROM cancellations');
  return applyBookingStatus(bookings, result?.rows || []);
};

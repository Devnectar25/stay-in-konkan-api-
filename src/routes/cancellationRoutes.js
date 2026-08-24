import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Auto-ensure cancellations table exists in database
 */
const ensureTableExists = async () => {
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS cancellations (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255) NOT NULL,
        user_email VARCHAR(255) NOT NULL,
        user_name VARCHAR(255),
        property_name VARCHAR(255),
        check_in VARCHAR(100),
        check_out VARCHAR(100),
        paid_amount NUMERIC(10, 2) DEFAULT 0,
        refund_amount NUMERIC(10, 2) DEFAULT 0,
        refund_percentage INT DEFAULT 0,
        notice_days INT DEFAULT 0,
        cancellation_reason TEXT DEFAULT 'Guest requested cancellation',
        status VARCHAR(50) DEFAULT 'requested',
        refund_status VARCHAR(50) DEFAULT 'pending',
        refund_txn_id VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    try {
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'pending';`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS refund_txn_id VARCHAR(255);`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);`);
      await query(`ALTER TABLE cancellations ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);`);
    } catch (colErr) {}
  } catch (e) {
    console.warn('[Cancellations API] Table check note:', e.message);
  }
};

/**
 * Helper to parse embedded [BANK: ...] tags if explicit columns are null
 */
const extractBankDetails = (row) => {
  if (!row) return row;

  let bank_name = row.bank_name || null;
  let account_holder_name = row.account_holder_name || null;
  let account_number = row.account_number || null;
  let ifsc_code = row.ifsc_code || null;
  let upi_id = row.upi_id || null;

  const reason = row.cancellation_reason || '';
  if (reason.includes('[BANK:')) {
    try {
      const match = reason.match(/\[BANK:\s*({[\s\S]*?})\]/);
      if (match && match[1]) {
        const parsed = JSON.parse(match[1]);
        if (!bank_name && parsed.bank_name) bank_name = parsed.bank_name;
        if (!account_holder_name && (parsed.account_holder_name || parsed.accountHolderName)) {
          account_holder_name = parsed.account_holder_name || parsed.accountHolderName;
        }
        if (!account_number && (parsed.account_number || parsed.accountNumber)) {
          account_number = parsed.account_number || parsed.accountNumber;
        }
        if (!ifsc_code && (parsed.ifsc_code || parsed.ifscCode)) {
          ifsc_code = parsed.ifsc_code || parsed.ifscCode;
        }
        if (!upi_id && (parsed.upi_id || parsed.upiId)) {
          upi_id = parsed.upi_id || parsed.upiId;
        }
      }
    } catch (e) {}
  }

  return {
    ...row,
    bank_name,
    account_holder_name,
    account_number,
    ifsc_code,
    upi_id
  };
};

/**
 * Helper to format reason with [BANK: ...] tag for unified storage
 */
const attachBankTag = (baseReason, bankObj) => {
  const cleanBase = (baseReason || 'Guest requested cancellation').replace(/\s*\[BANK:[\s\S]*?\]/g, '').trim();
  const hasDetails = bankObj && (bankObj.bank_name || bankObj.account_number || bankObj.upi_id);
  if (!hasDetails) return cleanBase;

  const tagData = {
    bank_name: bankObj.bank_name || '',
    account_holder_name: bankObj.account_holder_name || '',
    account_number: bankObj.account_number || '',
    ifsc_code: bankObj.ifsc_code || '',
    upi_id: bankObj.upi_id || ''
  };

  return `${cleanBase} [BANK: ${JSON.stringify(tagData)}]`;
};

/**
 * POST /api/cancellations
 * Submit a new cancellation request into PostgreSQL
 */
router.post('/', async (req, res) => {
  const {
    id,
    booking_id,
    bookingId,
    user_email,
    userEmail,
    email,
    user_name,
    userName,
    guest_name,
    guestName,
    property_name,
    propertyName,
    property_title,
    propertyTitle,
    check_in,
    checkIn,
    check_out,
    checkOut,
    paid_amount,
    paidAmount,
    total_price,
    totalPrice,
    refund_amount,
    refundAmount,
    refund_percentage,
    refundPercentage,
    notice_days,
    noticeDays,
    cancellation_reason,
    cancellationReason,
    reason,
    status,
    bank_details,
    bankDetails,
    bank_name,
    bankName,
    account_holder_name,
    accountHolderName,
    account_number,
    accountNumber,
    ifsc_code,
    ifscCode,
    upi_id,
    upiId
  } = req.body;

  const finalBookingId = String(booking_id || bookingId || id || '').trim();
  if (!finalBookingId) {
    return res.status(400).json({ success: false, message: 'Booking ID is required for cancellation.' });
  }

  const finalId = id || `CANCEL-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
  const finalUserEmail = (user_email || userEmail || email || '').trim().toLowerCase();
  const finalUserName = user_name || userName || guest_name || guestName || 'Guest User';
  const finalProperty = property_name || propertyName || property_title || propertyTitle || 'Konkan Stay Homestay';
  const finalCheckIn = check_in || checkIn || '';
  const finalCheckOut = check_out || checkOut || '';
  const finalPaid = parseFloat(paid_amount || paidAmount || paid || 0);
  let rawRefund = parseFloat(refund_amount || refundAmount || 0);
  let rawPct = parseInt(refund_percentage || refundPercentage || 0, 10);
  let baseReason = cancellation_reason || cancellationReason || 'Guest requested cancellation';

  const reasonLower = (baseReason + ' ' + (req.body.cancelled_by || '') + ' ' + (req.body.initiated_by || '')).toLowerCase();
  const isHostCancelled = req.body.cancelled_by === 'host' || req.body.initiated_by === 'host' || req.body.cancelled_by_host === true || reasonLower.includes('host') || reasonLower.includes('owner');

  if (isHostCancelled) {
    rawPct = 80;
    rawRefund = Math.round(finalPaid * 0.80);
    if (!baseReason.toLowerCase().includes('host')) {
      baseReason = `Host cancelled booking (80% Refund Policy: ₹${rawRefund})`;
    }
  }

  const finalRefund = rawRefund;
  const finalPct = rawPct;
  const finalDays = parseInt(notice_days || noticeDays || 0, 10);
  const finalStatus = status || 'requested';

  const bDetails = bank_details || bankDetails || {};
  const finalBankName = bank_name || bankName || bDetails.bank_name || bDetails.bankName || '';
  const finalAccountHolder = account_holder_name || accountHolderName || bDetails.account_holder_name || bDetails.accountHolderName || '';
  const finalAccountNumber = account_number || accountNumber || bDetails.account_number || bDetails.accountNumber || '';
  const finalIfsc = ifsc_code || ifscCode || bDetails.ifsc_code || bDetails.ifscCode || '';
  const finalUpi = upi_id || upiId || bDetails.upi_id || bDetails.upiId || '';

  const finalReasonWithBank = attachBankTag(baseReason, {
    bank_name: finalBankName,
    account_holder_name: finalAccountHolder,
    account_number: finalAccountNumber,
    ifsc_code: finalIfsc,
    upi_id: finalUpi
  });

  try {
    await ensureTableExists();

    const insertCancellationsSql = `
      INSERT INTO cancellations (
        id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason, status, refund_status, bank_name, account_holder_name, account_number, ifsc_code, upi_id, created_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15, $16, $17, $18, NOW())
      ON CONFLICT (id) DO UPDATE SET
        refund_amount = EXCLUDED.refund_amount,
        status = EXCLUDED.status,
        cancellation_reason = EXCLUDED.cancellation_reason,
        bank_name = EXCLUDED.bank_name,
        account_holder_name = EXCLUDED.account_holder_name,
        account_number = EXCLUDED.account_number,
        ifsc_code = EXCLUDED.ifsc_code,
        upi_id = EXCLUDED.upi_id
      RETURNING *;
    `;

    const cancelParams = [
      finalId,
      finalBookingId,
      finalUserEmail,
      finalUserName,
      finalProperty,
      finalCheckIn,
      finalCheckOut,
      finalPaid,
      finalRefund,
      finalPct,
      finalDays,
      finalReasonWithBank,
      finalStatus,
      finalBankName,
      finalAccountHolder,
      finalAccountNumber,
      finalIfsc,
      finalUpi
    ];

    const result = await query(insertCancellationsSql, cancelParams);

    // Update booking status in bookings table based on cancellation status
    try {
      const targetBookingStatus = (finalStatus === 'approved' || finalStatus === 'cancelled') ? 'cancelled' : 'cancellation_pending';
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2',
        [targetBookingStatus, finalBookingId]
      );
    } catch (bErr) {
      console.warn('[Cancellations API] Booking status update note:', bErr.message);
    }

    const insertedRecord = (result && result.rows && result.rows[0]) ? extractBankDetails(result.rows[0]) : {
      id: finalId,
      booking_id: finalBookingId,
      user_email: finalUserEmail,
      user_name: finalUserName,
      property_name: finalProperty,
      check_in: finalCheckIn,
      check_out: finalCheckOut,
      paid_amount: finalPaid,
      refund_amount: finalRefund,
      refund_percentage: finalPct,
      notice_days: finalDays,
      cancellation_reason: finalReasonWithBank,
      status: finalStatus,
      refund_status: 'pending',
      bank_name: finalBankName,
      account_holder_name: finalAccountHolder,
      account_number: finalAccountNumber,
      ifsc_code: finalIfsc,
      upi_id: finalUpi,
      created_at: new Date().toISOString()
    };

    return res.json({
      success: true,
      message: 'Booking cancellation submitted successfully to database!',
      cancellation: insertedRecord,
      data: insertedRecord
    });
  } catch (error) {
    console.error('Cancellation creation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to submit cancellation request.' });
  }
});

/**
 * PUT /api/cancellations/:id/status
 * Update status of a cancellation (approved / rejected / cancelled)
 */
router.put('/:id/status', async (req, res) => {
  const { id } = req.params;
  const { status, booking_id } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, message: 'Status is required.' });
  }

  const finalBookingId = booking_id || id;
  const newBookingStatus = (status === 'approved' || status === 'cancelled') ? 'cancelled' : 'confirmed';

  try {
    await ensureTableExists();
    await query(
      'UPDATE cancellations SET status = $1 WHERE id = $2 OR booking_id = $2 OR id = $3 OR booking_id = $3',
      [status, id, finalBookingId]
    );

    if (finalBookingId) {
      await query(
        'UPDATE bookings SET status = $1 WHERE id = $2 OR booking_id = $2 OR payment_id = $2 OR id = $3 OR booking_id = $3',
        [newBookingStatus, id, finalBookingId]
      );
    }

    return res.json({ success: true, message: `Cancellation status updated to ${status}` });
  } catch (error) {
    console.error('Update cancellation status error:', error);
    return res.json({ success: true, message: `Cancellation status updated to ${status}` });
  }
});

/**
 * PUT /api/cancellations/:id/refund-payout
 * Process refund payout & set UTR / Transaction Reference ID
 */
router.put('/:id/refund-payout', async (req, res) => {
  const { id } = req.params;
  const { refund_status, refund_txn_id, refund_amount } = req.body;

  try {
    await ensureTableExists();
    await query(
      'UPDATE cancellations SET refund_status = $1, refund_txn_id = $2, refund_amount = COALESCE($3, refund_amount) WHERE id = $4 OR booking_id = $4',
      [refund_status || 'refunded', refund_txn_id || `REFUND-${Date.now()}`, refund_amount || null, id]
    );

    return res.json({ success: true, message: `Refund payout marked as ${refund_status || 'refunded'}` });
  } catch (error) {
    console.error('Update refund payout error:', error);
    return res.json({ success: true, message: `Refund payout recorded` });
  }
});

/**
 * PUT /api/cancellations/:id/bank-details
 * Save or update user bank refund details in database
 */
router.put('/:id/bank-details', async (req, res) => {
  const { id } = req.params;
  const {
    bank_name,
    bankName,
    account_holder_name,
    accountHolderName,
    account_number,
    accountNumber,
    ifsc_code,
    ifscCode,
    upi_id,
    upiId
  } = req.body;

  const finalBankName = bank_name || bankName || '';
  const finalAccountHolder = account_holder_name || accountHolderName || '';
  const finalAccountNumber = account_number || accountNumber || '';
  const finalIfsc = ifsc_code || ifscCode || '';
  const finalUpi = upi_id || upiId || '';

  try {
    await ensureTableExists();

    let currentReason = 'Guest requested cancellation';
    try {
      const existingRes = await query('SELECT cancellation_reason FROM cancellations WHERE id = $1 OR booking_id = $1 LIMIT 1', [id]);
      if (existingRes && existingRes.rows && existingRes.rows.length > 0) {
        currentReason = existingRes.rows[0].cancellation_reason || currentReason;
      }
    } catch (e) {}

    const updatedReasonWithBank = attachBankTag(currentReason, {
      bank_name: finalBankName,
      account_holder_name: finalAccountHolder,
      account_number: finalAccountNumber,
      ifsc_code: finalIfsc,
      upi_id: finalUpi
    });

    await query(
      `UPDATE cancellations 
       SET cancellation_reason = $1, bank_name = $2, account_holder_name = $3, account_number = $4, ifsc_code = $5, upi_id = $6 
       WHERE id = $7 OR booking_id = $7`,
      [updatedReasonWithBank, finalBankName, finalAccountHolder, finalAccountNumber, finalIfsc, finalUpi, id]
    );

    return res.json({
      success: true,
      message: 'User bank details saved successfully to database',
      bank_details: {
        bank_name: finalBankName,
        account_holder_name: finalAccountHolder,
        account_number: finalAccountNumber,
        ifsc_code: finalIfsc,
        upi_id: finalUpi
      }
    });
  } catch (error) {
    console.error('Save cancellation bank details error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/cancellations
 * Fetch all cancellation records
 */
router.get('/', async (req, res) => {
  try {
    await ensureTableExists();
    const res1 = await query('SELECT * FROM cancellations ORDER BY created_at DESC');
    const parsedRows = (res1.rows || []).map(extractBankDetails);

    return res.json({
      success: true,
      count: parsedRows.length,
      cancellations: parsedRows,
      data: parsedRows
    });
  } catch (error) {
    console.error('Fetch cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [], data: [] });
  }
});

/**
 * GET /api/cancellations/user/:email
 * Fetch cancellations for a specific user
 */
router.get('/user/:email', async (req, res) => {
  const { email } = req.params;
  try {
    await ensureTableExists();
    const result = await query('SELECT * FROM cancellations WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    const parsedRows = (result && result.rows) ? result.rows.map(extractBankDetails) : [];
    return res.json({ success: true, count: parsedRows.length, cancellations: parsedRows });
  } catch (error) {
    console.error('Fetch user cancellations error:', error);
    return res.json({ success: true, count: 0, cancellations: [] });
  }
});

/**
 * DELETE /api/cancellations/:id
 * Delete a cancellation record from database
 */
router.delete('/:id', async (req, res) => {
  const { id } = req.params;
  const cleanId = (id || '').trim();

  try {
    await ensureTableExists();
    await query('DELETE FROM cancellations WHERE id = $1 OR booking_id = $1', [cleanId]);
    return res.json({ success: true, message: `Cancellation ${cleanId} deleted successfully.` });
  } catch (error) {
    console.error('Delete cancellation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

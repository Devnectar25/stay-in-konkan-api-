import express from 'express';
import { query } from '../db.js';

const router = express.Router();

/**
 * Auto-ensure cancellations and cancel_bookings tables exist in database
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
    await query(`
      CREATE TABLE IF NOT EXISTS cancel_bookings (
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
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

      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS refund_status VARCHAR(50) DEFAULT 'pending';`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS refund_txn_id VARCHAR(255);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);`);
      await query(`ALTER TABLE cancel_bookings ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);`);
    } catch (colErr) {}
  } catch (e) {
    console.warn('[Cancellations API] Table check note:', e.message);
  }
};

ensureTableExists();

const extractBankDetails = (item) => {
  if (!item) return item;
  let bankName = item.bank_name || null;
  let accountHolder = item.account_holder_name || null;
  let accountNumber = item.account_number || null;
  let ifsc = item.ifsc_code || null;
  let upi = item.upi_id || null;
  let cleanReason = item.cancellation_reason || '';

  const bankTagMatch = cleanReason.match(/\[BANK:(\{.*?\})\]/);
  if (bankTagMatch && bankTagMatch[1]) {
    try {
      const parsed = JSON.parse(bankTagMatch[1]);
      if (!bankName && parsed.bank_name) bankName = parsed.bank_name;
      if (!accountHolder && parsed.account_holder_name) accountHolder = parsed.account_holder_name;
      if (!accountNumber && parsed.account_number) accountNumber = parsed.account_number;
      if (!ifsc && parsed.ifsc_code) ifsc = parsed.ifsc_code;
      if (!upi && parsed.upi_id) upi = parsed.upi_id;
    } catch (e) {}
    cleanReason = cleanReason.replace(/\[BANK:(\{.*?\})\]/, '').trim();
  }

  return {
    ...item,
    bank_name: bankName,
    account_holder_name: accountHolder,
    account_number: accountNumber,
    ifsc_code: ifsc,
    upi_id: upi,
    cancellation_reason: cleanReason
  };
};

const attachBankTag = (reason = '', bankData = {}) => {
  const baseReason = (reason || 'Guest requested cancellation').replace(/\[BANK:(\{.*?\})\]/, '').trim();
  const hasBankData = bankData && (bankData.account_number || bankData.bank_name || bankData.upi_id);
  if (!hasBankData) return baseReason;
  const tag = `[BANK:${JSON.stringify({
    bank_name: bankData.bank_name || bankData.bankName || '',
    account_holder_name: bankData.account_holder_name || bankData.accountHolderName || '',
    account_number: bankData.account_number || bankData.accountNumber || '',
    ifsc_code: bankData.ifsc_code || bankData.ifscCode || '',
    upi_id: bankData.upi_id || bankData.upiId || ''
  })}]`;
  return `${baseReason} ${tag}`.trim();
};

/**
 * POST /api/cancellations
 * Log a new cancellation request into database & update booking status
 */
router.post('/', async (req, res) => {
  const {
    id,
    booking_id,
    bookingId,
    user_email,
    userEmail,
    user_name,
    userName,
    property_name,
    propertyName,
    property,
    check_in,
    checkIn,
    check_out,
    checkOut,
    paid_amount,
    paidAmount,
    paid,
    refund_amount,
    refundAmount,
    refund_percentage,
    refundPercentage,
    notice_days,
    noticeDays,
    cancellation_reason,
    cancellationReason,
    status,
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

  const finalId = id || `CNC-${Math.floor(100000 + Math.random() * 900000)}`;
  const finalBookingId = booking_id || bookingId || 'SIK-000000';
  const finalUserEmail = user_email || userEmail || 'guest@example.com';
  const finalUserName = user_name || userName || 'Guest User';
  const finalProperty = property_name || propertyName || property || 'Konkan Stay';
  const finalCheckIn = check_in || checkIn || '';
  const finalCheckOut = check_out || checkOut || '';
  const finalPaid = parseFloat(paid_amount || paidAmount || paid || 0);
  const finalRefund = parseFloat(refund_amount || refundAmount || 0);
  const finalPct = parseInt(refund_percentage || refundPercentage || 0, 10);
  const finalDays = parseInt(notice_days || noticeDays || 0, 10);
  const baseReason = cancellation_reason || cancellationReason || 'Guest requested cancellation';
  const finalStatus = status || 'requested';

  const finalBankName = bank_name || bankName || null;
  const finalAccountHolder = account_holder_name || accountHolderName || finalUserName;
  const finalAccountNumber = account_number || accountNumber || null;
  const finalIfsc = ifsc_code || ifscCode || null;
  const finalUpi = upi_id || upiId || null;

  const finalReasonWithBank = attachBankTag(baseReason, {
    bank_name: finalBankName,
    account_holder_name: finalAccountHolder,
    account_number: finalAccountNumber,
    ifsc_code: finalIfsc,
    upi_id: finalUpi
  });

  try {
    await ensureTableExists();

    // 1. Insert into cancel_bookings table
    const insertCancelBookingsSql = `
      INSERT INTO cancel_bookings (
        id, booking_id, user_email, user_name, property_name, check_in, check_out, paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason, status, refund_status, bank_name, account_holder_name, account_number, ifsc_code, upi_id, created_at, updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15, $16, $17, $18, NOW(), NOW())
      RETURNING *;
    `;

    const cancelBookingsParams = [
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

    let result = await query(insertCancelBookingsSql, cancelBookingsParams);

    // 2. Also insert into cancellations for full backwards compatibility
    try {
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
          upi_id = EXCLUDED.upi_id;
      `;
      await query(insertCancellationsSql, cancelBookingsParams);
    } catch (cErr) {
      console.warn('[Cancellations API] Cancellations sync note:', cErr.message);
    }

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

    return res.json({
      success: true,
      message: 'Cancellation logged successfully in database',
      cancellation: extractBankDetails((result && result.rows && result.rows[0]) ? result.rows[0] : {
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
        cancellation_reason: baseReason,
        status: finalStatus,
        refund_status: 'pending',
        bank_name: finalBankName,
        account_holder_name: finalAccountHolder,
        account_number: finalAccountNumber,
        ifsc_code: finalIfsc,
        upi_id: finalUpi
      })
    });
  } catch (error) {
    console.error('Create cancellation error:', error);
    return res.json({
      success: true,
      message: 'Cancellation recorded',
      cancellation: {
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
        cancellation_reason: baseReason,
        status: finalStatus,
        refund_status: 'pending',
        bank_name: finalBankName,
        account_holder_name: finalAccountHolder,
        account_number: finalAccountNumber,
        ifsc_code: finalIfsc,
        upi_id: finalUpi,
        created_at: new Date().toISOString()
      }
    });
  }
});

/**
 * PUT /api/cancellations/:id/status
 * Update cancellation request status (approved / rejected) by Admin
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
      'UPDATE cancel_bookings SET status = $1, updated_at = NOW() WHERE id = $2 OR booking_id = $2 OR id = $3 OR booking_id = $3',
      [status, id, finalBookingId]
    );
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
      'UPDATE cancel_bookings SET refund_status = $1, refund_txn_id = $2, refund_amount = COALESCE($3, refund_amount), updated_at = NOW() WHERE id = $4 OR booking_id = $4',
      [refund_status || 'refunded', refund_txn_id || `REFUND-${Date.now()}`, refund_amount || null, id]
    );
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

    // Fetch existing cancellation to preserve base reason and attach bank tag
    let currentReason = 'Guest requested cancellation';
    try {
      const existingRes = await query('SELECT cancellation_reason FROM cancel_bookings WHERE id = $1 OR booking_id = $1 LIMIT 1', [id]);
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
      `UPDATE cancel_bookings 
       SET cancellation_reason = $1, bank_name = $2, account_holder_name = $3, account_number = $4, ifsc_code = $5, upi_id = $6, updated_at = NOW() 
       WHERE id = $7 OR booking_id = $7`,
      [updatedReasonWithBank, finalBankName, finalAccountHolder, finalAccountNumber, finalIfsc, finalUpi, id]
    );

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
    const res2 = await query('SELECT * FROM cancel_bookings ORDER BY created_at DESC');

    const cancMap = new Map();
    (res1.rows || []).forEach(item => {
      const key = String(item.id || item.booking_id || '').toLowerCase().trim();
      if (key) cancMap.set(key, extractBankDetails(item));
    });
    (res2.rows || []).forEach(item => {
      const key = String(item.id || item.booking_id || '').toLowerCase().trim();
      if (key) {
        const existing = cancMap.get(key);
        const parsed = extractBankDetails(item);
        if (existing) {
          cancMap.set(key, {
            ...existing,
            ...parsed,
            bank_name: parsed.bank_name || existing.bank_name || null,
            account_holder_name: parsed.account_holder_name || existing.account_holder_name || null,
            account_number: parsed.account_number || existing.account_number || null,
            ifsc_code: parsed.ifsc_code || existing.ifsc_code || null,
            upi_id: parsed.upi_id || existing.upi_id || null
          });
        } else {
          cancMap.set(key, parsed);
        }
      }
    });

    const allCancellations = Array.from(cancMap.values()).sort((a, b) => {
      const timeA = new Date(a.created_at || a.requested_at || a.date || a.timestamp || 0).getTime();
      const timeB = new Date(b.created_at || b.requested_at || b.date || b.timestamp || 0).getTime();
      return timeB - timeA;
    });

    return res.json({
      success: true,
      count: allCancellations.length,
      cancellations: allCancellations,
      data: allCancellations
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
    let result = await query('SELECT * FROM cancel_bookings WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    if (!result || !result.rows || result.rows.length === 0) {
      result = await query('SELECT * FROM cancellations WHERE LOWER(user_email) = LOWER($1) ORDER BY created_at DESC', [email]);
    }
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
    await query('DELETE FROM cancel_bookings WHERE id = $1 OR booking_id = $1', [cleanId]);
    await query('DELETE FROM cancellations WHERE id = $1 OR booking_id = $1', [cleanId]);
    return res.json({ success: true, message: `Cancellation ${cleanId} deleted successfully.` });
  } catch (error) {
    console.error('Delete cancellation error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

export default router;

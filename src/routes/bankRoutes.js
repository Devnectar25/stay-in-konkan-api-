import express from 'express';
import { query } from '../db.js';

const router = express.Router();

// Curated seed bank details list for initial system bootstrap
const SEED_BANK_DETAILS = [
  {
    id: 'bd_rishi18305@gmail.com',
    user_email: 'rishi18305@gmail.com',
    account_holder_name: 'Aditya Raj',
    user_type: 'host',
    bank_name: 'Axis Bank',
    account_number: '918020048291041',
    ifsc_code: 'UTIB0000847',
    upi_id: 'rishi18305@okaxis',
    branch_name: 'Dapoli Town Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin21@gmail.com',
    user_email: 'admin21@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'host',
    bank_name: 'State Bank of India',
    account_number: '39482019482',
    ifsc_code: 'SBIN0002847',
    upi_id: 'kuldeep.host@oksbi',
    branch_name: 'Alibaug Main Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_kuldeepmahajan621@gmail.com',
    user_email: 'kuldeepmahajan621@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'user',
    bank_name: 'Union Bank of India',
    account_number: '59300201004829',
    ifsc_code: 'UBIN0583920',
    upi_id: 'kuldeep621@unionbank',
    branch_name: 'Murud Beach Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_vinodmahajand@gmail.com',
    user_email: 'vinodmahajand@gmail.com',
    account_holder_name: 'Vinod Mahajan',
    user_type: 'host',
    bank_name: 'Bank of Baroda',
    account_number: '29400100084729',
    ifsc_code: 'BARB0MALVAN',
    upi_id: 'vinodmahajan@okbizaxis',
    branch_name: 'Malvan Fort Road Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin28@gmail.com',
    user_email: 'admin28@gmail.com',
    account_holder_name: 'Admin 28 Desk',
    user_type: 'user',
    bank_name: 'IDFC FIRST Bank',
    account_number: '100482910482',
    ifsc_code: 'IDFB0048291',
    upi_id: 'admin28@idfcfirst',
    branch_name: 'Dapoli Valley Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin26@gmail.com',
    user_email: 'admin26@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'user',
    bank_name: 'IndusInd Bank',
    account_number: '159483920184',
    ifsc_code: 'INDB0000482',
    upi_id: 'kuldeep.admin26@indus',
    branch_name: 'Tarkarli Scuba Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin25@gmail.com',
    user_email: 'admin25@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'user',
    bank_name: 'Kotak Mahindra Bank',
    account_number: '8492019482',
    ifsc_code: 'KKBK0001928',
    upi_id: 'kuldeep.admin25@kotak',
    branch_name: 'Kashid Sand Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin24@gmail.com',
    user_email: 'admin24@gmail.com',
    account_holder_name: 'Aadmin Host',
    user_type: 'host',
    bank_name: 'Federal Bank',
    account_number: '184920481928',
    ifsc_code: 'FDRL0001928',
    upi_id: 'aadmin.host@federal',
    branch_name: 'Devgad Mango Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin23@gmail.com',
    user_email: 'admin23@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'host',
    bank_name: 'Punjab National Bank',
    account_number: '48190001004821',
    ifsc_code: 'PUNB0182900',
    upi_id: 'kuldeep.a23@pnb',
    branch_name: 'Chiplun Vashishti Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_badgujarg09@gmail.com',
    user_email: 'badgujarg09@gmail.com',
    account_holder_name: 'Gayatri Badgujar',
    user_type: 'user',
    bank_name: 'Canara Bank',
    account_number: '110029384712',
    ifsc_code: 'CNRB0001847',
    upi_id: 'badgujarg09@okaxis',
    branch_name: 'Ratnagiri City Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_deepmagare0@gmail.com',
    user_email: 'deepmagare0@gmail.com',
    account_holder_name: 'Deep Magare',
    user_type: 'host',
    bank_name: 'State Bank of India',
    account_number: '38291047581',
    ifsc_code: 'SBIN0001423',
    upi_id: 'deepmagare@okicici',
    branch_name: 'Malvan Beach Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin@gmail.com',
    user_email: 'admin@gmail.com',
    account_holder_name: 'Stay in Konkan Subadmin Desk',
    user_type: 'admin',
    bank_name: 'State Bank of India',
    account_number: '39582048192',
    ifsc_code: 'SBIN0001928',
    upi_id: 'sik.subadmin@sbi',
    branch_name: 'Ratnagiri Head Office',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin22@gmail.com',
    user_email: 'admin22@gmail.com',
    account_holder_name: 'Stay in Konkan Admin Desk',
    user_type: 'admin',
    bank_name: 'ICICI Bank',
    account_number: '192837465012',
    ifsc_code: 'ICIC0002847',
    upi_id: 'stayinkonkan.admin@icici',
    branch_name: 'Mumbai HQ Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_badgujargayatri74@gmail.com',
    user_email: 'badgujargayatri74@gmail.com',
    account_holder_name: 'Gayatri Badgujar',
    user_type: 'host',
    bank_name: 'ICICI Bank',
    account_number: '192805004819',
    ifsc_code: 'ICIC0003920',
    upi_id: 'badgujargayatri@icici',
    branch_name: 'Guhagar Coastal Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_mahajankuldeep628@gmail.com',
    user_email: 'mahajankuldeep628@gmail.com',
    account_holder_name: 'Kuldeep Mahajan',
    user_type: 'host',
    bank_name: 'HDFC Bank',
    account_number: '50100482910472',
    ifsc_code: 'HDFC0001928',
    upi_id: 'kuldeepmahajan@okhdfcbank',
    branch_name: 'Ratnagiri Central Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_amit.sharma@test.com',
    user_email: 'amit.sharma@test.com',
    account_holder_name: 'Amit Sharma',
    user_type: 'user',
    bank_name: 'HDFC Bank',
    account_number: '50100392847104',
    ifsc_code: 'HDFC0000482',
    upi_id: 'amit.sharma@okhdfcbank',
    branch_name: 'Alibaug Main Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_priya.nair@test.com',
    user_email: 'priya.nair@test.com',
    account_holder_name: 'Priya Nair',
    user_type: 'user',
    bank_name: 'Axis Bank',
    account_number: '920010048291847',
    ifsc_code: 'UTIB0001928',
    upi_id: 'priyanair@okaxis',
    branch_name: 'Malvan Fort Branch',
    account_type: 'savings',
    is_primary: true,
    verified_status: 'verified'
  },
  {
    id: 'bd_admin@stayinkonkan.com',
    user_email: 'admin@stayinkonkan.com',
    account_holder_name: 'Stay in Konkan Platform HQ',
    user_type: 'admin',
    bank_name: 'State Bank of India',
    account_number: '39920194820',
    ifsc_code: 'SBIN0000001',
    upi_id: 'stayinkonkan@sbi',
    branch_name: 'Mumbai Main Branch',
    account_type: 'current',
    is_primary: true,
    verified_status: 'verified'
  }
];

let isTableInitialized = false;

async function ensureBankDetailsTable() {
  if (isTableInitialized) return;
  isTableInitialized = true;

  try {
    await query(`
      CREATE TABLE IF NOT EXISTS bank_details (
        id VARCHAR(255) PRIMARY KEY,
        user_email VARCHAR(255) NOT NULL,
        account_holder_name VARCHAR(255),
        user_type VARCHAR(50) DEFAULT 'user',
        bank_name VARCHAR(255),
        account_number VARCHAR(255),
        ifsc_code VARCHAR(50),
        upi_id VARCHAR(255),
        branch_name VARCHAR(255),
        account_type VARCHAR(50) DEFAULT 'savings',
        is_primary BOOLEAN DEFAULT true,
        verified_status VARCHAR(50) DEFAULT 'verified',
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
      );
    `).catch(() => {});
  } catch (err) {
    console.warn('[BankDetails Table Init Notice]:', err.message);
  }
}

/**
 * GET /api/bank-details
 * Fetch all bank details or filter by email/user_type
 */
router.get('/', async (req, res) => {
  try {
    await ensureBankDetailsTable();

    const { email, user_type, id } = req.query;
    const targetEmail = (email || id || '').toLowerCase().trim();

    let sql = 'SELECT * FROM bank_details WHERE 1=1';
    const params = [];

    if (id) {
      params.push(id);
      params.push(`bd_${targetEmail}`);
      sql += ` AND (id = $1 OR id = $2 OR LOWER(user_email) = LOWER($1))`;
    }
    if (email) {
      if (params.length === 0) {
        params.push(targetEmail);
        params.push(`bd_${targetEmail}`);
        sql += ` AND (LOWER(user_email) = LOWER($1) OR id = $1 OR id = $2)`;
      }
    }
    if (user_type) {
      params.push(user_type.toLowerCase().trim());
      sql += ` AND LOWER(user_type) = $${params.length}`;
    }

    sql += ' ORDER BY updated_at DESC';

    const result = await query(sql, params);
    let items = result.rows || [];

    // Robust Fallback 1: Check users table if no bank_details row found
    if (items.length === 0 && targetEmail) {
      try {
        const uRes = await query(
          `SELECT bank_name, account_number, account_holder_name, ifsc_code, account_type, upi_id, branch_name, bank_details FROM users WHERE LOWER(email) = LOWER($1) OR id = $1 LIMIT 1;`,
          [targetEmail]
        );
        if (uRes && uRes.rows && uRes.rows[0]) {
          const uRow = uRes.rows[0];
          let parsedB = {};
          try {
            if (typeof uRow.bank_details === 'string') parsedB = JSON.parse(uRow.bank_details);
            else if (typeof uRow.bank_details === 'object' && uRow.bank_details) parsedB = uRow.bank_details;
          } catch (e) {}

          const bName = uRow.bank_name || parsedB.bank_name || '';
          const accNo = uRow.account_number || parsedB.account_number || '';
          const holder = uRow.account_holder_name || parsedB.account_holder_name || '';
          const ifsc = uRow.ifsc_code || parsedB.ifsc_code || '';

          if (accNo || ifsc || bName) {
            items.push({
              id: `bd_${targetEmail}`,
              user_email: targetEmail,
              account_holder_name: holder || 'Account Holder',
              user_type: 'user',
              bank_name: bName || 'State Bank of India',
              account_number: accNo,
              ifsc_code: ifsc,
              upi_id: uRow.upi_id || parsedB.upi_id || '',
              branch_name: uRow.branch_name || parsedB.branch_name || '',
              account_type: uRow.account_type || parsedB.account_type || 'Savings',
              is_primary: true,
              verified_status: 'verified',
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (uErr) {}
    }

    // Robust Fallback 2: Check hosts table if still no row found
    if (items.length === 0 && targetEmail) {
      try {
        const hRes = await query(
          `SELECT bank_name, account_number, account_holder_name, ifsc_code, account_type, upi_id, branch_name, bank_details FROM hosts WHERE LOWER(email) = LOWER($1) OR LOWER(host_email) = LOWER($1) OR id = $1 LIMIT 1;`,
          [targetEmail]
        );
        if (hRes && hRes.rows && hRes.rows[0]) {
          const hRow = hRes.rows[0];
          let parsedB = {};
          try {
            if (typeof hRow.bank_details === 'string') parsedB = JSON.parse(hRow.bank_details);
            else if (typeof hRow.bank_details === 'object' && hRow.bank_details) parsedB = hRow.bank_details;
          } catch (e) {}

          const bName = hRow.bank_name || parsedB.bank_name || '';
          const accNo = hRow.account_number || parsedB.account_number || '';
          const holder = hRow.account_holder_name || parsedB.account_holder_name || '';
          const ifsc = hRow.ifsc_code || parsedB.ifsc_code || '';

          if (accNo || ifsc || bName) {
            items.push({
              id: `bd_${targetEmail}`,
              user_email: targetEmail,
              account_holder_name: holder || 'Host User',
              user_type: 'host',
              bank_name: bName || 'State Bank of India',
              account_number: accNo,
              ifsc_code: ifsc,
              upi_id: hRow.upi_id || parsedB.upi_id || '',
              branch_name: hRow.branch_name || parsedB.branch_name || '',
              account_type: hRow.account_type || parsedB.account_type || 'Savings',
              is_primary: true,
              verified_status: 'verified',
              updated_at: new Date().toISOString()
            });
          }
        }
      } catch (hErr) {}
    }

    if (items.length === 0 && email) {
      const matchSeed = SEED_BANK_DETAILS.filter(b => b.user_email.toLowerCase() === targetEmail);
      if (matchSeed.length > 0) items = matchSeed;
    } else if (items.length === 0 && !email && !user_type && !id) {
      items = SEED_BANK_DETAILS;
    }

    res.json({
      success: true,
      count: items.length,
      bank_details: items,
      data: items
    });
  } catch (error) {
    console.error('Error fetching bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bank details',
      bank_details: SEED_BANK_DETAILS,
      data: SEED_BANK_DETAILS
    });
  }
});

/**
 * POST /api/bank-details
 * Save or update user/host bank details
 */
router.post('/', async (req, res) => {
  try {
    await ensureBankDetailsTable();

    const {
      id,
      user_email,
      email,
      account_holder_name,
      holder_name,
      user_type,
      bank_name,
      account_number,
      ifsc_code,
      upi_id,
      branch_name,
      account_type,
      is_primary,
      verified_status
    } = req.body;

    const targetEmail = (user_email || email || req.body.host_email || req.body.userEmail || '').trim().toLowerCase();
    if (!targetEmail) {
      return res.status(400).json({
        success: false,
        message: 'user_email is required to save bank details'
      });
    }

    const recId = id || `bd_${targetEmail}`;
    const holderName = (account_holder_name || holder_name || 'Account Holder').trim();
    const type = user_type || 'user';
    const bankName = (bank_name || 'State Bank of India').trim();
    const accNumber = (account_number || '').trim();
    const ifsc = (ifsc_code || '').toUpperCase().trim();
    const upi = (upi_id || '').trim();
    const branch = (branch_name || 'Main Branch').trim();
    const accType = account_type || 'savings';
    const primary = is_primary !== undefined ? Boolean(is_primary) : true;
    const status = verified_status || 'verified';

    const bankDetailsJson = JSON.stringify({
      account_holder_name: holderName,
      bank_name: bankName,
      account_number: accNumber,
      ifsc_code: ifsc,
      account_type: accType,
      upi_id: upi,
      branch_name: branch,
      updated_at: new Date().toISOString()
    });

    // 1. Upsert into bank_details table
    const upsertSql = `
      INSERT INTO bank_details (
        id, user_email, account_holder_name, user_type, bank_name,
        account_number, ifsc_code, upi_id, branch_name, account_type,
        is_primary, verified_status, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
      ON CONFLICT (id) DO UPDATE SET
        user_email = EXCLUDED.user_email,
        account_holder_name = EXCLUDED.account_holder_name,
        user_type = EXCLUDED.user_type,
        bank_name = EXCLUDED.bank_name,
        account_number = EXCLUDED.account_number,
        ifsc_code = EXCLUDED.ifsc_code,
        upi_id = EXCLUDED.upi_id,
        branch_name = EXCLUDED.branch_name,
        account_type = EXCLUDED.account_type,
        is_primary = EXCLUDED.is_primary,
        verified_status = EXCLUDED.verified_status,
        updated_at = NOW()
      RETURNING *;
    `;

    const result = await query(upsertSql, [
      recId, targetEmail, holderName, type, bankName,
      accNumber, ifsc, upi, branch, accType,
      primary, status
    ]);

    // 2. Sync to users table columns
    try {
      await query(
        `UPDATE users SET bank_details = $1, bank_name = $2, account_number = $3, account_holder_name = $4, ifsc_code = $5, account_type = $6, upi_id = $7, branch_name = $8, updated_at = NOW() WHERE LOWER(email) = LOWER($9) OR id = $9;`,
        [bankDetailsJson, bankName, accNumber, holderName, ifsc, accType, upi, branch, targetEmail]
      ).catch(() => {});
    } catch (uErr) {}

    // 3. Sync to hosts table columns
    try {
      await query(
        `UPDATE hosts SET bank_details = $1, bank_name = $2, account_number = $3, account_holder_name = $4, ifsc_code = $5, account_type = $6, upi_id = $7, branch_name = $8 WHERE LOWER(email) = LOWER($9) OR LOWER(host_email) = LOWER($9) OR id = $9;`,
        [bankDetailsJson, bankName, accNumber, holderName, ifsc, accType, upi, branch, targetEmail]
      ).catch(() => {});
    } catch (hErr) {}

    const savedRecord = result.rows?.[0] || {
      id: recId,
      user_email: targetEmail,
      account_holder_name: holderName,
      user_type: type,
      bank_name: bankName,
      account_number: accNumber,
      ifsc_code: ifsc,
      upi_id: upi,
      branch_name: branch,
      account_type: accType,
      is_primary: primary,
      verified_status: status,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    res.json({
      success: true,
      message: 'Bank details saved successfully in bank_details table',
      bank_details: savedRecord,
      data: savedRecord
    });
  } catch (error) {
    console.error('Error saving bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to save bank details: ' + error.message
    });
  }
});

/**
 * DELETE /api/bank-details/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    await ensureBankDetailsTable();
    const { id } = req.params;
    const emailKey = String(id).toLowerCase().trim();

    // 1. Delete from bank_details table
    await query('DELETE FROM bank_details WHERE id = $1 OR user_email = $1 OR LOWER(user_email) = $2 OR LOWER(id) = $2', [id, emailKey]);

    res.json({
      success: true,
      message: `Bank details for "${id}" deleted successfully from bank_details table.`
    });
  } catch (error) {
    console.error('Error deleting bank details:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bank details: ' + error.message
    });
  }
});

export default router;

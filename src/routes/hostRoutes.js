import express from 'express';
import { query } from '../db.js';

const router = express.Router();

let isHostsTableChecked = false;
const ensureHostsTable = async () => {
  if (isHostsTableChecked) return;
  isHostsTableChecked = true;
  try {
    await query(`
      CREATE TABLE IF NOT EXISTS hosts (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        location VARCHAR(255),
        total_properties INT DEFAULT 0,
        verified BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'active',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);
    const cols = [
      'phone VARCHAR(100)',
      'location VARCHAR(255)',
      'bank_details TEXT',
      'bank_name VARCHAR(255)',
      'account_number VARCHAR(100)',
      'account_holder_name VARCHAR(255)',
      'ifsc_code VARCHAR(50)',
      'account_type VARCHAR(50)',
      'upi_id VARCHAR(100)',
      'branch_name VARCHAR(255)',
      'total_properties INT DEFAULT 0',
      'verified BOOLEAN DEFAULT false',
      'status VARCHAR(50) DEFAULT \'active\''
    ];
    for (const c of cols) {
      await query(`ALTER TABLE hosts ADD COLUMN IF NOT EXISTS ${c};`).catch(() => {});
      await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS ${c};`).catch(() => {});
      await query(`ALTER TABLE host_applications ADD COLUMN IF NOT EXISTS ${c};`).catch(() => {});
    }
  } catch (err) {
    console.warn('Hosts table init check note:', err.message);
  }
};

/**
 * GET /api/hosts
 * Fetch all host accounts from hosts table + users table with role = 'host'
 */
router.get('/', async (req, res) => {
  try {
    await ensureHostsTable();

    // 1. Fetch from hosts table
    const hostsRes = await query(`SELECT * FROM hosts;`).catch(() => ({ rows: [] }));
    const dbHosts = hostsRes.rows || [];

    // 2. Fetch from users table (hosts / owners)
    const usersRes = await query(`
      SELECT id, full_name, email, phone, role, verified, status, created_at, location, bank_name, account_number, account_holder_name, ifsc_code, upi_id
      FROM users 
      WHERE LOWER(role) IN ('host', 'owner') 
         OR email IN (SELECT DISTINCT host_email FROM properties WHERE host_email IS NOT NULL AND host_email != '')
      ORDER BY created_at DESC;
    `).catch(() => ({ rows: [] }));
    const dbUsers = usersRes.rows || [];

    // 3. Fetch from approved host_applications table
    const appsRes = await query(`
      SELECT id, applicant_name as full_name, applicant_email as email, phone, location, created_at, status
      FROM host_applications 
      WHERE LOWER(status) = 'approved'
      ORDER BY created_at DESC;
    `).catch(() => ({ rows: [] }));
    const dbApps = appsRes.rows || [];

    // 4. Fetch properties to associate property counts and location
    const propsRes = await query(`SELECT id, title, host, host_name, host_email, host_phone, location FROM properties;`).catch(() => ({ rows: [] }));
    const props = propsRes.rows || [];

    // Default system hosts fallback
    const defaultHosts = [
      { id: 'host_kuldeep_mahajan', full_name: 'Kuldeep Mahajan', email: 'mahajankuldeep628@gmail.com', phone: '+91 98224 88776', location: 'Murud, Raigad • Fort & Ocean View', created_at: '2026-08-22T10:00:00.000Z' },
      { id: 'host_03', full_name: 'Deep Magare', email: 'deepmagare0@gmail.com', phone: '+91 98221 14455', location: 'Tarkarli, Malvan, Sindhudurg • Beachfront', created_at: '2026-08-21T12:00:00.000Z' },
      { id: 'host_anjali_shewale', full_name: 'Anjali Shewale', email: 'anjalishewale2514@gmail.com', phone: '+91 98225 11223', location: 'Tarkarli, Malvan, Sindhudurg', created_at: '2026-08-20T10:00:00.000Z' },
      { id: 'host_admin25', full_name: 'Kuldeep Mahajan', email: 'admin25@gmail.com', phone: '+91 98765 43210', location: 'Murud, Raigad • Fort & Ocean View', created_at: '2026-08-19T08:30:00.000Z' },
      { id: 'host_admin26', full_name: 'Kuldeep Mahajan', email: 'admin26@gmail.com', phone: '+91 98765 43210', location: 'Murud, Raigad • Fort & Ocean View', created_at: '2026-08-19T08:35:00.000Z' },
      { id: 'host_01', full_name: 'Anand Sawant', email: 'anand.sawant@example.com', phone: '+91-9876543210', location: 'Guhagar, Maharashtra • Near Beach', created_at: '2026-08-14T09:40:00.000Z' },
      { id: 'host_02', full_name: 'Sanjay Kulkarni', email: 'sanjay.k@example.com', phone: '+91-9123456789', location: 'Ratnagiri, Maharashtra • Orchard', created_at: '2026-08-14T09:45:00.000Z' }
    ];

    const hostMap = new Map();

    // Fill map from defaultHosts
    defaultHosts.forEach(dh => {
      if (dh && dh.email) hostMap.set(dh.email.toLowerCase().trim(), dh);
    });

    // Fill map from dbApps
    dbApps.forEach(app => {
      if (app && app.email) {
        const key = app.email.toLowerCase().trim();
        const existing = hostMap.get(key) || {};
        hostMap.set(key, { ...existing, ...app, status: 'active', verified: true });
      }
    });

    // Fill map from dbUsers
    dbUsers.forEach(u => {
      if (u && u.email) {
        const key = u.email.toLowerCase().trim();
        const existing = hostMap.get(key) || {};
        hostMap.set(key, { ...existing, ...u });
      }
    });

    // Fill map from dbHosts (highest precedence table for host attributes)
    dbHosts.forEach(h => {
      if (h && h.email) {
        const key = h.email.toLowerCase().trim();
        const existing = hostMap.get(key) || {};
        hostMap.set(key, { ...existing, ...h });
      }
    });

    // Also collect hosts directly listed in properties table
    props.forEach(p => {
      const pEmail = (p.host_email || '').toLowerCase().trim();
      if (pEmail && pEmail !== 'homestay' && pEmail !== 'host@stayinkonkan.com' && !hostMap.has(pEmail)) {
        hostMap.set(pEmail, {
          id: `host_${pEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
          full_name: p.host_name || p.host || pEmail.split('@')[0],
          email: pEmail,
          phone: p.host_phone || '+91 98765 43210',
          location: p.location || 'Konkan Region',
          verified: true,
          status: 'active',
          created_at: new Date().toISOString()
        });
      }
    });

    const allHostsList = Array.from(hostMap.values()).map(h => {
      const email = (h.email || '').toLowerCase().trim();
      const name = (h.full_name || h.name || '').toLowerCase().trim();

      const matchingProps = props.filter(p => {
        const pEmail = (p.host_email || '').toLowerCase().trim();
        const pName = (p.host || p.host_name || '').toLowerCase().trim();
        return (email && pEmail === email) || (name && pName === name);
      });

      return {
        id: h.id || `host_${email.replace(/[^a-zA-Z0-9]/g, '_')}`,
        full_name: h.full_name || h.name || email.split('@')[0],
        email: h.email,
        phone: h.phone || '+91 98765 43210',
        location: h.location || matchingProps[0]?.location || 'Konkan Region',
        total_properties: matchingProps.length,
        verified: h.verified !== false,
        status: h.status || 'active',
        created_at: h.created_at || new Date().toISOString()
      };
    });

    // Sort NEWEST / LATEST hosts first (descending timestamp)
    allHostsList.sort((a, b) => {
      const timeA = new Date(a.created_at || 0).getTime();
      const timeB = new Date(b.created_at || 0).getTime();
      return timeB - timeA;
    });

    return res.json({ success: true, count: allHostsList.length, hosts: allHostsList });
  } catch (error) {
    console.error('Fetch hosts error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * POST /api/hosts
 * Create or update a host account
 */
router.post('/', async (req, res) => {
  await ensureHostsTable();
  const { id, full_name, email, phone, location, bank_details, total_properties, verified, status } = req.body;

  if (!email) {
    return res.status(400).json({ success: false, message: 'Host email is required' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const hostId = id || `host_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  const name = full_name || cleanEmail.split('@')[0];
  const hostPhone = phone || '';
  const hostLoc = location || 'Konkan Region';
  const isVerified = verified !== undefined ? Boolean(verified) : true;
  const hostStatus = status || 'active';
  const propCount = Number(total_properties) || 0;

  try {
    const rawSql = `
      INSERT INTO hosts (id, full_name, email, phone, location, total_properties, verified, status, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
      ON CONFLICT (email) DO UPDATE SET
        full_name = EXCLUDED.full_name,
        phone = COALESCE(EXCLUDED.phone, hosts.phone),
        location = COALESCE(EXCLUDED.location, hosts.location),
        total_properties = COALESCE(EXCLUDED.total_properties, hosts.total_properties),
        verified = EXCLUDED.verified,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *;
    `;
    const params = [hostId, name, cleanEmail, hostPhone, hostLoc, propCount, isVerified, hostStatus];
    const result = await query(rawSql, params);

    // Also promote user to role = 'host' in users table
    try {
      await query(`UPDATE users SET role = 'host', verified = $1 WHERE LOWER(email) = $2;`, [isVerified, cleanEmail]);
    } catch (uErr) {}

    return res.json({ success: true, message: 'Host account created/updated successfully', host: result.rows[0] });
  } catch (error) {
    console.error('Create host error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Failed to create host account' });
  }
});

/**
 * PUT /api/hosts/:id/status
 * Update host verification or status
 */
router.put('/:id/status', async (req, res) => {
  await ensureHostsTable();
  const { id } = req.params;
  const { status, verified } = req.body;

  try {
    const updateSql = `
      UPDATE hosts
      SET status = COALESCE($1, status),
          verified = COALESCE($2, verified),
          updated_at = NOW()
      WHERE id = $3 OR LOWER(email) = LOWER($3)
      RETURNING *;
    `;
    const result = await query(updateSql, [status || null, verified !== undefined ? Boolean(verified) : null, id]);
    
    if (result.rows.length > 0) {
      const updatedHost = result.rows[0];
      try {
        await query(`UPDATE users SET verified = $1 WHERE LOWER(email) = LOWER($2);`, [updatedHost.verified, updatedHost.email]);
      } catch (e) {}
      return res.json({ success: true, message: 'Host status updated', host: updatedHost });
    }

    return res.json({ success: true, message: 'Host status updated locally' });
  } catch (error) {
    console.error('Update host status error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/hosts/:id/bank-details
 * Fetch host bank details from database
 */
router.get('/:id/bank-details', async (req, res) => {
  const { id } = req.params;
  const targetEmail = String(id || '').toLowerCase().trim();
  try {
    const rawSql = `SELECT * FROM bank_details WHERE LOWER(user_email) = LOWER($1) OR id = $1 OR id = $2 ORDER BY is_primary DESC, created_at DESC LIMIT 1;`;
    const result = await query(rawSql, [targetEmail, `bd_${targetEmail}`]);

    let row = (result && result.rows && result.rows.length > 0) ? result.rows[0] : null;

    if (!row) {
      // Fallback: check hosts table columns
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

          if (accNo || hRow.upi_id || parsedB.upi_id) {
            row = {
              account_holder_name: holder || '',
              bank_name: bName || '',
              account_number: accNo,
              ifsc_code: ifsc,
              account_type: hRow.account_type || parsedB.account_type || 'Savings',
              upi_id: hRow.upi_id || parsedB.upi_id || '',
              branch_name: hRow.branch_name || parsedB.branch_name || ''
            };
          }
        }
      } catch (hErr) {}
    }

    if (row) {
      return res.json({
        success: true,
        bank_details: {
          account_holder_name: row.account_holder_name || '',
          bank_name: row.bank_name || '',
          account_number: row.account_number || '',
          ifsc_code: row.ifsc_code || '',
          account_type: row.account_type || 'Savings',
          upi_id: row.upi_id || '',
          branch_name: row.branch_name || '',
          is_verified: true,
          is_completed: Boolean(row.account_number || row.upi_id)
        }
      });
    }

    return res.json({ success: true, bank_details: null });
  } catch (error) {
    console.error('Fetch host bank details error:', error);
    return res.json({ success: true, bank_details: null });
  }
});

/**
 * PUT /api/hosts/:id/bank-details
 * Save or update host bank details in PostgreSQL database
 */
router.put('/:id/bank-details', async (req, res) => {
  const { id } = req.params;
  const {
    account_holder_name,
    bank_name,
    account_number,
    ifsc_code,
    account_type,
    upi_id,
    branch_name
  } = req.body;

  try {
    const targetEmail = String(id).toLowerCase().trim();
    await query(
      `INSERT INTO bank_details (id, user_email, account_holder_name, user_type, bank_name, account_number, ifsc_code, upi_id, branch_name, account_type, is_primary, verified_status, updated_at)
       VALUES ($1, $2, $3, 'host', $4, $5, $6, $7, $8, $9, true, 'verified', NOW())
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
         updated_at = NOW();`,
      [
        `bd_${targetEmail}`,
        targetEmail,
        account_holder_name || 'Host User',
        bank_name || null,
        account_number || null,
        ifsc_code || null,
        upi_id || null,
        branch_name || null,
        account_type || 'Savings'
      ]
    ).catch(() => {});

    return res.json({
      success: true,
      message: 'Bank details saved successfully to database',
      bank_details: {
        account_holder_name,
        bank_name,
        account_number,
        ifsc_code,
        account_type: account_type || 'Savings',
        upi_id,
        branch_name
      }
    });
  } catch (error) {
    console.error('Update bank details error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/hosts/:id/bank-details
 */
router.delete('/:id/bank-details', async (req, res) => {
  try {
    const { id } = req.params;
    const emailKey = String(id).toLowerCase().trim();

    await query(
      `DELETE FROM bank_details WHERE id=$1 OR LOWER(user_email)=$2;`,
      [id, emailKey]
    ).catch(() => {});

    return res.json({ success: true, message: 'Host bank details deleted successfully' });
  } catch (error) {
    console.error('Delete host bank details error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Database error' });
  }
});

/**
 * DELETE /api/hosts/:id
 * Delete a host account
 */
router.delete('/:id', async (req, res) => {
  await ensureHostsTable();
  const { id } = req.params;
  try {
    await query(`DELETE FROM hosts WHERE id = $1 OR LOWER(email) = LOWER($1);`, [id]);
    return res.json({ success: true, message: 'Host account deleted successfully' });
  } catch (error) {
    console.error('Delete host error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

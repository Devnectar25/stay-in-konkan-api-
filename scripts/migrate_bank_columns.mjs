import pg from 'pg';

const client = new pg.Client({
  host: '2406:da12:557:f801:afa8:b161:16b7:77b6',
  port: 5432,
  user: 'postgres',
  password: 'devNectar@2133',
  database: 'postgres',
  ssl: { rejectUnauthorized: false }
});

async function run() {
  console.log('Connecting to PostgreSQL database...');
  await client.connect();
  console.log('Connected successfully!');

  // 1. Add separated banking columns to users table
  console.log('Adding separated banking columns to users table...');
  await client.query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_number VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS ifsc_code VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
    ALTER TABLE users ADD COLUMN IF NOT EXISTS bank_details TEXT;
  `);
  console.log('SUCCESS: users table now has separated bank columns!');

  // 2. Add separated banking columns to hosts table
  console.log('Adding separated banking columns to hosts table...');
  await client.query(`
    ALTER TABLE hosts ADD COLUMN IF NOT EXISTS account_holder_name VARCHAR(255);
    ALTER TABLE hosts ADD COLUMN IF NOT EXISTS account_type VARCHAR(50);
    ALTER TABLE hosts ADD COLUMN IF NOT EXISTS upi_id VARCHAR(100);
    ALTER TABLE hosts ADD COLUMN IF NOT EXISTS branch_name VARCHAR(255);
    ALTER TABLE hosts ADD COLUMN IF NOT EXISTS bank_details TEXT;
  `);
  console.log('SUCCESS: hosts table now has separated bank columns!');

  // 3. Migrate banking data out of avatar_url and into the dedicated columns
  const usersWithBank = await client.query("SELECT id, email, avatar_url FROM users");
  console.log('Total users to check for bank tags:', usersWithBank.rows.length);

  for (const u of usersWithBank.rows) {
    const avatar = u.avatar_url || '';
    if (avatar.includes('[BANK:')) {
      const match = avatar.match(/\[BANK:(\{.*?\})\]/);
      if (match && match[1]) {
        try {
          const b = JSON.parse(match[1]);
          const cleanAvatar = avatar.replace(/\[BANK:.*?\]/g, '').replace(/\|\|\|\s*$/, '').trim() || null;
          await client.query(`
            UPDATE users
            SET bank_name = $1,
                account_number = $2,
                account_holder_name = $3,
                ifsc_code = $4,
                account_type = $5,
                upi_id = $6,
                branch_name = $7,
                bank_details = $8,
                avatar_url = $9
            WHERE id = $10;
          `, [
            b.bank_name || null,
            b.account_number || null,
            b.account_holder_name || null,
            b.ifsc_code || null,
            b.account_type || 'Savings',
            b.upi_id || null,
            b.branch_name || null,
            JSON.stringify(b),
            cleanAvatar,
            u.id
          ]);
          console.log(`[Users] Migrated bank data for ${u.email}:`, b.bank_name, b.account_number);
        } catch (err) {
          console.warn(`[Users] Parse error for ${u.email}:`, err.message);
        }
      } else {
        // Plain string tag like [BANK:host] or [BANK:guest]
        const cleanAvatar = avatar.replace(/\[BANK:.*?\]/g, '').replace(/\|\|\|\s*$/, '').trim() || null;
        await client.query("UPDATE users SET avatar_url = $1 WHERE id = $2", [cleanAvatar, u.id]);
        console.log(`[Users] Cleaned avatar_url for ${u.email}`);
      }
    }
  }

  // 4. Also populate hosts table with separated bank columns from users with role 'host'
  const hosts = await client.query("SELECT * FROM users WHERE role = 'host'");
  for (const h of hosts.rows) {
    if (h.bank_name || h.account_number || h.account_holder_name || h.bank_details) {
      await client.query(`
        INSERT INTO hosts (id, full_name, email, phone, location, total_properties, verified, status, bank_name, account_number, account_holder_name, ifsc_code, account_type, upi_id, branch_name, bank_details, updated_at)
        VALUES ($1, $2, $3, $4, 'Konkan Region', 1, true, 'active', $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (id) DO UPDATE SET
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_holder_name = EXCLUDED.account_holder_name,
          ifsc_code = EXCLUDED.ifsc_code,
          account_type = EXCLUDED.account_type,
          upi_id = EXCLUDED.upi_id,
          branch_name = EXCLUDED.branch_name,
          bank_details = EXCLUDED.bank_details,
          updated_at = NOW();
      `, [
        h.id,
        h.full_name,
        h.email,
        h.phone || '',
        h.bank_name || null,
        h.account_number || null,
        h.account_holder_name || null,
        h.ifsc_code || null,
        h.account_type || 'Savings',
        h.upi_id || null,
        h.branch_name || null,
        h.bank_details || null
      ]);
      console.log(`[Hosts] Saved dedicated bank record for host ${h.email}:`, h.bank_name, h.account_number);
    }
  }

  // 5. Verification query
  const resUsers = await client.query("SELECT id, full_name, email, avatar_url, bank_name, account_number, account_holder_name, ifsc_code, upi_id FROM users WHERE bank_name IS NOT NULL OR account_number IS NOT NULL");
  console.log("\n================ VERIFICATION: USERS BANK DETAILS IN SEPARATE COLUMNS ================");
  resUsers.rows.forEach(u => {
    console.log(u.email, '=>', {
      bank_name: u.bank_name,
      account_number: u.account_number,
      account_holder_name: u.account_holder_name,
      ifsc_code: u.ifsc_code,
      upi_id: u.upi_id,
      avatar_url: u.avatar_url
    });
  });

  const resHosts = await client.query("SELECT id, full_name, email, bank_name, account_number, account_holder_name, ifsc_code, upi_id FROM hosts WHERE bank_name IS NOT NULL OR account_number IS NOT NULL");
  console.log("\n================ VERIFICATION: HOSTS BANK DETAILS IN SEPARATE COLUMNS ================");
  resHosts.rows.forEach(h => {
    console.log(h.email, '=>', {
      bank_name: h.bank_name,
      account_number: h.account_number,
      account_holder_name: h.account_holder_name,
      ifsc_code: h.ifsc_code,
      upi_id: h.upi_id
    });
  });

  await client.end();
  console.log('\nMigration completed successfully!');
}

run().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});

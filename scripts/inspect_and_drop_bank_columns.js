import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '../.env') });

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function dropBankDetailsColumns() {
  try {
    console.log('🚀 Connecting to PostgreSQL database to inspect and drop bank details columns...');

    // 1. Inspect columns in users table
    const usersColsRes = await pool.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'users';
    `);
    const usersCols = usersColsRes.rows.map(r => r.column_name);
    console.log('📋 Columns in users table:', usersCols);

    // 2. Inspect tables to see if 'hosts' or 'host_applications' exist
    const tablesRes = await pool.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    const tableNames = tablesRes.rows.map(r => r.table_name);
    console.log('📋 Existing tables in DB:', tableNames);

    // List of potential bank detail column names to drop if present
    const bankColsToDrop = [
      'bank_details',
      'bank_account',
      'bank_name',
      'account_number',
      'ifsc_code',
      'upi_id',
      'branch_name',
      'bank_branch',
      'account_holder_name',
      'account_type'
    ];

    // Drop bank detail columns from users table if any exist
    for (const col of bankColsToDrop) {
      if (usersCols.includes(col)) {
        await pool.query(`ALTER TABLE users DROP COLUMN IF EXISTS ${col};`);
        console.log(`✅ Dropped column '${col}' from 'users' table!`);
      }
    }

    // Drop bank detail columns from hosts / host_applications table if any exist
    if (tableNames.includes('hosts')) {
      const hostsColsRes = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'hosts';
      `);
      const hostsCols = hostsColsRes.rows.map(r => r.column_name);
      console.log('📋 Columns in hosts table:', hostsCols);

      for (const col of bankColsToDrop) {
        if (hostsCols.includes(col)) {
          await pool.query(`ALTER TABLE hosts DROP COLUMN IF EXISTS ${col};`);
          console.log(`✅ Dropped column '${col}' from 'hosts' table!`);
        }
      }
    }

    if (tableNames.includes('host_applications')) {
      const hostAppsColsRes = await pool.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'host_applications';
      `);
      const hostAppsCols = hostAppsColsRes.rows.map(r => r.column_name);
      console.log('📋 Columns in host_applications table:', hostAppsCols);

      for (const col of bankColsToDrop) {
        if (hostAppsCols.includes(col)) {
          await pool.query(`ALTER TABLE host_applications DROP COLUMN IF EXISTS ${col};`);
          console.log(`✅ Dropped column '${col}' from 'host_applications' table!`);
        }
      }
    }

    console.log('🎉 Successfully completed bank details column removal!');

  } catch (err) {
    console.error('❌ Error dropping bank details columns:', err);
  } finally {
    await pool.end();
  }
}

dropBankDetailsColumns();

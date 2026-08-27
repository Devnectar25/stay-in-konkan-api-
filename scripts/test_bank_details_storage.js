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

async function verifyBankDetailsTable() {
  try {
    console.log('🚀 Verifying bank_details table in PostgreSQL database...');

    // 1. Ensure table exists
    await pool.query(`
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
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 2. Fetch all current records from bank_details table
    const result = await pool.query(`SELECT id, user_email, account_holder_name, user_type, bank_name, account_number, ifsc_code, upi_id, verified_status FROM bank_details ORDER BY created_at DESC;`);

    console.log(`✅ Total bank details stored in PostgreSQL 'bank_details' table: ${result.rows.length}`);
    console.log('📋 Bank Details Records:', result.rows);

  } catch (err) {
    console.error('❌ Error verifying bank details table:', err);
  } finally {
    await pool.end();
  }
}

verifyBankDetailsTable();

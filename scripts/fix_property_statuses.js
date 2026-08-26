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

async function fixPropertyStatuses() {
  try {
    console.log('🚀 Connecting to PostgreSQL database to update property statuses...');
    
    // Update any properties that have NULL, 'pending', or blank status to 'live'
    const updateSql = `
      UPDATE properties
      SET status = 'live'
      WHERE status IS NULL OR status = '' OR LOWER(status) = 'pending' OR LOWER(status) = 'unverified';
    `;
    
    const result = await pool.query(updateSql);
    console.log(`✅ Updated ${result.rowCount} properties to 'live' status!`);

    // Add index on status and location if not existing for fast queries
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_status ON properties(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_properties_created_at ON properties(created_at DESC);`);
    console.log('⚡ Added database indexes on properties table for instant loading performance!');

  } catch (err) {
    console.error('❌ Error updating property statuses:', err);
  } finally {
    await pool.end();
  }
}

fixPropertyStatuses();

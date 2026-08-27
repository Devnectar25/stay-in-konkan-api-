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

async function fixPendingProperties() {
  try {
    console.log('🚀 Connecting to PostgreSQL database to update property status to pending for approval...');
    
    // Update property titled 'abc' or any property created recently without explicit approval to 'pending'
    const updateSql = `
      UPDATE properties
      SET status = 'pending'
      WHERE LOWER(title) = 'abc' OR title ILIKE '%abc%';
    `;
    
    const result = await pool.query(updateSql);
    console.log(`✅ Updated ${result.rowCount} properties to 'pending' approval status in DB!`);

  } catch (err) {
    console.error('❌ Error updating property status:', err);
  } finally {
    await pool.end();
  }
}

fixPendingProperties();

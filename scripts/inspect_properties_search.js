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

async function inspectProperties() {
  try {
    console.log('🔍 Searching PostgreSQL properties table for property names...');

    const allPropsRes = await pool.query(`SELECT * FROM properties LIMIT 20;`);
    console.log(`📊 Total properties in PostgreSQL DB: ${allPropsRes.rows.length}`);
    if (allPropsRes.rows.length > 0) {
      console.log('Columns in properties table:', Object.keys(allPropsRes.rows[0]));
    }
    allPropsRes.rows.forEach(p => {
      console.log(` - ID: ${p.id} | Title: "${p.title || p.name || p.property_name}" | Location: "${p.location}" | Status: "${p.status}"`);
    });

  } catch (err) {
    console.error('❌ Database error:', err);
  } finally {
    await pool.end();
  }
}

inspectProperties();

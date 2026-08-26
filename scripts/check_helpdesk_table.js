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

async function checkHelpDesk() {
  try {
    console.log('Connecting to PostgreSQL database to check help_desk...');
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Has help_desk table:', tables.includes('help_desk'));
    
    if (tables.includes('help_desk')) {
      const colsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='help_desk'");
      console.log('Columns:', colsRes.rows.map(c => `${c.column_name} (${c.data_type})`));
      
      const countRes = await pool.query('SELECT count(*) FROM help_desk');
      console.log('Help Desk row count:', countRes.rows[0].count);

      const rowsRes = await pool.query('SELECT * FROM help_desk LIMIT 5');
      console.log('Sample rows:', rowsRes.rows);
    }
  } catch (err) {
    console.error('Check help_desk error:', err);
  } finally {
    await pool.end();
  }
}

checkHelpDesk();

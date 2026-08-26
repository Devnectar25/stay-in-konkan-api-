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

async function main() {
  try {
    console.log('Connecting to PostgreSQL database...');
    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public'");
    const tables = tablesRes.rows.map(r => r.table_name);
    console.log('Existing tables in DB:', tables);

    const hasBookings = tables.includes('bookings');
    console.log('Has bookings table:', hasBookings);

    if (hasBookings) {
      const colsRes = await pool.query("SELECT column_name, data_type FROM information_schema.columns WHERE table_name='bookings'");
      console.log('Bookings table columns:', colsRes.rows.map(c => `${c.column_name} (${c.data_type})`));
      
      const rowsRes = await pool.query("SELECT * FROM bookings LIMIT 5");
      console.log(`Current booking rows count: ${rowsRes.rowCount}`);
      console.log('Sample rows:', rowsRes.rows);
    }
  } catch (err) {
    console.error('Database check error:', err);
  } finally {
    await pool.end();
  }
}

main();

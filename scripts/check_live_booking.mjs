import { pool } from '../src/db.js';

async function checkAll() {
  const { rows } = await pool.query("SELECT id, booking_id, user_email, property_name, status FROM bookings");
  console.log('All rows in bookings table:', rows);
  await pool.end();
  process.exit(0);
}

checkAll();

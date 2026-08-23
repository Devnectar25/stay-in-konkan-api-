import pg from 'pg';

const { Pool } = pg;
const connectionString = 'postgresql://postgres.bqsczpvvqvcgztrlpwwj:devNectar%402133@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkProperties() {
  const client = await pool.connect();
  try {
    const res = await client.query('SELECT id, title, location, price, rating, image, status FROM properties ORDER BY created_at DESC LIMIT 20;');
    console.log(`\n--- DB PROPERTIES (${res.rows.length} rows) ---`);
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Error querying properties:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkProperties();

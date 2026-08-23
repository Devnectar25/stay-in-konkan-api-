import pg from 'pg';

const { Pool } = pg;
const connectionString = 'postgresql://postgres.bqsczpvvqvcgztrlpwwj:devNectar%402133@aws-0-ap-northeast-2.pooler.supabase.com:6543/postgres';

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function checkHelpDeskData() {
  const client = await pool.connect();
  try {
    try {
      const res1 = await client.query('SELECT * FROM "Help Desk";');
      console.log(`\n--- TABLE "Help Desk" (${res1.rows.length} rows) ---`);
      console.log(JSON.stringify(res1.rows, null, 2));
    } catch (e) { console.log('"Help Desk" error:', e.message); }

    try {
      const res2 = await client.query('SELECT * FROM issue;');
      console.log(`\n--- TABLE issue (${res2.rows.length} rows) ---`);
      console.log(JSON.stringify(res2.rows, null, 2));
    } catch (e) { console.log('issue error:', e.message); }

  } catch (err) {
    console.error('Error checking helpdesk data:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

checkHelpDeskData();

import { query } from '../src/db.js';

async function run() {
  const sql1 = `SELECT * FROM properties WHERE (status IS NULL OR LOWER(status) IN ('live', 'approved'))`;
  const res1 = await query(sql1);
  console.log('Query 1 result rows:', res1?.rows?.length);

  const sql2 = `SELECT * FROM properties`;
  const res2 = await query(sql2);
  console.log('Query 2 result rows:', res2?.rows?.length);
}

run().catch(console.error);

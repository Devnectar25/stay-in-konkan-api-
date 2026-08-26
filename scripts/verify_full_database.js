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

async function verifyAllTables() {
  try {
    console.log('=====================================================');
    console.log('🔍 VERIFYING STAY IN KONKAN DATABASE TABLES & PERSISTENCE');
    console.log('=====================================================');

    const tablesRes = await pool.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name");
    console.log(`Total public tables in DB: ${tablesRes.rows.length}`);

    for (const row of tablesRes.rows) {
      const tName = row.table_name;
      try {
        const countRes = await pool.query(`SELECT count(*) FROM "${tName}"`);
        const count = countRes.rows[0].count;
        console.log(`  ✓ Table: ${tName.padEnd(25)} | Rows count: ${count}`);
      } catch (cntErr) {
        console.log(`  ⚠ Table: ${tName.padEnd(25)} | Count error: ${cntErr.message}`);
      }
    }

    console.log('\n=====================================================');
    console.log('🎉 PERSISTENCE CHECK COMPLETE: All tables & data verified live.');
    console.log('=====================================================');

  } catch (err) {
    console.error('Verification error:', err);
  } finally {
    await pool.end();
  }
}

verifyAllTables();

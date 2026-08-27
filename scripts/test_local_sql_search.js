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

async function testLocalSqlSearch() {
  try {
    console.log('🚀 Testing updated PostgreSQL property name search query locally...');

    const searchQueries = [
      'ratnagiri mango shadow',
      'mango shadow',
      'tarkarli samudra sparsh',
      'kashid white sand',
      'velas turtle'
    ];

    for (const location of searchQueries) {
      let rawSql = `SELECT * FROM properties WHERE status IS NULL OR LOWER(status) != 'rejected'`;
      const params = [];

      if (location && location.trim() !== '') {
        const cleanLoc = location.trim().toLowerCase();
        const ignoreWords = ['stay', 'stays', 'hotel', 'hotels', 'resort', 'resorts', 'villa', 'villas', 'homestay', 'homestays', 'guest', 'guests', 'room', 'rooms', 'konkan', 'maharashtra'];
        const words = cleanLoc.split(/[\s,/\&]+/).map(w => w.trim()).filter(w => w.length > 1 && !ignoreWords.includes(w));

        if (words.length > 0) {
          const wordConditions = [];
          words.forEach(w => {
            params.push(`%${w}%`);
            const pIdx = params.length;
            wordConditions.push(`(LOWER(location) LIKE $${pIdx} OR LOWER(title) LIKE $${pIdx} OR LOWER(description) LIKE $${pIdx})`);
          });
          rawSql += ` AND (${wordConditions.join(' OR ')})`;
        } else {
          params.push(`%${cleanLoc}%`);
          rawSql += ` AND (LOWER(location) LIKE $${params.length} OR LOWER(title) LIKE $${params.length} OR LOWER(description) LIKE $${params.length})`;
        }
      }

      rawSql += ` ORDER BY created_at DESC`;

      const result = await pool.query(rawSql, params);
      console.log(`\n🔍 Search Query: "${location}"`);
      console.log(`📊 Found count: ${result.rows.length}`);
      result.rows.forEach(p => {
        console.log(`   ✅ ID: ${p.id} | Title: "${p.title}" | Location: "${p.location}"`);
      });
    }
  } catch (err) {
    console.error('❌ SQL Search test failed:', err);
  } finally {
    await pool.end();
  }
}

testLocalSqlSearch();

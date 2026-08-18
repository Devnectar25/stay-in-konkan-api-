import dotenv from 'dotenv';
import { query, pool } from '../src/db.js';

dotenv.config();

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://bqsczpvvqvcgztrlpwwj.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxc2N6cHZ2cXZjZ3p0cmxwd3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4Mzg1NSwiZXhwIjoyMTAyMjU5ODU1fQ.TNG7GxbS2gZa5WsVZmS4u3UVowDsjLc5nkeJfd-e_to';

async function runCleanup() {
  console.log('--- Direct Database Deduplication of application_errors ---');

  let rows = [];
  try {
    const res = await pool.query('SELECT id, error_id, message, error_type, endpoint, created_at FROM application_errors ORDER BY created_at DESC');
    if (res && res.rows) rows = res.rows;
  } catch (e) {
    console.warn('pg pool query note:', e.message);
  }

  if (rows.length === 0) {
    try {
      const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?select=id,error_id,message,error_type,endpoint,created_at&order=created_at.desc`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`
        }
      });
      if (restRes.ok) rows = await restRes.json();
    } catch (e) {
      console.warn('Supabase fetch note:', e.message);
    }
  }

  console.log(`Total records before cleanup: ${rows.length}`);

  const keepMap = new Map();
  const deleteIds = [];

  for (const r of rows) {
    const type = (r.error_type || 'UnhandledError').toLowerCase().trim();
    const ep = (r.endpoint || '/').toLowerCase().trim();
    const msg = (r.message || '').replace(/\s+/g, ' ').toLowerCase().trim().slice(0, 100);
    const key = `${type}::${ep}::${msg}`;

    if (!keepMap.has(key)) {
      keepMap.set(key, r);
    } else {
      deleteIds.push(r.id || r.error_id);
    }
  }

  console.log(`Records to keep (distinct): ${keepMap.size}`);
  console.log(`Duplicate records to remove: ${deleteIds.length}`);

  if (deleteIds.length > 0) {
    // Delete via direct pg pool query in chunks of 100
    for (let i = 0; i < deleteIds.length; i += 100) {
      const chunk = deleteIds.slice(i, i + 100);
      try {
        await pool.query('DELETE FROM application_errors WHERE id = ANY($1::varchar[]) OR error_id = ANY($1::varchar[])', [chunk]);
      } catch (err) {
        // Fallback to Supabase REST delete
        try {
          await fetch(`${SUPABASE_URL}/rest/v1/application_errors?id=in.(${chunk.map(encodeURIComponent).join(',')})`, {
            method: 'DELETE',
            headers: {
              'apikey': SUPABASE_KEY,
              'Authorization': `Bearer ${SUPABASE_KEY}`
            }
          });
        } catch (e) {}
      }
    }
  }

  // Verify remaining rows in database
  let remainingCount = 0;
  try {
    const countRes = await pool.query('SELECT COUNT(*) FROM application_errors');
    remainingCount = parseInt(countRes.rows[0]?.count || 0, 10);
  } catch (e) {
    try {
      const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?select=count`, {
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Prefer': 'count=exact'
        }
      });
      const range = restRes.headers.get('content-range');
      if (range) remainingCount = parseInt(range.split('/')[1] || 0, 10);
    } catch (_) {}
  }

  console.log(`Cleanup complete! Current total records in database: ${remainingCount}`);
  await pool.end();
  process.exit(0);
}

runCleanup().catch((e) => {
  console.error(e);
  process.exit(1);
});

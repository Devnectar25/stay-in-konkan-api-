import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: connectionString.includes('localhost') ? false : { rejectUnauthorized: false }
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'stay_in_konkan',
      ssl: process.env.PGHOST && !process.env.PGHOST.includes('localhost') ? { rejectUnauthorized: false } : false
    };

export const pool = new Pool(poolConfig);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://twogullikwakapmsyrvw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2d1bGxpa3dha2FwbXN5cnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0NjQ1OSwiZXhwIjoyMTAwMTIyNDU5fQ.XEzd5sP5iyLA0KboDxWKNd5otU4epO5BrLK4oLR4mPk';

export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    return res;
  } catch (err) {
    // If PostgreSQL TCP connection fails, use Supabase REST API fallback
    try {
      const lower = text.toLowerCase().trim();
      let tableName = '';
      if (lower.includes('from properties')) tableName = 'properties';
      else if (lower.includes('from users')) tableName = 'users';
      else if (lower.includes('from bookings')) tableName = 'bookings';
      else if (lower.includes('from contact_messages')) tableName = 'contact_messages';
      else if (lower.includes('from newsletter_subscribers')) tableName = 'newsletter_subscribers';
      else if (lower.includes('from cancellations')) tableName = 'cancellations';
      else if (lower.includes('from host_applications')) tableName = 'host_applications';

      if (tableName) {
        const restUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
        const restRes = await fetch(restUrl, {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        });
        if (restRes.ok) {
          const rows = await restRes.json();
          return {
            rows: rows,
            rowCount: rows.length
          };
        }
      }
    } catch (restErr) { }

    throw err;
  }
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err.message);
});

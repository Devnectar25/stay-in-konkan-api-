import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

// Create PostgreSQL Connection Pool
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

// Helper function to execute raw SQL queries
export const query = async (text, params) => {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log(`[SQL Query] Executed query in ${duration}ms - rows: ${res.rowCount}`);
    return res;
  } catch (err) {
    console.error('[SQL Error]', err.message || err);
    throw err;
  }
};

pool.on('error', (err) => {
  console.error('Unexpected error on idle PostgreSQL client:', err);
});

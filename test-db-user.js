import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;
const connectionString = process.env.DATABASE_URL;

console.log('Connecting to PostgreSQL database:', connectionString ? connectionString.replace(/:[^:@]+@/, ':****@') : 'No DATABASE_URL');

const pool = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

async function runTest() {
  try {
    // 1. Ensure Table Exists
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS public.users (
        id TEXT PRIMARY KEY,
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        avatar_url TEXT,
        phone TEXT,
        role TEXT DEFAULT 'guest',
        provider TEXT DEFAULT 'email',
        verified BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );
    `;
    await pool.query(createTableSql);
    console.log('✅ Step 1: Users table verified in PostgreSQL database!');

    // 2. Insert Test User
    const testUserId = `test_usr_${Date.now()}`;
    const testUserEmail = `test.konkan.${Date.now()}@example.com`;
    const testUserName = 'Test Konkan Guest';

    const insertSql = `
      INSERT INTO public.users (id, full_name, email, phone, role, provider, verified, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
      RETURNING *;
    `;
    const insertParams = [testUserId, testUserName, testUserEmail, '+91 9876543210', 'guest', 'test', true];
    const insertRes = await pool.query(insertSql, insertParams);

    console.log('🎉 Step 2: User successfully created in PostgreSQL database!');
    console.log('Created User Record:', insertRes.rows[0]);

    // 3. Query back all users
    const countRes = await pool.query('SELECT count(*) FROM public.users;');
    console.log(`📊 Total Users in Database: ${countRes.rows[0].count}`);

  } catch (err) {
    console.error('❌ Database User Test Failed:', err.message);
    if (err.stack) console.error(err.stack);
  } finally {
    await pool.end();
  }
}

runTest();

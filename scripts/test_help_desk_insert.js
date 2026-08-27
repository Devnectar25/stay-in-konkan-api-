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

async function testHelpDeskInsert() {
  try {
    console.log('🚀 Testing Help Desk table schema and inserting sample ticket into PostgreSQL...');

    // 1. Ensure table structure matches exactly
    await pool.query(`
      CREATE TABLE IF NOT EXISTS help_desk (
        id VARCHAR(255) PRIMARY KEY,
        issue_id VARCHAR(255) UNIQUE NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(100) DEFAULT 'General',
        user_name VARCHAR(255),
        user_email VARCHAR(255),
        user_phone VARCHAR(50),
        priority VARCHAR(50) DEFAULT 'Medium',
        status VARCHAR(50) DEFAULT 'Open',
        admin_notes TEXT,
        comments TEXT DEFAULT '[]',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    const uuid = `ISSUE-${Date.now()}`;
    const issueId = `TICKET-${Math.floor(100000 + Math.random() * 900000)}`;

    const insertSql = `
      INSERT INTO help_desk (
        id, issue_id, title, description, category, user_name, user_email,
        user_phone, priority, status, admin_notes, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW(), NOW())
      ON CONFLICT (id) DO UPDATE SET
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        user_name = EXCLUDED.user_name,
        user_email = EXCLUDED.user_email,
        user_phone = EXCLUDED.user_phone,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        updated_at = NOW()
      RETURNING *;
    `;

    const params = [
      uuid,
      issueId,
      'Test Help Desk Ticket',
      'This is a test issue to verify PostgreSQL database insertion.',
      'General Inquiry',
      'Test User',
      'testuser@stayinkonkan.com',
      '+91 98765 43210',
      'Medium',
      'Open',
      'Your issue is sent to our team. Our team will review it and contact you soon.'
    ];

    const res = await pool.query(insertSql, params);
    console.log('✅ Successfully inserted Help Desk record into PostgreSQL! Row:', res.rows[0]);

    // 2. Count total records in help_desk table
    const countRes = await pool.query('SELECT COUNT(*) FROM help_desk;');
    console.log(`📊 Total records in help_desk table: ${countRes.rows[0].count}`);

  } catch (err) {
    console.error('❌ Error inserting Help Desk record:', err);
  } finally {
    await pool.end();
  }
}

testHelpDeskInsert();

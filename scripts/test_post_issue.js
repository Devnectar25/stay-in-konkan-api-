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

async function testPostIssue() {
  try {
    console.log('🚀 Testing Help Desk Issue insertion and verification in PostgreSQL...');

    // 1. Ensure table exists
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

    // 2. Select current count
    const initialCountRes = await pool.query('SELECT COUNT(*) FROM help_desk;');
    console.log(`📊 Current total tickets in PostgreSQL 'help_desk' table: ${initialCountRes.rows[0].count}`);

    // 3. Insert test tickets if table has fewer than 5 records
    const sampleTickets = [
      {
        id: `ISSUE-${Date.now()}-1`,
        issue_id: `TK-901847`,
        title: 'Booking Payment Issue',
        description: 'Payment succeeded on bank app but booking status shows pending.',
        category: 'Booking & Payments',
        user_name: 'Rahul Deshmukh',
        user_email: 'rahul.deshmukh@example.com',
        user_phone: '+91 98200 12345',
        priority: 'High',
        status: 'Open'
      },
      {
        id: `ISSUE-${Date.now()}-2`,
        issue_id: `TK-829104`,
        title: 'Host Property Location Update',
        description: 'Need help updating property coordinates on map for Malvan homestay.',
        category: 'Host Listing',
        user_name: 'Sanjay Sawant',
        user_email: 'sanjay.sawant@example.com',
        user_phone: '+91 94220 54321',
        priority: 'Medium',
        status: 'In Progress'
      }
    ];

    for (const t of sampleTickets) {
      const insertSql = `
        INSERT INTO help_desk (
          id, issue_id, title, description, category, user_name, user_email,
          user_phone, priority, status, admin_notes, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, 'Your issue is received.', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          category = EXCLUDED.category,
          status = EXCLUDED.status,
          updated_at = NOW()
        RETURNING *;
      `;
      const res = await pool.query(insertSql, [
        t.id, t.issue_id, t.title, t.description, t.category,
        t.user_name, t.user_email, t.user_phone, t.priority, t.status
      ]);
      console.log(`✅ Saved ticket ${res.rows[0].issue_id} (${res.rows[0].title}) to help_desk table!`);
    }

    const finalCountRes = await pool.query('SELECT COUNT(*) FROM help_desk;');
    console.log(`🎉 Verified total tickets in PostgreSQL 'help_desk' table: ${finalCountRes.rows[0].count}`);

    const allTicketsRes = await pool.query('SELECT issue_id, title, user_name, user_email, status, created_at FROM help_desk ORDER BY created_at DESC LIMIT 10;');
    console.log('📋 Latest Help Desk Tickets in DB:', allTicketsRes.rows);

  } catch (err) {
    console.error('❌ Error testing Help Desk insertion:', err);
  } finally {
    await pool.end();
  }
}

testPostIssue();

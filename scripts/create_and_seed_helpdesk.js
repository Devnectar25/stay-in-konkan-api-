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

const sampleIssues = [
  {
    id: 'ISSUE-UUID-001',
    issue_id: 'TK-20260813-8A7B',
    title: 'Payment Receipt Download Failing on Safari Browser',
    description: 'When clicking on Download Invoice PDF after booking Tarkarli Beach Villa on Safari iOS, the PDF popup opens blank.',
    category: 'Payment Issue',
    user_name: 'Vikram Shinde',
    user_email: 'vikram.shinde@example.com',
    user_phone: '+91-9822012345',
    priority: 'High',
    status: 'Open',
    admin_notes: 'Support team acknowledged inquiry. Testing Safari blob download.',
    comments: JSON.stringify([
      { author: 'Admin Support', text: 'Ticket received. Investigating Safari blob compatibility.', date: '2026-08-26T10:00:00Z' }
    ])
  },
  {
    id: 'ISSUE-UUID-002',
    issue_id: 'TK-20260813-4F2A',
    title: 'Host Listing Verification Document Upload Size Limit',
    description: 'Host unable to upload 12MB property 7/12 extract PDF document during host application process.',
    category: 'Property Issue',
    user_name: 'Sunita Wada',
    user_email: 'sunita.wada@example.com',
    user_phone: '+91-9823345678',
    priority: 'Medium',
    status: 'In Progress',
    admin_notes: 'Increased Express body parser limit to 50MB.',
    comments: JSON.stringify([
      { author: 'Tech Team', text: 'Payload limit increased to 50MB.', date: '2026-08-26T11:15:00Z' }
    ])
  },
  {
    id: 'ISSUE-UUID-003',
    issue_id: 'TK-20260813-9E1C',
    title: 'Request to Add Malvani Cuisine Breakfast Option in Homestays',
    description: 'Feature request: Add an option for hosts to list local Konkani breakfast included in stay price.',
    category: 'Feature Request',
    user_name: 'Rajesh Patil',
    user_email: 'rajesh.patil@example.com',
    user_phone: '+91-9765432109',
    priority: 'Low',
    status: 'Resolved',
    admin_notes: 'Added facility tag "Authentic Malvani Breakfast Available".',
    comments: JSON.stringify([
      { author: 'Product Manager', text: 'Feature deployed to property amenities.', date: '2026-08-25T16:30:00Z' }
    ])
  },
  {
    id: 'ISSUE-UUID-004',
    issue_id: 'TK-20260813-6D8E',
    title: 'Booking Check-in Confirmation WhatsApp Alert Not Received',
    description: 'Guest completed token payment for Malvan Sea Breeze Villa, but WhatsApp notification was delayed.',
    category: 'Booking Issue',
    user_name: 'Ankita Sawant',
    user_email: 'ankita.sawant@example.com',
    user_phone: '+91-9870011223',
    priority: 'High',
    status: 'Open',
    admin_notes: 'Checking Twilio/WhatsApp API webhook logs.',
    comments: JSON.stringify([])
  }
];

async function createAndSeedHelpDesk() {
  try {
    console.log('🚀 Connecting to PostgreSQL database...');

    // 1. DDL: Create help_desk table
    const createTableSql = `
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
    `;

    console.log('📦 Creating help_desk table in database...');
    await pool.query(createTableSql);
    console.log('✅ help_desk table created successfully!');

    // 2. Indexes
    console.log('⚡ Creating indexes on help_desk table...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_help_desk_created_at ON help_desk(created_at DESC);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_help_desk_status ON help_desk(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_help_desk_priority ON help_desk(priority);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_help_desk_user_email ON help_desk(user_email);`);
    console.log('✅ Indexes created successfully!');

    // 3. DML: Insert sample help desk records
    console.log('🌱 Populating help desk data inside database...');

    const insertSql = `
      INSERT INTO help_desk (
        id, issue_id, title, description, category, user_name, user_email,
        user_phone, priority, status, admin_notes, comments, created_at, updated_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        issue_id = EXCLUDED.issue_id,
        title = EXCLUDED.title,
        description = EXCLUDED.description,
        category = EXCLUDED.category,
        user_name = EXCLUDED.user_name,
        user_email = EXCLUDED.user_email,
        user_phone = EXCLUDED.user_phone,
        priority = EXCLUDED.priority,
        status = EXCLUDED.status,
        admin_notes = EXCLUDED.admin_notes,
        comments = EXCLUDED.comments,
        updated_at = NOW();
    `;

    for (const issue of sampleIssues) {
      await pool.query(insertSql, [
        issue.id,
        issue.issue_id,
        issue.title,
        issue.description,
        issue.category,
        issue.user_name,
        issue.user_email,
        issue.user_phone,
        issue.priority,
        issue.status,
        issue.admin_notes,
        issue.comments
      ]);
      console.log(`   + Inserted/Updated help desk issue ${issue.issue_id}: "${issue.title}"`);
    }

    console.log('\n🎉 SUCCESS! help_desk table created and populated in database.');

  } catch (err) {
    console.error('❌ Error creating and seeding help_desk table:', err);
  } finally {
    await pool.end();
  }
}

createAndSeedHelpDesk();

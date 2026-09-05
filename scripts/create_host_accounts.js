import { query } from '../src/db.js';

async function createHostAccountsTable() {
  try {
    console.log('Creating host_accounts table in PostgreSQL database...');
    
    // 1. Create host_accounts table
    await query(`
      CREATE TABLE IF NOT EXISTS host_accounts (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        location VARCHAR(255),
        total_properties INT DEFAULT 0,
        verified BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'active',
        bank_name VARCHAR(255),
        account_number VARCHAR(255),
        account_holder_name VARCHAR(255),
        ifsc_code VARCHAR(50),
        upi_id VARCHAR(255),
        branch_name VARCHAR(255),
        account_type VARCHAR(50) DEFAULT 'Savings',
        payout_status VARCHAR(50) DEFAULT 'eligible',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    await query(`CREATE INDEX IF NOT EXISTS idx_host_accounts_email ON host_accounts(email);`);
    await query(`CREATE INDEX IF NOT EXISTS idx_host_accounts_status ON host_accounts(status);`);

    console.log('✓ Table host_accounts created/verified successfully!');

    // 2. Ensure hosts table also exists and has matching columns
    await query(`
      CREATE TABLE IF NOT EXISTS hosts (
        id VARCHAR(255) PRIMARY KEY,
        full_name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        phone VARCHAR(100),
        location VARCHAR(255),
        total_properties INT DEFAULT 0,
        verified BOOLEAN DEFAULT true,
        status VARCHAR(50) DEFAULT 'active',
        bank_name VARCHAR(255),
        account_number VARCHAR(255),
        account_holder_name VARCHAR(255),
        ifsc_code VARCHAR(50),
        upi_id VARCHAR(255),
        branch_name VARCHAR(255),
        account_type VARCHAR(50) DEFAULT 'Savings',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `);

    // 3. Seed initial host accounts matching Admin Dashboard view
    const initialHosts = [
      {
        id: 'host_deep_magare',
        full_name: 'Deep Magare',
        email: 'deepmagare0@gmail.com',
        phone: '+91 98221 14455',
        location: 'Dapoli & Vengurla',
        total_properties: 4,
        verified: true,
        status: 'active',
        bank_name: 'Kotak Mahindra Bank',
        account_number: '4812345678',
        account_holder_name: 'Deep Magare',
        ifsc_code: 'KKBK0001234'
      },
      {
        id: 'host_anand_sawant',
        full_name: 'Anand Sawant',
        email: 'anand.sawant@example.com',
        phone: '+91 98901 23456',
        location: 'Ganpatipule & Guhagar',
        total_properties: 4,
        verified: true,
        status: 'active',
        bank_name: 'HDFC Bank',
        account_number: '50100234567891',
        account_holder_name: 'Anand Sawant',
        ifsc_code: 'HDFC0000123'
      },
      {
        id: 'host_subhash_patil',
        full_name: 'Subhash Patil',
        email: 'subhash.patil@example.com',
        phone: '+91 94238 67123',
        location: 'Nagaon, Alibaug',
        total_properties: 5,
        verified: true,
        status: 'active',
        bank_name: 'State Bank of India',
        account_number: '30987654321',
        account_holder_name: 'Subhash Patil',
        ifsc_code: 'SBIN0000456'
      },
      {
        id: 'host_sanjay_kulkarni',
        full_name: 'Sanjay Kulkarni',
        email: 'sanjay.k@example.com',
        phone: '+91 91234 56789',
        location: 'Ratnagiri & Dapoli',
        total_properties: 4,
        verified: true,
        status: 'active',
        bank_name: 'ICICI Bank',
        account_number: '001205001234',
        account_holder_name: 'Sanjay Kulkarni',
        ifsc_code: 'ICIC0000011'
      },
      {
        id: 'host_kuldeep_mahajan',
        full_name: 'Kuldeep Mahajan',
        email: 'mahajankuldeep628@gmail.com',
        phone: '+91 98224 88776',
        location: 'Murud, Raigad • Fort & Ocean View',
        total_properties: 3,
        verified: true,
        status: 'active',
        bank_name: 'Bank of Baroda',
        account_number: '1234010005678',
        account_holder_name: 'Kuldeep Mahajan',
        ifsc_code: 'BARB0MURUDX'
      }
    ];

    for (const h of initialHosts) {
      await query(`
        INSERT INTO host_accounts (id, full_name, email, phone, location, total_properties, verified, status, bank_name, account_number, account_holder_name, ifsc_code, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          location = EXCLUDED.location,
          total_properties = EXCLUDED.total_properties,
          verified = EXCLUDED.verified,
          status = EXCLUDED.status,
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_holder_name = EXCLUDED.account_holder_name,
          ifsc_code = EXCLUDED.ifsc_code,
          updated_at = NOW();
      `, [h.id, h.full_name, h.email, h.phone, h.location, h.total_properties, h.verified, h.status, h.bank_name, h.account_number, h.account_holder_name, h.ifsc_code]);

      await query(`
        INSERT INTO hosts (id, full_name, email, phone, location, total_properties, verified, status, bank_name, account_number, account_holder_name, ifsc_code, updated_at)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW())
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          location = EXCLUDED.location,
          total_properties = EXCLUDED.total_properties,
          verified = EXCLUDED.verified,
          status = EXCLUDED.status,
          bank_name = EXCLUDED.bank_name,
          account_number = EXCLUDED.account_number,
          account_holder_name = EXCLUDED.account_holder_name,
          ifsc_code = EXCLUDED.ifsc_code,
          updated_at = NOW();
      `, [h.id, h.full_name, h.email, h.phone, h.location, h.total_properties, h.verified, h.status, h.bank_name, h.account_number, h.account_holder_name, h.ifsc_code]);
    }

    console.log('✓ Initial host accounts seeded successfully into host_accounts & hosts tables!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Migration failed:', error);
    process.exit(1);
  }
}

createHostAccountsTable();

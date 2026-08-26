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

const sampleBookings = [
  {
    id: 'SIK-100201',
    booking_id: 'BK-2026-001',
    user_id: 'guest_s01',
    user_email: 'amit.sharma@test.com',
    guest_email: 'amit.sharma@test.com',
    user_name: 'Amit Sharma',
    guest_name: 'Amit Sharma',
    user_phone: '+91-9988776655',
    guest_phone: '+91-9988776655',
    property_id: 'prop-deepmagare-sea-breeze',
    property_name: 'Malvan Sea Breeze Villa',
    property_title: 'Malvan Sea Breeze Villa',
    host_email: 'deepmagare0@gmail.com',
    host_name: 'Deep Magare',
    check_in: '2026-09-01',
    check_out: '2026-09-04',
    guests: '4 Guests',
    rooms: '2',
    total_amount: 7500.00,
    total_price: 7500.00,
    paid_amount: 7500.00,
    remaining_amount: 0.00,
    payment_id: 'pay_QN837482910',
    payment_status: 'completed',
    status: 'confirmed'
  },
  {
    id: 'SIK-100202',
    booking_id: 'BK-2026-002',
    user_id: 'guest_s02',
    user_email: 'priya.nair@test.com',
    guest_email: 'priya.nair@test.com',
    user_name: 'Priya Nair',
    guest_name: 'Priya Nair',
    user_phone: '+91-9765432100',
    guest_phone: '+91-9765432100',
    property_id: 'guhagar-coastal-hut',
    property_name: 'Guhagar Coastal Coconut Hut',
    property_title: 'Guhagar Coastal Coconut Hut',
    host_email: 'pradeep.patil@example.com',
    host_name: 'Pradeep Patil',
    check_in: '2026-09-10',
    check_out: '2026-09-12',
    guests: '2 Guests',
    rooms: '1',
    total_amount: 3800.00,
    total_price: 3800.00,
    paid_amount: 3800.00,
    remaining_amount: 0.00,
    payment_id: 'pay_QN991823746',
    payment_status: 'completed',
    status: 'confirmed'
  },
  {
    id: 'SIK-100203',
    booking_id: 'BK-2026-003',
    user_id: 'guest_s03',
    user_email: 'rahul.desai@test.com',
    guest_email: 'rahul.desai@test.com',
    user_name: 'Rahul Desai',
    guest_name: 'Rahul Desai',
    user_phone: '+91-9811223344',
    guest_phone: '+91-9811223344',
    property_id: 'ratnagiri-spice-farm',
    property_name: 'Ratnagiri Organic Spice Farmstay',
    property_title: 'Ratnagiri Organic Spice Farmstay',
    host_email: 'ganesh.j@example.com',
    host_name: 'Ganesh Joshi',
    check_in: '2026-09-15',
    check_out: '2026-09-18',
    guests: '3 Guests',
    rooms: '1',
    total_amount: 7200.00,
    total_price: 7200.00,
    paid_amount: 2000.00,
    remaining_amount: 5200.00,
    payment_id: 'pay_QN554192837',
    payment_status: 'partial',
    status: 'pending'
  },
  {
    id: 'SIK-100204',
    booking_id: 'BK-2026-004',
    user_id: 'guest_s04',
    user_email: 'sneha.kadam@test.com',
    guest_email: 'sneha.kadam@test.com',
    user_name: 'Sneha Kadam',
    guest_name: 'Sneha Kadam',
    user_phone: '+91-9922334455',
    guest_phone: '+91-9922334455',
    property_id: 'devgad-mango-villa',
    property_name: 'Devgad Alphonso Haven',
    property_title: 'Devgad Alphonso Haven',
    host_email: 'vinayak@devgad.com',
    host_name: 'Vinayak Devgade',
    check_in: '2026-09-20',
    check_out: '2026-09-23',
    guests: '4 Guests',
    rooms: '2',
    total_amount: 11400.00,
    total_price: 11400.00,
    paid_amount: 11400.00,
    remaining_amount: 0.00,
    payment_id: 'pay_QN778899001',
    payment_status: 'completed',
    status: 'confirmed'
  },
  {
    id: 'SIK-100205',
    booking_id: 'BK-2026-005',
    user_id: 'guest_s05',
    user_email: 'vikram.sawant@test.com',
    guest_email: 'vikram.sawant@test.com',
    user_name: 'Vikram Sawant',
    guest_name: 'Vikram Sawant',
    user_phone: '+91-9733445566',
    guest_phone: '+91-9733445566',
    property_id: 'prop-deepmagare-sea-breeze',
    property_name: 'Malvan Sea Breeze Villa',
    property_title: 'Malvan Sea Breeze Villa',
    host_email: 'deepmagare0@gmail.com',
    host_name: 'Deep Magare',
    check_in: '2026-10-01',
    check_out: '2026-10-03',
    guests: '2 Guests',
    rooms: '1',
    total_amount: 5000.00,
    total_price: 5000.00,
    paid_amount: 5000.00,
    remaining_amount: 0.00,
    payment_id: 'pay_QN112233445',
    payment_status: 'completed',
    status: 'confirmed'
  }
];

async function createAndSeedBookings() {
  try {
    console.log('🚀 Connecting to PostgreSQL database...');

    // 1. DDL: Create bookings table
    const createTableSql = `
      CREATE TABLE IF NOT EXISTS bookings (
        id VARCHAR(255) PRIMARY KEY,
        booking_id VARCHAR(255),
        user_id VARCHAR(255),
        user_email VARCHAR(255),
        guest_email VARCHAR(255),
        user_name VARCHAR(255),
        guest_name VARCHAR(255),
        user_phone VARCHAR(255),
        guest_phone VARCHAR(255),
        property_id VARCHAR(255),
        property_name VARCHAR(255),
        property_title VARCHAR(255),
        host_email VARCHAR(255),
        host_name VARCHAR(255),
        check_in VARCHAR(255),
        check_out VARCHAR(255),
        guests VARCHAR(255),
        rooms VARCHAR(100),
        total_amount NUMERIC(10, 2) DEFAULT 0,
        total_price NUMERIC(10, 2) DEFAULT 0,
        paid_amount NUMERIC(10, 2) DEFAULT 0,
        remaining_amount NUMERIC(10, 2) DEFAULT 0,
        payment_id VARCHAR(255),
        payment_status VARCHAR(100) DEFAULT 'completed',
        status VARCHAR(50) DEFAULT 'confirmed',
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    console.log('📦 Creating bookings table in database...');
    await pool.query(createTableSql);
    console.log('✅ Bookings table created successfully!');

    // 2. Indexes
    console.log('⚡ Creating indexes on bookings table...');
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_user_email ON bookings(user_email);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_host_email ON bookings(host_email);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_property_id ON bookings(property_id);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);`);
    await pool.query(`CREATE INDEX IF NOT EXISTS idx_bookings_created_at ON bookings(created_at DESC);`);
    console.log('✅ Indexes created successfully!');

    // 3. DML: Insert sample booking data
    console.log('🌱 Populating booking data inside database...');

    const insertSql = `
      INSERT INTO bookings (
        id, booking_id, user_id, user_email, guest_email, user_name, guest_name,
        user_phone, guest_phone, property_id, property_name, property_title,
        host_email, host_name, check_in, check_out, guests, rooms,
        total_amount, total_price, paid_amount, remaining_amount,
        payment_id, payment_status, status, created_at
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7,
        $8, $9, $10, $11, $12,
        $13, $14, $15, $16, $17, $18,
        $19, $20, $21, $22,
        $23, $24, $25, NOW()
      )
      ON CONFLICT (id) DO UPDATE SET
        booking_id = EXCLUDED.booking_id,
        user_email = EXCLUDED.user_email,
        user_name = EXCLUDED.user_name,
        user_phone = EXCLUDED.user_phone,
        property_id = EXCLUDED.property_id,
        property_name = EXCLUDED.property_name,
        host_email = EXCLUDED.host_email,
        host_name = EXCLUDED.host_name,
        check_in = EXCLUDED.check_in,
        check_out = EXCLUDED.check_out,
        guests = EXCLUDED.guests,
        rooms = EXCLUDED.rooms,
        total_amount = EXCLUDED.total_amount,
        total_price = EXCLUDED.total_price,
        paid_amount = EXCLUDED.paid_amount,
        remaining_amount = EXCLUDED.remaining_amount,
        payment_id = EXCLUDED.payment_id,
        payment_status = EXCLUDED.payment_status,
        status = EXCLUDED.status;
    `;

    for (const b of sampleBookings) {
      await pool.query(insertSql, [
        b.id,
        b.booking_id,
        b.user_id,
        b.user_email,
        b.guest_email,
        b.user_name,
        b.guest_name,
        b.user_phone,
        b.guest_phone,
        b.property_id,
        b.property_name,
        b.property_title,
        b.host_email,
        b.host_name,
        b.check_in,
        b.check_out,
        b.guests,
        b.rooms,
        b.total_amount,
        b.total_price,
        b.paid_amount,
        b.remaining_amount,
        b.payment_id,
        b.payment_status,
        b.status
      ]);
      console.log(`   + Inserted/Updated booking ${b.id} (${b.booking_id}) for ${b.guest_name}`);
    }

    console.log('\n🎉 SUCCESS! Bookings table created and populated in database.');

  } catch (err) {
    console.error('❌ Error creating and seeding bookings table:', err);
  } finally {
    await pool.end();
  }
}

createAndSeedBookings();

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

async function seedDemoData() {
  const client = await pool.connect();
  try {
    console.log('🚀 Starting demo data insertion into Stay In Konkan database...');

    // 1. SEED USERS
    console.log('👤 Seeding users...');
    const users = [
      { id: 'admin_01', full_name: 'Platform Administrator', email: 'admin@stayinkonkan.com', phone: '+91 98000 00000', role: 'admin', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Admin+Konkan&background=1b3823&color=fff' },
      { id: 'host_01', full_name: 'Mahesh Naik', email: 'mahesh.naik@example.com', phone: '+91 94220 18402', role: 'host', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Mahesh+Naik&background=16a34a&color=fff' },
      { id: 'host_02', full_name: 'Sanjay Kulkarni', email: 'sanjay.k@example.com', phone: '+91 98224 45910', role: 'host', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Sanjay+Kulkarni&background=0ea5e9&color=fff' },
      { id: 'host_03', full_name: 'Subhash Patil', email: 'subhash.patil@example.com', phone: '+91 94238 67123', role: 'host', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Subhash+Patil&background=2563eb&color=fff' },
      { id: 'host_04', full_name: 'Anand Sawant', email: 'anand.sawant@example.com', phone: '+91 98901 23456', role: 'host', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Anand+Sawant&background=d97706&color=fff' },
      { id: 'host_05', full_name: 'Deep Magare', email: 'deepmagare0@gmail.com', phone: '+91 98221 14455', role: 'host', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Deep+Magare&background=7c3aed&color=fff' },
      { id: 'guest_01', full_name: 'Amit Sharma', email: 'amit.sharma@test.com', phone: '+91 99887 76655', role: 'guest', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Amit+Sharma&background=f59e0b&color=fff' },
      { id: 'guest_02', full_name: 'Priya Nair', email: 'priya.nair@test.com', phone: '+91 97654 32100', role: 'guest', provider: 'google', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Priya+Nair&background=8b5cf6&color=fff' },
      { id: 'guest_03', full_name: 'Rahul Desai', email: 'rahul.desai@test.com', phone: '+91 98190 54321', role: 'guest', provider: 'email', verified: true, avatar_url: 'https://ui-avatars.com/api/?name=Rahul+Desai&background=ec4899&color=fff' }
    ];

    for (const u of users) {
      await client.query(`
        INSERT INTO users (id, full_name, email, phone, role, provider, verified, avatar_url)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          role = EXCLUDED.role,
          verified = EXCLUDED.verified;
      `, [u.id, u.full_name, u.email, u.phone, u.role, u.provider, u.verified, u.avatar_url]);
    }
    console.log(`   ✓ ${users.length} users seeded.`);

    // 2. SEED HOSTS
    console.log('🏡 Seeding hosts...');
    const hosts = [
      { id: 'host_01', full_name: 'Mahesh Naik', email: 'mahesh.naik@example.com', phone: '+91 94220 18402', location: 'Tarkarli, Malvan', total_properties: 2, verified: true, status: 'active', bank_name: 'State Bank of India', account_number: '30492817263', account_holder_name: 'Mahesh Naik', ifsc_code: 'SBIN0001234' },
      { id: 'host_02', full_name: 'Sanjay Kulkarni', email: 'sanjay.k@example.com', phone: '+91 98224 45910', location: 'Ratnagiri', total_properties: 1, verified: true, status: 'active', bank_name: 'Bank of Maharashtra', account_number: '60129384756', account_holder_name: 'Sanjay Kulkarni', ifsc_code: 'MAHB0000456' },
      { id: 'host_03', full_name: 'Subhash Patil', email: 'subhash.patil@example.com', phone: '+91 94238 67123', location: 'Nagaon, Alibaug', total_properties: 1, verified: true, status: 'active', bank_name: 'HDFC Bank', account_number: '50100234567891', account_holder_name: 'Subhash Patil', ifsc_code: 'HDFC0001789' },
      { id: 'host_04', full_name: 'Anand Sawant', email: 'anand.sawant@example.com', phone: '+91 98901 23456', location: 'Ganpatipule & Guhagar', total_properties: 2, verified: true, status: 'active', bank_name: 'ICICI Bank', account_number: '001101567890', account_holder_name: 'Anand Sawant', ifsc_code: 'ICIC0000011' },
      { id: 'host_05', full_name: 'Deep Magare', email: 'deepmagare0@gmail.com', phone: '+91 98221 14455', location: 'Dapoli & Vengurla', total_properties: 2, verified: true, status: 'active', bank_name: 'Kotak Mahindra Bank', account_number: '4812345678', account_holder_name: 'Deep Magare', ifsc_code: 'KKBK0001234' }
    ];

    for (const h of hosts) {
      await client.query(`
        INSERT INTO hosts (id, full_name, email, phone, location, total_properties, verified, status, bank_name, account_number, account_holder_name, ifsc_code)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (email) DO UPDATE SET
          full_name = EXCLUDED.full_name,
          phone = EXCLUDED.phone,
          location = EXCLUDED.location,
          total_properties = EXCLUDED.total_properties,
          verified = EXCLUDED.verified;
      `, [h.id, h.full_name, h.email, h.phone, h.location, h.total_properties, h.verified, h.status, h.bank_name, h.account_number, h.account_holder_name, h.ifsc_code]);
    }
    console.log(`   ✓ ${hosts.length} hosts seeded.`);

    // 3. SEED PROPERTIES
    console.log('🏖️ Seeding properties...');
    const properties = [
      {
        id: 'prop_01',
        title: 'Tarkarli Samudra Sparsh Beach Villa',
        description: 'Seaside beach villa situated directly on Tarkarli white sands. Features private coconut palm shade, authentic Malvani fish thalis, and scuba diving package assistance.',
        location: 'Tarkarli Beach, Malvan, Sindhudurg',
        type: 'villa',
        price_per_night: 3500.00,
        rating: 4.90,
        reviews_count: 84,
        image_url: '/assets/images/home/malvan_river_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Air Conditioning', 'Free High-Speed Wi-Fi', 'Attached Bathroom', 'Hot Water', 'Malvani Meals', 'Sea View Balcony', 'Scuba Diving Desk']),
        host_name: 'Mahesh Naik',
        host_email: 'mahesh.naik@example.com',
        host_phone: '+91 94220 18402',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/malvan_river_hd.png',
        facility2_image: '/assets/images/home/konkan_pristine_cove.png',
        facility3_image: '/assets/images/properties/konkan_village_home.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Beachfront King Suite', price: 3500, capacity: 2, beds: '1 King Bed' },
          { id: 'rm_2', name: 'Family Coconut Grove Room', price: 4200, capacity: 4, beds: '2 Queen Beds' }
        ])
      },
      {
        id: 'prop_02',
        title: 'Ratnagiri Mango Shadow Heritage Wada',
        description: 'A 90-year-old restored traditional Konkan Laterite stone wada inside a 10-acre Alphonso mango orchard. Includes homemade Ukadiche Modak and Solkadhi.',
        location: 'Ratnagiri, Maharashtra',
        type: 'heritage',
        price_per_night: 2800.00,
        rating: 4.80,
        reviews_count: 62,
        image_url: '/assets/images/properties/konkan_laterite_house.png',
        status: 'live',
        amenities: JSON.stringify(['Heritage Courtyard', 'Alphonso Mango Tour', 'Home Vegetarian Meals', 'Solar Hot Water', 'Free Parking']),
        host_name: 'Sanjay Kulkarni',
        host_email: 'sanjay.k@example.com',
        host_phone: '+91 98224 45910',
        host_languages: 'Marathi, Hindi & English',
        facility1_image: '/assets/images/properties/konkan_laterite_house.png',
        facility2_image: '/assets/images/home/ratnagiri_hd.png',
        facility3_image: '/assets/images/home/konkan_authentic_thali.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Ancestral Wada Suite', price: 2800, capacity: 3, beds: '1 King Bed + 1 Single' }
        ])
      },
      {
        id: 'prop_03',
        title: 'Nagaon Coconut Grove Cottage',
        description: 'Lush green farmstay nestled in betel nut and coconut plantations 300 meters from Nagaon water sports beach.',
        location: 'Nagaon, Alibaug, Raigad',
        type: 'cottage',
        price_per_night: 3200.00,
        rating: 4.70,
        reviews_count: 45,
        image_url: '/assets/images/home/alibaug_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Private Coconut Garden', 'BBQ Grill Setup', 'Free Wi-Fi', 'Air Conditioning', 'Pet Friendly', '24/7 Power Backup']),
        host_name: 'Subhash Patil',
        host_email: 'subhash.patil@example.com',
        host_phone: '+91 94238 67123',
        host_languages: 'Marathi, Hindi & English',
        facility1_image: '/assets/images/home/alibaug_hd.png',
        facility2_image: '/assets/images/properties/konkan_village_home.png',
        facility3_image: '/assets/images/home/konkan_eco_kayaking.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Garden Cottage Deluxe', price: 3200, capacity: 4, beds: '2 Queen Beds' }
        ])
      },
      {
        id: 'prop_04',
        title: 'Ganpatipule Sea Cliff Resort & Spa',
        description: 'Cliffside resort overlooking the Arabian Sea near Ganpatipule Temple. Features an infinity pool, private beach path, and ayurvedic spa therapies.',
        location: 'Ganpatipule, Ratnagiri',
        type: 'resort',
        price_per_night: 5500.00,
        rating: 4.90,
        reviews_count: 110,
        image_url: '/assets/images/home/konkan_hero_banner.png',
        status: 'live',
        amenities: JSON.stringify(['Infinity Pool', 'Ayurvedic Spa', 'Beach Pathway', 'Restaurant', 'Free Wi-Fi', 'Temple Shuttle']),
        host_name: 'Anand Sawant',
        host_email: 'anand.sawant@example.com',
        host_phone: '+91 98901 23456',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/konkan_hero_banner.png',
        facility2_image: '/assets/images/home/ratnagiri_hd.png',
        facility3_image: '/assets/images/home/konkan_heritage_homestay.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Sea View Panoramic Suite', price: 5500, capacity: 2, beds: '1 King Bed' },
          { id: 'rm_2', name: 'Cliff Villa with Jacuzzi', price: 7200, capacity: 2, beds: '1 King Bed' }
        ])
      },
      {
        id: 'prop_05',
        title: 'Kashid White Sand Hilltop Villa',
        description: 'Exclusive private villa situated on a breezy hillside above Kashid Beach with 180-degree ocean views and a private plunge pool.',
        location: 'Kashid Beach, Raigad',
        type: 'villa',
        price_per_night: 6200.00,
        rating: 4.90,
        reviews_count: 53,
        image_url: '/assets/images/home/konkan_pristine_cove.png',
        status: 'live',
        amenities: JSON.stringify(['Private Plunge Pool', 'Panoramic Sea View', 'Private Chef', 'Air Conditioning', 'High-Speed Wi-Fi']),
        host_name: 'Shantaram Joshi',
        host_email: 'shantaram.joshi@stayinkonkan.com',
        host_phone: '+91 91582 89012',
        host_languages: 'Marathi, Hindi & English',
        facility1_image: '/assets/images/home/konkan_pristine_cove.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/properties/konkan_laterite_house.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Hilltop Master Villa', price: 6200, capacity: 6, beds: '3 King Beds' }
        ])
      },
      {
        id: 'prop_06',
        title: 'Dapoli Ladghar Breeze Cottage',
        description: 'Charming seaside wooden cottages right in front of Ladghar Tamas Teertha beach. Watch dolphins from your private porch.',
        location: 'Ladghar Beach, Dapoli, Ratnagiri',
        type: 'cottage',
        price_per_night: 2900.00,
        rating: 4.80,
        reviews_count: 73,
        image_url: '/assets/images/home/guhagar_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Dolphin Watching Desk', 'Beachfront Balcony', 'Malvani Seafood', 'Free Breakfast', 'Bonfire Setup']),
        host_name: 'Deep Magare',
        host_email: 'deepmagare0@gmail.com',
        host_phone: '+91 98221 14455',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/guhagar_hd.png',
        facility2_image: '/assets/images/properties/konkan_village_home.png',
        facility3_image: '/assets/images/home/konkan_welcoming_host.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Dolphin View Wooden Cottage', price: 2900, capacity: 3, beds: '1 Queen Bed + 1 Single' }
        ])
      },
      {
        id: 'prop_07',
        title: 'Devgad Alphonso Orchard Homestay',
        description: 'Stay in the heart of Devgad mango country. Wake up to bird calls, enjoy orchard walking tours, and savor fresh coastal fare.',
        location: 'Devgad, Sindhudurg',
        type: 'homestay',
        price_per_night: 2600.00,
        rating: 4.85,
        reviews_count: 39,
        image_url: '/assets/images/properties/konkan_village_home.png',
        status: 'live',
        amenities: JSON.stringify(['Mango Orchard Tour', 'Farm Fresh Meals', 'Star Gazing Deck', 'Solar Hot Water', 'Pet Friendly']),
        host_name: 'Kuldeep Mahajan',
        host_email: 'mahajankuldeep628@gmail.com',
        host_phone: '+91 98224 78901',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/properties/konkan_village_home.png',
        facility2_image: '/assets/images/properties/konkan_laterite_house.png',
        facility3_image: '/assets/images/home/konkan_authentic_thali.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Orchard Breeze Room', price: 2600, capacity: 2, beds: '1 Queen Bed' }
        ])
      },
      {
        id: 'prop_08',
        title: 'Guhagar Beachside Eco Resort',
        description: 'Eco-conscious beach resort surrounded by virgin coconut plantations and a 5km tranquil white sand beach.',
        location: 'Guhagar, Ratnagiri',
        type: 'resort',
        price_per_night: 3400.00,
        rating: 4.80,
        reviews_count: 51,
        image_url: '/assets/images/home/guhagar_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Direct Beach Access', 'Eco-friendly Architecture', 'Vegetarian Dining', 'Yoga Pavilion', 'Wi-Fi']),
        host_name: 'Anand Sawant',
        host_email: 'anand.sawant@example.com',
        host_phone: '+91 98901 23456',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/guhagar_hd.png',
        facility2_image: '/assets/images/home/konkan_pristine_cove.png',
        facility3_image: '/assets/images/properties/konkan_laterite_house.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Eco Bamboo Cottage', price: 3400, capacity: 2, beds: '1 King Bed' }
        ])
      },
      {
        id: 'prop_09',
        title: 'Murud Janjira Sea View House',
        description: 'Overlooking the historic Murud Janjira sea fort, this cozy home features rooftop sunset views and fresh seafood meals.',
        location: 'Murud, Raigad',
        type: 'homestay',
        price_per_night: 3100.00,
        rating: 4.75,
        reviews_count: 28,
        image_url: '/assets/images/home/sindhudurg_heritage_house.png',
        status: 'live',
        amenities: JSON.stringify(['Fort Sea View', 'Rooftop Lounge', 'Boat Tour Assistance', 'Air Conditioning', 'Free Parking']),
        host_name: 'Kuldeep Mahajan',
        host_email: 'mahajankuldeep628@gmail.com',
        host_phone: '+91 98224 78901',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/sindhudurg_heritage_house.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/home/konkan_welcoming_host.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Janjira View Room', price: 3100, capacity: 3, beds: '1 King Bed + 1 Mattress' }
        ])
      },
      {
        id: 'prop_10',
        title: 'Vengurla Bhogwe Paradise Villa',
        description: 'Tucked between Bhogwe beach and Karli river estuary. A slice of untouched coastal heaven with dolphin spotting tours.',
        location: 'Bhogwe Beach, Vengurla, Sindhudurg',
        type: 'villa',
        price_per_night: 4800.00,
        rating: 4.90,
        reviews_count: 65,
        image_url: '/assets/images/home/malvan_river_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Private Lagoon Access', 'Estuary Boat Tour', 'Luxury Veranda', 'Malvani Feast', 'Wi-Fi']),
        host_name: 'Deep Magare',
        host_email: 'deepmagare0@gmail.com',
        host_phone: '+91 98221 14455',
        host_languages: 'Marathi, Malvani, Hindi & English',
        facility1_image: '/assets/images/home/malvan_river_hd.png',
        facility2_image: '/assets/images/home/konkan_pristine_cove.png',
        facility3_image: '/assets/images/home/konkan_hero_banner.png',
        rooms: JSON.stringify([
          { id: 'rm_1', name: 'Estuary Sea Villa Suite', price: 4800, capacity: 4, beds: '2 Queen Beds' }
        ])
      }
    ];

    for (const p of properties) {
      await client.query(`
        INSERT INTO properties (
          id, title, description, location, type, price_per_night, rating, reviews_count,
          image_url, status, amenities, host_name, host_email, host_phone, host_languages,
          facility1_image, facility2_image, facility3_image, rooms
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19)
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          price_per_night = EXCLUDED.price_per_night,
          rating = EXCLUDED.rating,
          reviews_count = EXCLUDED.reviews_count,
          image_url = EXCLUDED.image_url,
          status = EXCLUDED.status,
          amenities = EXCLUDED.amenities,
          host_name = EXCLUDED.host_name,
          host_email = EXCLUDED.host_email,
          host_phone = EXCLUDED.host_phone,
          rooms = EXCLUDED.rooms;
      `, [
        p.id, p.title, p.description, p.location, p.type, p.price_per_night, p.rating, p.reviews_count,
        p.image_url, p.status, p.amenities, p.host_name, p.host_email, p.host_phone, p.host_languages,
        p.facility1_image, p.facility2_image, p.facility3_image, p.rooms
      ]);
    }
    console.log(`   ✓ ${properties.length} properties seeded.`);

    // 4. SEED BOOKINGS
    console.log('📅 Seeding bookings...');
    const bookings = [
      {
        id: 'BK-2026-001',
        booking_id: 'BK-2026-001',
        user_id: 'guest_01',
        user_email: 'amit.sharma@test.com',
        guest_email: 'amit.sharma@test.com',
        user_name: 'Amit Sharma',
        guest_name: 'Amit Sharma',
        user_phone: '+91 99887 76655',
        guest_phone: '+91 99887 76655',
        property_id: 'prop_01',
        property_name: 'Tarkarli Samudra Sparsh Beach Villa',
        property_title: 'Tarkarli Samudra Sparsh Beach Villa',
        host_email: 'mahesh.naik@example.com',
        host_name: 'Mahesh Naik',
        check_in: '2026-09-10',
        check_out: '2026-09-13',
        guests: '2',
        rooms: '1',
        total_amount: 10500.00,
        total_price: 10500.00,
        paid_amount: 2100.00,
        remaining_amount: 8400.00,
        payment_id: 'pay_sik_001_demo',
        payment_status: 'completed',
        status: 'confirmed'
      },
      {
        id: 'BK-2026-002',
        booking_id: 'BK-2026-002',
        user_id: 'guest_02',
        user_email: 'priya.nair@test.com',
        guest_email: 'priya.nair@test.com',
        user_name: 'Priya Nair',
        guest_name: 'Priya Nair',
        user_phone: '+91 97654 32100',
        guest_phone: '+91 97654 32100',
        property_id: 'prop_02',
        property_name: 'Ratnagiri Mango Shadow Heritage Wada',
        property_title: 'Ratnagiri Mango Shadow Heritage Wada',
        host_email: 'sanjay.k@example.com',
        host_name: 'Sanjay Kulkarni',
        check_in: '2026-09-15',
        check_out: '2026-09-18',
        guests: '3',
        rooms: '1',
        total_amount: 8400.00,
        total_price: 8400.00,
        paid_amount: 8400.00,
        remaining_amount: 0.00,
        payment_id: 'pay_sik_002_demo',
        payment_status: 'completed',
        status: 'confirmed'
      },
      {
        id: 'BK-2026-003',
        booking_id: 'BK-2026-003',
        user_id: 'guest_03',
        user_email: 'rahul.desai@test.com',
        guest_email: 'rahul.desai@test.com',
        user_name: 'Rahul Desai',
        guest_name: 'Rahul Desai',
        user_phone: '+91 98190 54321',
        guest_phone: '+91 98190 54321',
        property_id: 'prop_04',
        property_name: 'Ganpatipule Sea Cliff Resort & Spa',
        property_title: 'Ganpatipule Sea Cliff Resort & Spa',
        host_email: 'anand.sawant@example.com',
        host_name: 'Anand Sawant',
        check_in: '2026-09-22',
        check_out: '2026-09-24',
        guests: '2',
        rooms: '1',
        total_amount: 11000.00,
        total_price: 11000.00,
        paid_amount: 2200.00,
        remaining_amount: 8800.00,
        payment_id: 'pay_sik_003_demo',
        payment_status: 'completed',
        status: 'confirmed'
      }
    ];

    for (const b of bookings) {
      await client.query(`
        INSERT INTO bookings (
          id, booking_id, user_id, user_email, guest_email, user_name, guest_name,
          user_phone, guest_phone, property_id, property_name, property_title,
          host_email, host_name, check_in, check_out, guests, rooms,
          total_amount, total_price, paid_amount, remaining_amount,
          payment_id, payment_status, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24, $25)
        ON CONFLICT (id) DO UPDATE SET
          status = EXCLUDED.status,
          paid_amount = EXCLUDED.paid_amount,
          remaining_amount = EXCLUDED.remaining_amount;
      `, [
        b.id, b.booking_id, b.user_id, b.user_email, b.guest_email, b.user_name, b.guest_name,
        b.user_phone, b.guest_phone, b.property_id, b.property_name, b.property_title,
        b.host_email, b.host_name, b.check_in, b.check_out, b.guests, b.rooms,
        b.total_amount, b.total_price, b.paid_amount, b.remaining_amount,
        b.payment_id, b.payment_status, b.status
      ]);
    }
    console.log(`   ✓ ${bookings.length} bookings seeded.`);

    // 5. SEED COUPONS
    console.log('🏷️ Seeding coupons...');
    const coupons = [
      { id: 'CPN-KONKAN20', code: 'KONKAN20', discount_type: 'percentage', discount_value: 20, min_booking: 2000, apply_to: 'All Products', max_uses: 100, times_used: 12, active: true, is_private: false, expiry: '2026-12-31' },
      { id: 'CPN-MONSOON500', code: 'MONSOON500', discount_type: 'flat', discount_value: 500, min_booking: 3000, apply_to: 'Beachfront Stays', max_uses: 50, times_used: 6, active: true, is_private: false, expiry: '2026-10-31' },
      { id: 'CPN-WELCOME10', code: 'WELCOME10', discount_type: 'percentage', discount_value: 10, min_booking: 1500, apply_to: 'All Products', max_uses: 200, times_used: 28, active: true, is_private: false, expiry: '2026-12-31' }
    ];

    for (const c of coupons) {
      await client.query(`
        INSERT INTO coupons (id, code, discount_type, discount_value, min_booking, apply_to, max_uses, times_used, active, is_private, expiry)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO UPDATE SET
          discount_value = EXCLUDED.discount_value,
          active = EXCLUDED.active;
      `, [c.id, c.code, c.discount_type, c.discount_value, c.min_booking, c.apply_to, c.max_uses, c.times_used, c.active, c.is_private, c.expiry]);
    }
    console.log(`   ✓ ${coupons.length} coupons seeded.`);

    // 6. SEED REVIEWS
    console.log('⭐ Seeding reviews...');
    const reviews = [
      { id: 'REV-001', property_id: 'prop_01', guest_name: 'Amit Sharma', user_email: 'amit.sharma@test.com', rating: 5.0, comment: 'Phenomenal beachfront stay! Waking up to the sea waves and eating hot Surmai thali cooked by Mahesh was a dream.' },
      { id: 'REV-002', property_id: 'prop_02', guest_name: 'Priya Nair', user_email: 'priya.nair@test.com', rating: 5.0, comment: 'Magical heritage wada experience. Fresh mangoes and Modak were so delicious. Super hospitable hosts!' },
      { id: 'REV-003', property_id: 'prop_04', guest_name: 'Rahul Desai', user_email: 'rahul.desai@test.com', rating: 4.8, comment: 'Breathtaking cliffside ocean views from the infinity pool. Very peaceful and close to Ganpatipule mandir.' }
    ];

    for (const r of reviews) {
      await client.query(`
        INSERT INTO reviews (id, property_id, guest_name, user_email, rating, comment)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [r.id, r.property_id, r.guest_name, r.user_email, r.rating, r.comment]);
    }
    console.log(`   ✓ ${reviews.length} reviews seeded.`);

    // 7. SEED HELP DESK
    console.log('🎫 Seeding help desk tickets...');
    const helpDeskIssues = [
      {
        id: 'HD-001',
        issue_id: 'TK-20260901-8A7B',
        title: 'Query regarding late check-in at Tarkarli Villa',
        description: 'Guest arriving via late train at Kudal station at 10 PM. Requesting host contact and check-in guidance.',
        category: 'Booking Query',
        user_name: 'Amit Sharma',
        user_email: 'amit.sharma@test.com',
        user_phone: '+91 99887 76655',
        priority: 'Medium',
        status: 'Open',
        admin_notes: 'Host Mahesh Naik notified. Late check-in confirmed.'
      },
      {
        id: 'HD-002',
        issue_id: 'TK-20260902-4F2A',
        title: 'GST Invoice Download Assistance',
        description: 'Need company GST invoice for corporate offsite reservation in Ganpatipule.',
        category: 'Payment Issue',
        user_name: 'Rahul Desai',
        user_email: 'rahul.desai@test.com',
        user_phone: '+91 98190 54321',
        priority: 'Low',
        status: 'In Progress',
        admin_notes: 'Finance team generating GST breakdown PDF.'
      }
    ];

    for (const hd of helpDeskIssues) {
      await client.query(`
        INSERT INTO help_desk (id, issue_id, title, description, category, user_name, user_email, user_phone, priority, status, admin_notes)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        ON CONFLICT (id) DO NOTHING;
      `, [hd.id, hd.issue_id, hd.title, hd.description, hd.category, hd.user_name, hd.user_email, hd.user_phone, hd.priority, hd.status, hd.admin_notes]);
    }
    console.log(`   ✓ ${helpDeskIssues.length} help desk tickets seeded.`);

    // 8. SEED NEWSLETTER SUBSCRIBERS
    console.log('📧 Seeding newsletter subscribers...');
    const subscribers = [
      { id: 'nl_01', email: 'traveler.konkan@gmail.com' },
      { id: 'nl_02', email: 'wanderlust.maharashtra@gmail.com' },
      { id: 'nl_03', email: 'coastal.stays.fan@outlook.com' }
    ];

    for (const s of subscribers) {
      await client.query(`
        INSERT INTO newsletter_subscribers (id, email)
        VALUES ($1, $2)
        ON CONFLICT (email) DO NOTHING;
      `, [s.id, s.email]);
    }
    console.log(`   ✓ ${subscribers.length} newsletter subscribers seeded.`);

    // 9. SEED HOST APPLICATIONS
    console.log('📝 Seeding host applications...');
    const applications = [
      {
        id: 'APP-001',
        application_id: 'HOST-APP-2026-01',
        applicant_name: 'Ganesh Joshi',
        applicant_email: 'ganesh.joshi@example.com',
        phone: '+91 98220 54321',
        location: 'Dapoli, Ratnagiri',
        property_type: 'Homestay',
        description: 'Authentic 4-bedroom traditional laterite home with betel nut garden.',
        custom_property_name: 'Dapoli Betel Nut Orchard Homestay',
        status: 'pending'
      }
    ];

    for (const a of applications) {
      await client.query(`
        INSERT INTO host_applications (id, application_id, applicant_name, applicant_email, phone, location, property_type, description, custom_property_name, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        ON CONFLICT (id) DO NOTHING;
      `, [a.id, a.application_id, a.applicant_name, a.applicant_email, a.phone, a.location, a.property_type, a.description, a.custom_property_name, a.status]);
    }
    console.log(`   ✓ ${applications.length} host applications seeded.`);

    // 10. SEED WISHLISTS
    console.log('❤️ Seeding wishlists...');
    const wishlists = [
      { id: 'WISH-001', user_email: 'amit.sharma@test.com', user_name: 'Amit Sharma', property_id: 'prop_04', property_title: 'Ganpatipule Sea Cliff Resort & Spa', property_image: '/assets/images/home/konkan_hero_banner.png', property_location: 'Ganpatipule, Ratnagiri', property_price: '5500' }
    ];

    for (const w of wishlists) {
      await client.query(`
        INSERT INTO wishlists (id, user_email, user_name, property_id, property_title, property_image, property_location, property_price)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (id) DO NOTHING;
      `, [w.id, w.user_email, w.user_name, w.property_id, w.property_title, w.property_image, w.property_location, w.property_price]);
    }
    console.log(`   ✓ ${wishlists.length} wishlists seeded.`);

    // 11. SEED BANK DETAILS
    console.log('🏦 Seeding bank details...');
    const banks = [
      { id: 'BANK-001', user_email: 'mahesh.naik@example.com', account_holder_name: 'Mahesh Naik', user_type: 'host', bank_name: 'State Bank of India', account_number: '30492817263', ifsc_code: 'SBIN0001234', upi_id: 'maheshnaik@sbi', branch_name: 'Malvan Main Branch', account_type: 'savings', is_primary: true, verified_status: 'verified' },
      { id: 'BANK-002', user_email: 'sanjay.k@example.com', account_holder_name: 'Sanjay Kulkarni', user_type: 'host', bank_name: 'Bank of Maharashtra', account_number: '60129384756', ifsc_code: 'MAHB0000456', upi_id: 'sanjayk@mahb', branch_name: 'Ratnagiri Bazar Branch', account_type: 'savings', is_primary: true, verified_status: 'verified' }
    ];

    for (const b of banks) {
      await client.query(`
        INSERT INTO bank_details (id, user_email, account_holder_name, user_type, bank_name, account_number, ifsc_code, upi_id, branch_name, account_type, is_primary, verified_status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        ON CONFLICT (id) DO NOTHING;
      `, [b.id, b.user_email, b.account_holder_name, b.user_type, b.bank_name, b.account_number, b.ifsc_code, b.upi_id, b.branch_name, b.account_type, b.is_primary, b.verified_status]);
    }
    console.log(`   ✓ ${banks.length} bank accounts seeded.`);

    // 12. SEED CANCELLATIONS
    console.log('🔄 Seeding cancellations...');
    const cancellations = [
      {
        id: 'CANCEL-001',
        booking_id: 'BK-2026-001',
        user_email: 'amit.sharma@test.com',
        user_name: 'Amit Sharma',
        property_name: 'Tarkarli Samudra Sparsh Beach Villa',
        check_in: '2026-09-10',
        check_out: '2026-09-13',
        paid_amount: 2100.00,
        refund_amount: 1680.00,
        refund_percentage: 80,
        notice_days: 10,
        cancellation_reason: 'Rescheduling trip dates due to urgent office work',
        status: 'requested',
        refund_status: 'pending'
      }
    ];

    for (const can of cancellations) {
      await client.query(`
        INSERT INTO cancellations (
          id, booking_id, user_email, user_name, property_name, check_in, check_out,
          paid_amount, refund_amount, refund_percentage, notice_days, cancellation_reason,
          status, refund_status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
        ON CONFLICT (id) DO NOTHING;
      `, [
        can.id, can.booking_id, can.user_email, can.user_name, can.property_name,
        can.check_in, can.check_out, can.paid_amount, can.refund_amount,
        can.refund_percentage, can.notice_days, can.cancellation_reason,
        can.status, can.refund_status
      ]);
    }
    console.log(`   ✓ ${cancellations.length} cancellations seeded.`);

    // 13. SEED CONTACT MESSAGES
    console.log('💬 Seeding contact messages...');
    const messages = [
      {
        id: 'MSG-001',
        name: 'Tanvi Chitnis',
        email: 'tanvi.c@gmail.com',
        phone: '+91 98330 98765',
        subject: 'Bulk booking inquiry for family reunion',
        message: 'Hello, we are planning a family gathering in Malvan for 15 guests in November. Can you assist with reserving an entire villa and catering authentic Malvani food?',
        unread: true
      }
    ];

    for (const m of messages) {
      await client.query(`
        INSERT INTO contact_messages (id, name, email, phone, subject, message, unread)
        VALUES ($1, $2, $3, $4, $5, $6, $7)
        ON CONFLICT (id) DO NOTHING;
      `, [m.id, m.name, m.email, m.phone, m.subject, m.message, m.unread]);
    }
    console.log(`   ✓ ${messages.length} contact messages seeded.`);

    // 14. SEED SUBADMINS
    console.log('🛡️ Seeding subadmins...');
    const subadmins = [
      {
        id: 'SUBADMIN-001',
        full_name: 'Vikram Patil',
        email: 'subadmin@stayinkonkan.com',
        phone: '+91 98200 11223',
        role: 'subadmin',
        permissions: 'Property & Booking Management'
      }
    ];

    for (const sa of subadmins) {
      await client.query(`
        INSERT INTO subadmins (id, full_name, email, phone, role, permissions)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (id) DO NOTHING;
      `, [sa.id, sa.full_name, sa.email, sa.phone, sa.role, sa.permissions]);
    }
    console.log(`   ✓ ${subadmins.length} subadmins seeded.`);

    console.log('\n=====================================================');
    console.log('🎉 DEMO DATA SEEDED SUCCESSFULLY ACROSS ALL TABLES!');
    console.log('=====================================================');

  } catch (err) {
    console.error('❌ Error during demo data seeding:', err);
  } finally {
    client.release();
    await pool.end();
  }
}

seedDemoData();

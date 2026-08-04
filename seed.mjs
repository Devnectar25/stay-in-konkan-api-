// ============================================================
// seed.mjs — Stay In Konkan: Testing Data Seeder
// Uses Supabase REST API (service role key) → no DB password needed
// Run: node seed.mjs
// ============================================================

const SUPABASE_URL = 'https://twogullikwakapmsyrvw.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2d1bGxpa3dha2FwbXN5cnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0NjQ1OSwiZXhwIjoyMTAwMTIyNDU5fQ.XEzd5sP5iyLA0KboDxWKNd5otU4epO5BrLK4oLR4mPk';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'resolution=merge-duplicates,return=representation'
};

// Headers variant that ignores duplicates without updating
const headersIgnoreDup = {
  ...headers,
  'Prefer': 'resolution=ignore-duplicates,return=representation'
};

async function upsert(table, rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
    method: 'POST',
    headers,
    body: JSON.stringify(rows)
  });
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { data = text; }
  if (!res.ok) {
    console.error(`❌ [${table}] HTTP ${res.status}:`, JSON.stringify(data, null, 2));
  } else {
    const count = Array.isArray(data) ? data.length : 1;
    console.log(`✅ [${table}] Inserted/updated ${count} row(s)`);
  }
  return data;
}

// ── 1. USERS ─────────────────────────────────────────────────
// Actual columns: id, full_name, email, avatar_url, phone, role, provider, verified, created_at, updated_at, password_hash
// Allowed roles observed: 'guest', 'admin', 'host' (check constraint rejects 'owner')
const users = [
  {
    id: 'host_01',
    full_name: 'Rajesh Patil',
    email: 'rajesh.patil@test.com',
    phone: '+91-9876543210',
    role: 'host',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Rajesh+Patil&background=16a34a&color=fff'
  },
  {
    id: 'host_02',
    full_name: 'Sunita Sawant',
    email: 'sunita.sawant@test.com',
    phone: '+91-9123456789',
    role: 'host',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Sunita+Sawant&background=0ea5e9&color=fff'
  },
  {
    id: 'guest_s01',
    full_name: 'Amit Sharma',
    email: 'amit.sharma@test.com',
    phone: '+91-9988776655',
    role: 'guest',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Amit+Sharma&background=f59e0b&color=fff'
  },
  {
    id: 'guest_s02',
    full_name: 'Priya Nair',
    email: 'priya.nair@test.com',
    phone: '+91-9765432100',
    role: 'guest',
    provider: 'google',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Priya+Nair&background=8b5cf6&color=fff'
  },
  {
    id: 'guest_s03',
    full_name: 'Rahul Desai',
    email: 'rahul.desai@test.com',
    phone: '+91-9654321098',
    role: 'guest',
    provider: 'email',
    verified: false,
    avatar_url: 'https://ui-avatars.com/api/?name=Rahul+Desai&background=ef4444&color=fff'
  }
];

// ── 2. PROPERTIES ─────────────────────────────────────────────
// Actual columns: id, name, title, host, host_email, host_phone, location, price,
//                 type, status, image, image_url, facility1_image, facility2_image,
//                 facility3_image, rooms, description, rating, reviews_count, is_featured
const properties = [
  {
    id: 'shree-ganesh',
    name: 'Shree Ganesh Homestay',
    title: 'Shree Ganesh Homestay',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Ratnagiri, Konkan',
    price: '2500',
    type: 'homestay',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
    image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
    rooms: 4,
    description: 'A serene traditional homestay nestled in the lush hills of Konkan, offering panoramic views of coconut groves and the Western Ghats. Enjoy home-cooked Malvani cuisine and warm Konkani hospitality.',
    rating: 4.8,
    reviews_count: 47,
    is_featured: true
  },
  {
    id: 'mango-farmstay',
    name: 'Mango Farmstay Devgad',
    title: 'Mango Farmstay Devgad',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Devgad, Sindhudurg',
    price: '3200',
    type: 'farmstay',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    rooms: 5,
    description: 'Experience the magic of Konkan mango season on this working alphonso mango farm. Wake up to birdsong, go on guided farm walks, and savour freshly picked mangoes. Perfect for families and nature lovers.',
    rating: 4.9,
    reviews_count: 63,
    is_featured: true
  },
  {
    id: 'sindhudurg-heritage',
    name: 'Sindhudurg Heritage Wada',
    title: 'Sindhudurg Heritage Wada',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Malvan, Sindhudurg',
    price: '4500',
    type: 'heritage',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    image: 'https://images.unsplash.com/photo-1580587771525-78b9dba3b914?w=800',
    rooms: 6,
    description: 'Stay in an authentic 200-year-old Konkan wada (ancestral home) lovingly restored with modern comforts. Stone flooring, wooden beams, and a central courtyard create an unforgettable heritage experience.',
    rating: 4.7,
    reviews_count: 29,
    is_featured: true
  },
  {
    id: 'tarkarli-beach-villa',
    name: 'Tarkarli Beach Villa',
    title: 'Tarkarli Beach Villa',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Tarkarli, Sindhudurg',
    price: '6800',
    type: 'villa',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
    image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
    rooms: 8,
    description: 'Wake up to the sound of waves at this stunning beachfront villa in Tarkarli, home to the clearest waters on the Konkan coast. Direct beach access, snorkelling equipment, and private BBQ setup included.',
    rating: 4.9,
    reviews_count: 82,
    is_featured: true
  },
  {
    id: 'prop-deepmagare-sea-breeze',
    name: 'Sea Breeze Cottage Ganpatipule',
    title: 'Sea Breeze Cottage Ganpatipule',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Ganpatipule, Ratnagiri',
    price: '3800',
    type: 'cottage',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800',
    rooms: 3,
    description: 'A charming cottage with sea-facing balconies just 500m from the famous Ganpatipule temple beach. Enjoy spectacular sunsets, fresh seafood, and a peaceful retreat from city life.',
    rating: 4.6,
    reviews_count: 38,
    is_featured: true
  },
  {
    id: 'guhagar-coastal-hut',
    name: 'Guhagar Coastal Hut',
    title: 'Guhagar Coastal Hut',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Guhagar, Ratnagiri',
    price: '2200',
    type: 'hut',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800',
    image: 'https://images.unsplash.com/photo-1510798831971-661eb04b3739?w=800',
    rooms: 2,
    description: 'An eco-friendly bamboo hut right on the pristine Guhagar beach. Solar-powered, sustainable, and surrounded by casuarina trees.',
    rating: 4.5,
    reviews_count: 21,
    is_featured: false
  },
  {
    id: 'ratnagiri-spice-farm',
    name: 'Ratnagiri Spice Farm Retreat',
    title: 'Ratnagiri Spice Farm Retreat',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Ratnagiri, Konkan',
    price: '2800',
    type: 'farmstay',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
    image: 'https://images.unsplash.com/photo-1501854140801-50d01698950b?w=800',
    rooms: 4,
    description: 'Immerse yourself in a working spice plantation with turmeric, kokam, pepper, and cardamom. Daily spice walks, cooking classes, and Ayurvedic treatments available on site.',
    rating: 4.7,
    reviews_count: 44,
    is_featured: false
  },
  {
    id: 'devgad-mango-villa',
    name: 'Devgad Mango Villa',
    title: 'Devgad Mango Villa',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Devgad, Sindhudurg',
    price: '8500',
    type: 'villa',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
    image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
    rooms: 10,
    description: 'A luxurious private villa set within a 5-acre alphonso mango orchard in Devgad. Private pool, chef on call, and orchard-to-table dining.',
    rating: 5.0,
    reviews_count: 18,
    is_featured: true
  },
  {
    id: 'alibaug-palm-cottage',
    name: 'Alibaug Palm Cottage',
    title: 'Alibaug Palm Cottage',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Alibaug, Raigad',
    price: '5500',
    type: 'cottage',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    image: 'https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800',
    rooms: 5,
    description: 'A tranquil cottage surrounded by swaying palm trees in Alibaug, the closest beach destination from Mumbai. Ideal for weekend getaways and corporate off-sites.',
    rating: 4.6,
    reviews_count: 57,
    is_featured: false
  },
  {
    id: 'kashid-white-sand',
    name: 'Kashid White Sand Resort',
    title: 'Kashid White Sand Resort',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Kashid, Raigad',
    price: '7200',
    type: 'resort',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800',
    image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800',
    rooms: 15,
    description: 'A boutique resort steps from the powder-white sands of Kashid beach. Offers water sports, sunset cruises, and candlelit Konkani dinners.',
    rating: 4.8,
    reviews_count: 93,
    is_featured: true
  },
  {
    id: 'chiplun-river-wada',
    name: 'Chiplun River Wada',
    title: 'Chiplun River Wada',
    host: 'Rajesh Patil',
    host_email: 'rajesh.patil@test.com',
    host_phone: '+91-9876543210',
    location: 'Chiplun, Ratnagiri',
    price: '3600',
    type: 'heritage',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800',
    image: 'https://images.unsplash.com/photo-1575517111839-3a3843ee7f5d?w=800',
    rooms: 6,
    description: 'A restored heritage wada on the banks of the Vashishthi river in Chiplun. Kayaking, river fishing, and guided bird-watching treks included.',
    rating: 4.7,
    reviews_count: 33,
    is_featured: false
  },
  {
    id: 'murud-sea-fort-house',
    name: 'Murud Sea Fort House',
    title: 'Murud Sea Fort House',
    host: 'Sunita Sawant',
    host_email: 'sunita.sawant@test.com',
    host_phone: '+91-9123456789',
    location: 'Murud, Raigad',
    price: '4200',
    type: 'homestay',
    status: 'approved',
    image_url: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
    image: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800',
    rooms: 7,
    description: 'A historic bungalow with views of the legendary Murud-Janjira sea fort. Enjoy boat trips to the fort and fresh kekda (crab) curries.',
    rating: 4.9,
    reviews_count: 71,
    is_featured: true
  }
];

// ── 3. BOOKINGS ─────────────────────────────────────────────
// Actual columns: id, booking_id, user_email, user_name, user_phone, property_name,
//                 property_image, check_in, check_out, guests, total_amount, paid_amount,
//                 remaining_amount, payment_type, payment_id, status, created_at
const bookings = [
  {
    id: '11111111-0001-0001-0001-000000000001',
    booking_id: 'BK-2026-001',
    user_email: 'amit.sharma@test.com',
    user_name: 'Amit Sharma',
    user_phone: '+91-9988776655',
    property_name: 'Tarkarli Beach Villa',
    property_image: 'https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=800',
    check_in: '2026-08-15',
    check_out: '2026-08-18',
    guests: 4,
    total_amount: 20400.00,
    paid_amount: 20400.00,
    remaining_amount: 0.00,
    payment_type: 'full',
    payment_id: 'pay_razorpay_test_001',
    status: 'confirmed'
  },
  {
    id: '22222222-0002-0002-0002-000000000002',
    booking_id: 'BK-2026-002',
    user_email: 'priya.nair@test.com',
    user_name: 'Priya Nair',
    user_phone: '+91-9765432100',
    property_name: 'Mango Farmstay Devgad',
    property_image: 'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800',
    check_in: '2026-08-20',
    check_out: '2026-08-23',
    guests: 2,
    total_amount: 9600.00,
    paid_amount: 9600.00,
    remaining_amount: 0.00,
    payment_type: 'full',
    payment_id: 'pay_razorpay_test_002',
    status: 'confirmed'
  },
  {
    id: '33333333-0003-0003-0003-000000000003',
    booking_id: 'BK-2026-003',
    user_email: 'rahul.desai@test.com',
    user_name: 'Rahul Desai',
    user_phone: '+91-9654321098',
    property_name: 'Shree Ganesh Homestay',
    property_image: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800',
    check_in: '2026-09-01',
    check_out: '2026-09-03',
    guests: 3,
    total_amount: 5000.00,
    paid_amount: 2500.00,
    remaining_amount: 2500.00,
    payment_type: 'partial',
    payment_id: 'pay_razorpay_test_003',
    status: 'pending'
  },
  {
    id: '44444444-0004-0004-0004-000000000004',
    booking_id: 'BK-2026-004',
    user_email: 'amit.sharma@test.com',
    user_name: 'Amit Sharma',
    user_phone: '+91-9988776655',
    property_name: 'Devgad Mango Villa',
    property_image: 'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800',
    check_in: '2026-09-10',
    check_out: '2026-09-14',
    guests: 6,
    total_amount: 34000.00,
    paid_amount: 34000.00,
    remaining_amount: 0.00,
    payment_type: 'full',
    payment_id: 'pay_razorpay_test_004',
    status: 'confirmed'
  },
  {
    id: '55555555-0005-0005-0005-000000000005',
    booking_id: 'BK-2026-005',
    user_email: 'priya.nair@test.com',
    user_name: 'Priya Nair',
    user_phone: '+91-9765432100',
    property_name: 'Kashid White Sand Resort',
    property_image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?w=800',
    check_in: '2026-10-05',
    check_out: '2026-10-07',
    guests: 2,
    total_amount: 14400.00,
    paid_amount: 0.00,
    remaining_amount: 14400.00,
    payment_type: 'full',
    payment_id: null,
    status: 'pending'
  }
];

// ── 4. NEWSLETTER SUBSCRIBERS ────────────────────────────────
const newsletterSubscribers = [
  { id: 'nl_s001', email: 'suresh.more@gmail.com' },
  { id: 'nl_s002', email: 'meena.kulkarni@gmail.com' },
  { id: 'nl_s003', email: 'vijay.joshi@hotmail.com' },
  { id: 'nl_s004', email: 'deepa.naik@yahoo.com' },
  { id: 'nl_s005', email: 'kishore.gharat@gmail.com' },
  { id: 'nl_s006', email: 'anita.gawde@test.com' },
  { id: 'nl_s007', email: 'prakash.rane@test.com' }
];

// ── 5. CANCELLATIONS ─────────────────────────────────────────
const cancellations = [
  {
    id: 'cancel_s001',
    booking_id: 'BK-2026-003',
    user_email: 'rahul.desai@test.com',
    user_name: 'Rahul Desai',
    property_name: 'Shree Ganesh Homestay',
    check_in: '2026-09-01',
    check_out: '2026-09-03',
    paid_amount: 2500.00,
    refund_amount: 2000.00,
    refund_percentage: 80,
    notice_days: 29,
    cancellation_reason: 'Change of travel plans due to work commitment',
    status: 'requested'
  },
  {
    id: 'cancel_s002',
    booking_id: 'BK-2026-999',
    user_email: 'amit.sharma@test.com',
    user_name: 'Amit Sharma',
    property_name: 'Sindhudurg Heritage Wada',
    check_in: '2026-07-10',
    check_out: '2026-07-13',
    paid_amount: 13500.00,
    refund_amount: 6750.00,
    refund_percentage: 50,
    notice_days: 5,
    cancellation_reason: 'Family emergency',
    status: 'approved'
  }
];

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('🌴 Stay In Konkan — Database Seeder (v2)\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await upsert('users', users);
  await upsert('properties', properties);
  await upsert('bookings', bookings);
  // Use ignore-duplicates for newsletter since emails may already exist
  const nlRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
    method: 'POST',
    headers: headersIgnoreDup,
    body: JSON.stringify(newsletterSubscribers)
  });
  const nlText = await nlRes.text();
  let nlData; try { nlData = JSON.parse(nlText); } catch { nlData = nlText; }
  if (!nlRes.ok) {
    console.error('❌ [newsletter_subscribers] HTTP', nlRes.status, JSON.stringify(nlData));
  } else {
    console.log(`✅ [newsletter_subscribers] Inserted/skipped ${Array.isArray(nlData) ? nlData.length : 0} row(s)`);
  }
  await upsert('cancellations', cancellations);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete!');
  console.log('   • 5 users (2 hosts + 3 guests)');
  console.log('   • 12 properties (all major Konkan listings, status=approved)');
  console.log('   • 5 bookings (3 confirmed, 2 pending)');
  console.log('   • 7 newsletter subscribers');
  console.log('   • 2 cancellation requests');
}

main().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

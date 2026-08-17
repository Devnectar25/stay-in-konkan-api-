// ============================================================
// seed.mjs — Stay In Konkan: Comprehensive Testing Data Seeder
// Uses Supabase REST API (service role key)
// Run: node seed.mjs
// ============================================================

const SUPABASE_URL = 'https://bqsczpvvqvcgztrlpwwj.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJxc2N6cHZ2cXZjZ3p0cmxwd3dqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NjY4Mzg1NSwiZXhwIjoyMTAyMjU5ODU1fQ.TNG7GxbS2gZa5WsVZmS4u3UVowDsjLc5nkeJfd-e_to';

const headers = {
  'Content-Type': 'application/json',
  'apikey': SERVICE_ROLE_KEY,
  'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
  'Prefer': 'resolution=merge-duplicates,return=representation'
};

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
const users = [
  {
    id: 'admin_01',
    full_name: 'Platform Administrator',
    email: 'admin@stayinkonkan.com',
    phone: '+91-9800000000',
    role: 'admin',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Admin+Konkan&background=1b3823&color=fff'
  },
  {
    id: 'host_01',
    full_name: 'Anand Sawant',
    email: 'anand.sawant@example.com',
    phone: '+91-9876543210',
    role: 'host',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Anand+Sawant&background=16a34a&color=fff'
  },
  {
    id: 'host_02',
    full_name: 'Sanjay Kulkarni',
    email: 'sanjay.k@example.com',
    phone: '+91-9123456789',
    role: 'host',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Sanjay+Kulkarni&background=0ea5e9&color=fff'
  },
  {
    id: 'host_03',
    full_name: 'Deep Magare',
    email: 'deepmagare0@gmail.com',
    phone: '+91-9822114455',
    role: 'host',
    provider: 'email',
    verified: true,
    avatar_url: 'https://ui-avatars.com/api/?name=Deep+Magare&background=2563eb&color=fff'
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
  }
];

// ── 2. PROPERTIES ─────────────────────────────────────────────
const properties = [
  {
    id: 'shree-ganesh',
    name: 'Shree Ganesh Homestay',
    title: 'Shree Ganesh Homestay',
    host: 'Anand Sawant',
    host_name: 'Anand Sawant',
    host_email: 'anand.sawant@example.com',
    host_phone: '+91-9876543210',
    location: 'Guhagar, Maharashtra • Near Beach',
    price: 1800,
    price_per_night: 1800,
    type: 'homestay',
    status: 'live',
    image_url: '/assets/images/properties/konkan_village_home.png',
    image: '/assets/images/properties/konkan_village_home.png',
    rooms: [
      { id: 'rm-1', name: 'Deluxe Coconut Garden View Room', price: 1800, capacity: 2, beds: '1 Queen Bed', image: '/assets/images/properties/konkan_village_home.png' },
      { id: 'rm-2', name: 'Family Verandah Suite', price: 2400, capacity: 4, beds: '2 Queen Beds', image: '/assets/images/properties/konkan_laterite_house.png' }
    ],
    description: 'A traditional family-run home near Guhagar beach offering authentic Malvani thalis, fresh coconut water, and a warm village atmosphere.',
    rating: 4.9,
    reviews_count: 47,
    is_featured: true
  },
  {
    id: 'mango-farmstay',
    name: 'Mango Farmstay Devgad',
    title: 'Mango Farmstay Devgad',
    host: 'Sanjay Kulkarni',
    host_name: 'Sanjay Kulkarni',
    host_email: 'sanjay.k@example.com',
    host_phone: '+91-9123456789',
    location: 'Ratnagiri, Maharashtra • Orchard',
    price: 2200,
    price_per_night: 2200,
    type: 'farmstay',
    status: 'live',
    image_url: '/assets/images/properties/konkan_laterite_house.png',
    image: '/assets/images/properties/konkan_laterite_house.png',
    rooms: [
      { id: 'rm-1', name: 'Orchard Breeze Room', price: 2200, capacity: 2, beds: '1 King Bed', image: '/assets/images/properties/konkan_laterite_house.png' }
    ],
    description: 'Experience life on a working mango farm. Wake up to the sound of birds, enjoy freshly plucked Alphonso fruits, and relax under shaded groves.',
    rating: 4.8,
    reviews_count: 63,
    is_featured: true
  },
  {
    id: 'sindhudurg-heritage',
    name: 'Sindhudurg Heritage House',
    title: 'Sindhudurg Heritage House',
    host: 'Ramesh & Sunita Wada',
    host_name: 'Ramesh & Sunita Wada',
    host_email: 'ramesh.wada@example.com',
    host_phone: '+91-9823345678',
    location: 'Malvan, Maharashtra • Heritage',
    price: 3500,
    price_per_night: 3500,
    type: 'heritage',
    status: 'live',
    image_url: '/assets/images/home/sindhudurg_heritage_house.png',
    image: '/assets/images/home/sindhudurg_heritage_house.png',
    rooms: [
      { id: 'rm-1', name: 'Courtyard Heritage Suite', price: 3500, capacity: 3, beds: '1 King Bed + 1 Single', image: '/assets/images/home/sindhudurg_heritage_house.png' }
    ],
    description: 'A restored 100-year-old traditional Konkani courtyard house with red laterite stone walls, antique wooden pillars, and authentic local hospitality.',
    rating: 4.95,
    reviews_count: 29,
    is_featured: true
  },
  {
    id: 'tarkarli-beach-villa',
    name: 'Tarkarli Beach Breeze Villa',
    title: 'Tarkarli Beach Breeze Villa',
    host: 'Mahesh Naik',
    host_name: 'Mahesh Naik',
    host_email: 'mahesh.naik@example.com',
    host_phone: '+91-9822012345',
    location: 'Tarkarli, Malvan • Beachfront',
    price: 4200,
    price_per_night: 4200,
    type: 'villa',
    status: 'live',
    image_url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80',
    rooms: [
      { id: 'rm-1', name: 'Oceanfront Luxury Villa', price: 4200, capacity: 4, beds: '2 King Beds', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=800&q=80' }
    ],
    description: 'Luxury seaside villa surrounded by coconut groves with private beach access, scuba diving packages, and panoramic Arabian Sea views.',
    rating: 4.9,
    reviews_count: 82,
    is_featured: true
  },
  {
    id: 'prop-deepmagare-sea-breeze',
    name: 'Malvan Sea Breeze Villa',
    title: 'Malvan Sea Breeze Villa',
    host: 'Deep Magare',
    host_name: 'Deep Magare',
    host_email: 'deepmagare0@gmail.com',
    host_phone: '+91-9822114455',
    location: 'Tarkarli, Malvan, Sindhudurg • Beachfront',
    price: 2500,
    price_per_night: 2500,
    type: 'villa',
    status: 'live',
    image_url: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80',
    rooms: [
      { id: 'rm-1', name: 'Master Coastal Suite', price: 2500, capacity: 2, beds: '1 King Bed', image: 'https://images.unsplash.com/photo-1540541338287-41700207dee6?auto=format&fit=crop&w=1200&q=80' }
    ],
    description: 'Authentic 2-bedroom seaside villa hosted by Deep Magare right on Tarkarli beach. Enjoy fresh homemade Malvani sea catch and peaceful coastal evenings.',
    rating: 5.0,
    reviews_count: 38,
    is_featured: true
  },
  {
    id: 'guhagar-coastal-hut',
    name: 'Guhagar Coastal Coconut Hut',
    title: 'Guhagar Coastal Coconut Hut',
    host: 'Pradeep Patil',
    host_name: 'Pradeep Patil',
    host_email: 'pradeep.patil@example.com',
    host_phone: '+91-9765432109',
    location: 'Guhagar, Maharashtra • Coconut Grove',
    price: 1900,
    price_per_night: 1900,
    type: 'homestay',
    status: 'live',
    image_url: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80',
    rooms: [
      { id: 'rm-1', name: 'Eco Bamboo Cottage', price: 1900, capacity: 2, beds: '1 Queen Bed', image: 'https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?auto=format&fit=crop&w=800&q=80' }
    ],
    description: 'Rustic eco-cottage tucked amidst coconut palms 200m from Guhagar white sand beach. Solar powered with authentic Konkani home dining.',
    rating: 4.85,
    reviews_count: 21,
    is_featured: true
  },
  {
    id: 'ratnagiri-spice-farm',
    name: 'Ratnagiri Organic Spice Farmstay',
    title: 'Ratnagiri Organic Spice Farmstay',
    host: 'Ganesh Joshi',
    host_name: 'Ganesh Joshi',
    host_email: 'ganesh.j@example.com',
    host_phone: '+91-9876543211',
    location: 'Ratnagiri, Maharashtra • Countryside',
    price: 2400,
    price_per_night: 2400,
    type: 'farmstay',
    status: 'live',
    image_url: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80',
    rooms: [
      { id: 'rm-1', name: 'Garden Spice Cottage', price: 2400, capacity: 2, beds: '1 Queen Bed', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=800&q=80' }
    ],
    description: 'Serene farmstay surrounded by cinnamon, nutmeg, and Alphonso mango plantations. Guided plantation walks and local organic food.',
    rating: 4.75,
    reviews_count: 44,
    is_featured: true
  },
  {
    id: 'devgad-mango-villa',
    name: 'Devgad Alphonso Haven',
    title: 'Devgad Alphonso Haven',
    host: 'Vinayak Devgade',
    host_name: 'Vinayak Devgade',
    host_email: 'vinayak@devgad.com',
    host_phone: '+91-9123456788',
    location: 'Devgad, Sindhudurg • Sea View',
    price: 3800,
    price_per_night: 3800,
    type: 'villa',
    status: 'live',
    image_url: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80',
    rooms: [
      { id: 'rm-1', name: 'Cliffside Sea View Villa', price: 3800, capacity: 4, beds: '2 Queen Beds', image: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=800&q=80' }
    ],
    description: 'Cliffside retreat overlooking Devgad harbor with panoramic sunset vistas and fresh sea catch thalis.',
    rating: 4.92,
    reviews_count: 18,
    is_featured: true
  }
];

// ── 3. BOOKINGS ─────────────────────────────────────────────
const bookings = [
  {
    id: '11111111-0001-0001-0001-000000000001',
    booking_id: 'BK-2026-001',
    user_email: 'amit.sharma@test.com',
    user_name: 'Amit Sharma',
    user_phone: '+91-9988776655',
    guest_name: 'Amit Sharma',
    guest_email: 'amit.sharma@test.com',
    guest_phone: '+91-9988776655',
    property_id: 'tarkarli-beach-villa',
    property_name: 'Tarkarli Beach Breeze Villa',
    check_in: '2026-08-15',
    check_out: '2026-08-18',
    guests: 4,
    rooms: 1,
    total_price: 12600.00,
    total_amount: 12600.00,
    payment_status: 'completed',
    status: 'confirmed'
  },
  {
    id: '22222222-0002-0002-0002-000000000002',
    booking_id: 'BK-2026-002',
    user_email: 'priya.nair@test.com',
    user_name: 'Priya Nair',
    user_phone: '+91-9765432100',
    guest_name: 'Priya Nair',
    guest_email: 'priya.nair@test.com',
    guest_phone: '+91-9765432100',
    property_id: 'mango-farmstay',
    property_name: 'Mango Farmstay Devgad',
    check_in: '2026-08-20',
    check_out: '2026-08-23',
    guests: 2,
    rooms: 1,
    total_price: 6600.00,
    total_amount: 6600.00,
    payment_status: 'completed',
    status: 'confirmed'
  }
];

// ── 4. NEWSLETTER SUBSCRIBERS ────────────────────────────────
const newsletterSubscribers = [
  { id: 'nl_s001', email: 'suresh.more@gmail.com' },
  { id: 'nl_s002', email: 'meena.kulkarni@gmail.com' },
  { id: 'nl_s003', email: 'vijay.joshi@hotmail.com' },
  { id: 'nl_s004', email: 'deepa.naik@yahoo.com' },
  { id: 'nl_s005', email: 'kishore.gharat@gmail.com' }
];

// ── 5. CANCELLATIONS ─────────────────────────────────────────
const cancellations = [
  {
    id: 'cancel_s001',
    booking_id: 'BK-2026-001',
    user_email: 'rahul.desai@test.com',
    user_name: 'Rahul Desai',
    property_name: 'Shree Ganesh Homestay',
    check_in: '2026-09-01',
    check_out: '2026-09-03',
    paid_amount: 3600.00,
    refund_amount: 2880.00,
    refund_percentage: 80,
    notice_days: 15,
    cancellation_reason: 'Change of travel plans due to work schedule',
    status: 'requested',
    refund_status: 'pending'
  }
];

// ── 6. COUPONS ───────────────────────────────────────────────
const coupons = [
  {
    id: 'CPN-KONKAN20',
    code: 'KONKAN20',
    discount_type: 'percentage',
    discount_value: 20,
    min_booking: 2000,
    apply_to: 'All Stays',
    max_uses: 100,
    times_used: 14,
    active: true,
    is_private: false,
    expiry: '2026-12-31'
  },
  {
    id: 'CPN-MONSOON500',
    code: 'MONSOON500',
    discount_type: 'flat',
    discount_value: 500,
    min_booking: 3000,
    apply_to: 'Beachfront Stays',
    max_uses: 50,
    times_used: 8,
    active: true,
    is_private: false,
    expiry: '2026-10-31'
  }
];

// ── 7. HELP DESK ISSUES ──────────────────────────────────────
const issues = [
  {
    id: 'ISSUE-UUID-001',
    issue_id: 'TK-20260813-8A7B',
    title: 'Payment Receipt Download Failing on Safari Browser',
    description: 'When clicking on Download Invoice PDF after booking Tarkarli Beach Breeze Villa on Safari iOS, the PDF popup opens blank.',
    category: 'Payment Issue',
    user_name: 'Vikram Shinde',
    user_email: 'vikram.shinde@example.com',
    user_phone: '+91 98220 12345',
    priority: 'High',
    status: 'Open',
    admin_notes: 'Support team acknowledged inquiry. Testing Safari blob download.'
  },
  {
    id: 'ISSUE-UUID-002',
    issue_id: 'TK-20260813-4F2A',
    title: 'Host Listing Verification Document Upload Size Limit',
    description: 'Host unable to upload 12MB property 7/12 extract PDF document during host application process.',
    category: 'Property Issue',
    user_name: 'Sunita Wada',
    user_email: 'sunita.wada@example.com',
    user_phone: '+91 98233 45678',
    priority: 'Medium',
    status: 'In Progress',
    admin_notes: 'Increased Express body parser limit to 50MB.'
  }
];

// ── 8. REVIEWS ───────────────────────────────────────────────
const reviews = [
  {
    id: 'REV-001',
    property_id: 'shree-ganesh',
    guest_name: 'Aniket Rane',
    user_email: 'aniket.rane@example.com',
    rating: 5,
    comment: 'Authentic Konkani hospitality! Anand and his family prepared the best Solkadhi and Surmai fry we have ever tasted.'
  },
  {
    id: 'REV-002',
    property_id: 'mango-farmstay',
    guest_name: 'Kavita Joshi',
    user_email: 'kavita.j@example.com',
    rating: 5,
    comment: 'Wonderful peaceful stay in the middle of mango trees. Kids loved the open farm and beach was just 10 mins away.'
  }
];

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  console.log('🌴 Stay In Konkan — Database Seeder\n');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

  await upsert('users', users);
  await upsert('properties', properties);
  await upsert('bookings', bookings);
  
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
  await upsert('coupons', coupons);
  await upsert('issue', issues);
  await upsert('reviews', reviews);

  console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('🎉 Seed complete! All dummy data is live in Supabase.');
}

main().catch(err => {
  console.error('Fatal seed error:', err);
  process.exit(1);
});

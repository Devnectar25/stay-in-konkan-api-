import pg from 'pg';
import dotenv from 'dotenv';
dotenv.config();

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres.stkpofofekgobpnzvdor:devnectar%402133@aws-0-ap-northeast-1.pooler.supabase.com:5432/postgres';

async function updatePropertyImages() {
  const client = new pg.Client({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  try {
    await client.connect();
    console.log('Connected to PostgreSQL database...');

    // 1. Delete test property
    await client.query("DELETE FROM properties WHERE id LIKE 'test_prop_%'");

    // 2. All 20 properties with 100% distinct images
    const allProperties = [
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
        facility1_image: '/assets/images/home/malvan_river_hd.png',
        facility2_image: '/assets/images/home/konkan_pristine_cove.png',
        facility3_image: '/assets/images/properties/konkan_village_home.png'
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
        facility1_image: '/assets/images/properties/konkan_laterite_house.png',
        facility2_image: '/assets/images/home/ratnagiri_hd.png',
        facility3_image: '/assets/images/home/konkan_authentic_thali.png'
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
        facility1_image: '/assets/images/home/alibaug_hd.png',
        facility2_image: '/assets/images/properties/konkan_village_home.png',
        facility3_image: '/assets/images/home/konkan_eco_kayaking.png'
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
        facility1_image: '/assets/images/home/konkan_hero_banner.png',
        facility2_image: '/assets/images/home/guhagar_hd.png',
        facility3_image: '/assets/images/home/konkan_pristine_cove.png'
      },
      {
        id: 'prop_05',
        title: 'Kashid White Sand Hilltop Villa',
        description: 'Perched high in the Kashid hills with panoramic views of the Arabian Sea and Kashid white sand beach. Private plunge pool and sundeck.',
        location: 'Kashid Beach, Raigad',
        type: 'villa',
        price_per_night: 6200.00,
        rating: 4.90,
        reviews_count: 53,
        image_url: '/assets/images/home/konkan_pristine_cove.png',
        status: 'live',
        amenities: JSON.stringify(['Private Plunge Pool', 'Sea View Sundeck', 'Air Conditioning', 'Caretaker & Cook', 'Generator Backup', 'High Speed Wi-Fi']),
        host_name: 'Deep Magare',
        host_email: 'deepmagare0@gmail.com',
        host_phone: '+91 98221 14455',
        facility1_image: '/assets/images/home/konkan_pristine_cove.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/home/konkan_eco_hero.png'
      },
      {
        id: 'prop_06',
        title: 'Dapoli Ladghar Breeze Cottage',
        description: 'Famous red-pebble beach cottage at Tamas Tirth, Dapoli. Dolphin safari boat bookings and authentic surmai thalis.',
        location: 'Ladghar Beach, Dapoli, Ratnagiri',
        type: 'cottage',
        price_per_night: 2900.00,
        rating: 4.80,
        reviews_count: 39,
        image_url: '/assets/images/home/guhagar_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Beachfront Access', 'Dolphin Boat Assistance', 'Fresh Coastal Meals', 'Hot Water', 'Power Backup']),
        host_name: 'Mahesh Naik',
        host_email: 'mahesh.naik@example.com',
        host_phone: '+91 94220 18402',
        facility1_image: '/assets/images/home/guhagar_hd.png',
        facility2_image: '/assets/images/home/malvan_river_hd.png',
        facility3_image: '/assets/images/properties/konkan_laterite_house.png'
      },
      {
        id: 'prop_07',
        title: 'Devgad Alphonso Orchard Homestay',
        description: 'Charming farmhouse surrounded by 500 Alphonso mango trees. Features homemade Ukadiche Modak, farm walks, and harbor view.',
        location: 'Devgad, Sindhudurg',
        type: 'farmstay',
        price_per_night: 2600.00,
        rating: 4.85,
        reviews_count: 48,
        image_url: '/assets/images/properties/konkan_village_home.png',
        status: 'live',
        amenities: JSON.stringify(['Mango Orchard Walk', 'Traditional Kitchen', 'Farm Fresh Meals', 'Solar Water Heater', 'Free Parking']),
        host_name: 'Mahesh Naik',
        host_email: 'mahesh.naik@example.com',
        host_phone: '+91 94220 18402',
        facility1_image: '/assets/images/properties/konkan_village_home.png',
        facility2_image: '/assets/images/home/konkan_authentic_thali.png',
        facility3_image: '/assets/images/home/konkan_heritage_homestay.png'
      },
      {
        id: 'prop_08',
        title: 'Guhagar Beachside Eco Resort',
        description: 'Eco-friendly sustainable wooden cottages under coconut palms, 100 meters from Guhagar clean white sand beach.',
        location: 'Guhagar, Ratnagiri',
        type: 'resort',
        price_per_night: 3400.00,
        rating: 4.80,
        reviews_count: 57,
        image_url: '/assets/images/home/konkan_eco_hero.png',
        status: 'live',
        amenities: JSON.stringify(['Eco Wooden Cabins', 'Organic Food', '100m to Beach', 'Yoga Deck', 'Free Wi-Fi']),
        host_name: 'Sanjay Kulkarni',
        host_email: 'sanjay.k@example.com',
        host_phone: '+91 98224 45910',
        facility1_image: '/assets/images/home/konkan_eco_hero.png',
        facility2_image: '/assets/images/home/guhagar_hd.png',
        facility3_image: '/assets/images/home/konkan_pristine_cove.png'
      },
      {
        id: 'prop_09',
        title: 'Murud Janjira Sea View House',
        description: 'Colonial coastal house with direct balcony views of the historic Murud Janjira sea fort and coconut groves.',
        location: 'Murud, Raigad',
        type: 'homestay',
        price_per_night: 3100.00,
        rating: 4.75,
        reviews_count: 36,
        image_url: '/assets/images/home/sindhudurg_heritage_house.png',
        status: 'live',
        amenities: JSON.stringify(['Fort View Balcony', 'Coastal Seafood', 'Air Conditioning', 'Free Parking', 'Speedboat Desk']),
        host_name: 'Subhash Patil',
        host_email: 'subhash.patil@example.com',
        host_phone: '+91 94238 67123',
        facility1_image: '/assets/images/home/sindhudurg_heritage_house.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/home/konkan_hero_banner.png'
      },
      {
        id: 'prop_10',
        title: 'Vengurla Bhogwe Paradise Villa',
        description: 'Secluded luxury paradise where the Karli river meets the Arabian Sea. Unspoiled private beach and serene backwaters.',
        location: 'Bhogwe Beach, Vengurla, Sindhudurg',
        type: 'villa',
        price_per_night: 4800.00,
        rating: 4.90,
        reviews_count: 71,
        image_url: '/assets/images/home/konkan_eco_kayaking.png',
        status: 'live',
        amenities: JSON.stringify(['River & Sea Confluence', 'Kayaking Desk', 'Private Beach Access', 'Air Conditioning', 'Fresh Crab & Prawn Thali']),
        host_name: 'Anand Sawant',
        host_email: 'anand.sawant@example.com',
        host_phone: '+91 98901 23456',
        facility1_image: '/assets/images/home/konkan_eco_kayaking.png',
        facility2_image: '/assets/images/home/malvan_river_hd.png',
        facility3_image: '/assets/images/home/konkan_insta_4_1784033246610.png'
      },
      {
        id: 'prop_11',
        title: 'Kunkeshwar Temple Coast Homestay',
        description: 'Peaceful spiritual coastal retreat steps away from the ancient Kunkeshwar Shiva Temple on the sea shore.',
        location: 'Kunkeshwar, Devgad, Sindhudurg',
        type: 'homestay',
        price_per_night: 2400.00,
        rating: 4.80,
        reviews_count: 42,
        image_url: '/assets/images/home/konkan_heritage_homestay.png',
        status: 'live',
        amenities: JSON.stringify(['Temple Pathway', 'Sea View Verandah', 'Vegetarian Meals', 'Hot Water', 'Free Wi-Fi']),
        host_name: 'Mahesh Naik',
        host_email: 'mahesh.naik@example.com',
        host_phone: '+91 94220 18402',
        facility1_image: '/assets/images/home/konkan_heritage_homestay.png',
        facility2_image: '/assets/images/properties/konkan_village_home.png',
        facility3_image: '/assets/images/home/konkan_authentic_thali.png'
      },
      {
        id: 'prop_12',
        title: 'Diveagar Golden Sands Villa',
        description: 'Spacious holiday villa in Diveagar village famous for Suvarna Ganesha temple and peaceful betel nut plantations.',
        location: 'Diveagar, Raigad',
        type: 'villa',
        price_per_night: 3800.00,
        rating: 4.85,
        reviews_count: 55,
        image_url: '/assets/images/home/konkan_insta_4_1784033246610.png',
        status: 'live',
        amenities: JSON.stringify(['Private Garden', 'Air Conditioning', 'Temple Shuttle', 'Free Wi-Fi', 'Attached Bathrooms']),
        host_name: 'Subhash Patil',
        host_email: 'subhash.patil@example.com',
        host_phone: '+91 94238 67123',
        facility1_image: '/assets/images/home/konkan_insta_4_1784033246610.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/home/konkan_hero_banner.png'
      },
      {
        id: 'prop_13',
        title: 'Velas Turtle Beach Homestay',
        description: 'Home of the famous Velas Olive Ridley Turtle Festival. Authentic Konkani village hospitality and traditional vegetarian Maharashtrian meals.',
        location: 'Velas Beach, Ratnagiri',
        type: 'homestay',
        price_per_night: 2100.00,
        rating: 4.90,
        reviews_count: 67,
        image_url: '/assets/images/home/konkan_insta_5_1784033261621.png',
        status: 'live',
        amenities: JSON.stringify(['Turtle Festival Guide', 'Authentic Local Food', 'Village Courtyard', 'Clean Rooms', 'Solar Hot Water']),
        host_name: 'Sanjay Kulkarni',
        host_email: 'sanjay.k@example.com',
        host_phone: '+91 98224 45910',
        facility1_image: '/assets/images/home/konkan_insta_5_1784033261621.png',
        facility2_image: '/assets/images/properties/konkan_laterite_house.png',
        facility3_image: '/assets/images/home/konkan_authentic_thali.png'
      },
      {
        id: 'prop_14',
        title: 'Sawantwadi Wooden Craft Heritage Wada',
        description: 'Royal heritage wada close to Moti Talao and Sawantwadi Palace, famous for Ganjifa art and handmade wooden toys.',
        location: 'Sawantwadi, Sindhudurg',
        type: 'heritage',
        price_per_night: 3300.00,
        rating: 4.88,
        reviews_count: 51,
        image_url: '/assets/images/home/ratnagiri_hd.png',
        status: 'live',
        amenities: JSON.stringify(['Heritage Architecture', 'Art Workshop Visit', 'Royal Malvani Cuisine', 'Wi-Fi', 'Air Conditioning']),
        host_name: 'Mahesh Naik',
        host_email: 'mahesh.naik@example.com',
        host_phone: '+91 94220 18402',
        facility1_image: '/assets/images/home/ratnagiri_hd.png',
        facility2_image: '/assets/images/home/malvan_river_hd.png',
        facility3_image: '/assets/images/properties/konkan_laterite_house.png'
      },
      {
        id: 'prop_15',
        title: 'Shrivardhan Aaravi Beach Resort',
        description: 'Modern beachside resort nestled between Shrivardhan and Harihareshwar, offering pristine black-sand beach access.',
        location: 'Shrivardhan, Raigad',
        type: 'resort',
        price_per_night: 4200.00,
        rating: 4.78,
        reviews_count: 44,
        image_url: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
        status: 'live',
        amenities: JSON.stringify(['Oceanfront Rooms', 'Private Lawn', 'Swimming Pool', 'Seafood Restaurant', 'Free Parking']),
        host_name: 'Sanjay Kulkarni',
        host_email: 'sanjay.k@example.com',
        host_phone: '+91 98224 45910',
        facility1_image: 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1000&q=80',
        facility2_image: '/assets/images/home/konkan_pristine_cove.png',
        facility3_image: '/assets/images/home/alibaug_hd.png'
      },
      {
        id: 'prop_16',
        title: 'Chiplun Vashishti Riverfront Resort',
        description: 'Scenic riverfront retreat on the banks of Vashishti River in the foothills of Sahyadri mountains.',
        location: 'Chiplun, Ratnagiri',
        type: 'resort',
        price_per_night: 3600.00,
        rating: 5.00,
        reviews_count: 38,
        image_url: '/assets/images/home/konkan_insta_1_1784033213488.png',
        status: 'live',
        amenities: JSON.stringify(['River View Deck', 'Boating Facility', 'Bonfire Area', 'Air Conditioning', 'Free Breakfast']),
        host_name: 'Subhash Patil',
        host_email: 'subhash.patil@example.com',
        host_phone: '+91 94238 67123',
        facility1_image: '/assets/images/home/konkan_insta_1_1784033213488.png',
        facility2_image: '/assets/images/home/guhagar_hd.png',
        facility3_image: '/assets/images/home/konkan_hero_banner.png'
      },
      {
        id: 'prop_17',
        title: 'Malvan Chivla Beach Homestay',
        description: 'Family-friendly coastal homestay on crescent-shaped Chivla beach. Fresh Malvani kombdi vade and fish fry.',
        location: 'Chivla Beach, Malvan, Sindhudurg',
        type: 'homestay',
        price_per_night: 2500.00,
        rating: 4.86,
        reviews_count: 59,
        image_url: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
        status: 'live',
        amenities: JSON.stringify(['Beach Touch', 'Malvani Food', 'Water Sports Desk', 'Air Conditioning', 'Wi-Fi']),
        host_name: 'Anand Sawant',
        host_email: 'anand.sawant@example.com',
        host_phone: '+91 98901 23456',
        facility1_image: 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?auto=format&fit=crop&w=1000&q=80',
        facility2_image: '/assets/images/home/malvan_river_hd.png',
        facility3_image: '/assets/images/home/konkan_eco_kayaking.png'
      },
      {
        id: 'prop_18',
        title: 'Alibaug Varsoli Sea Cottage',
        description: 'Charming wooden sea cottage located on quiet Varsoli beach in Alibaug. Surrounded by suru trees with fresh seafood delicacies.',
        location: 'Varsoli Beach, Alibaug, Raigad',
        type: 'cottage',
        price_per_night: 3000.00,
        rating: 4.80,
        reviews_count: 49,
        image_url: '/assets/images/home/konkan_insta_3_1784033234187.png',
        status: 'live',
        amenities: JSON.stringify(['Suru Grove Garden', 'Sea View Porch', 'Alibaug Seafood', 'Air Conditioning', 'Free Parking']),
        host_name: 'Subhash Patil',
        host_email: 'subhash.patil@example.com',
        host_phone: '+91 94238 67123',
        facility1_image: '/assets/images/home/konkan_insta_3_1784033234187.png',
        facility2_image: '/assets/images/home/alibaug_hd.png',
        facility3_image: '/assets/images/properties/konkan_village_home.png'
      },
      {
        id: 'prop_19',
        title: 'Velneshwar Temple Beach Villa',
        description: 'Serene green valley villa near historic Velneshwar Shiva temple and crescent coconut beach.',
        location: 'Velneshwar, Guhagar, Ratnagiri',
        type: 'villa',
        price_per_night: 3300.00,
        rating: 4.85,
        reviews_count: 63,
        image_url: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1000&q=80',
        status: 'live',
        amenities: JSON.stringify(['Crescent Beach Access', 'Temple Pathway', 'Coconut Grove Patio', 'Home Cooked Meals', 'Free Wi-Fi']),
        host_name: 'Sanjay Kulkarni',
        host_email: 'sanjay.k@example.com',
        host_phone: '+91 98224 45910',
        facility1_image: 'https://images.unsplash.com/photo-1506929562872-bb421503ef21?auto=format&fit=crop&w=1000&q=80',
        facility2_image: '/assets/images/home/guhagar_hd.png',
        facility3_image: '/assets/images/home/konkan_eco_hero.png'
      },
      {
        id: 'prop_20',
        title: 'Khed Sahyadri Valley Farmstay',
        description: 'Rustic hill country farmstay tucked in Sahyadri mountain valley with organic farming and natural stream bath.',
        location: 'Khed, Ratnagiri',
        type: 'farmstay',
        price_per_night: 2700.00,
        rating: 4.90,
        reviews_count: 35,
        image_url: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80',
        status: 'live',
        amenities: JSON.stringify(['Organic Farm Tour', 'Natural Stream Bath', 'Village Cooking Experience', 'Campfire Area', 'Pet Friendly']),
        host_name: 'Anand Sawant',
        host_email: 'anand.sawant@example.com',
        host_phone: '+91 98901 23456',
        facility1_image: 'https://images.unsplash.com/photo-1470770841072-f978cf4d019e?auto=format&fit=crop&w=1000&q=80',
        facility2_image: '/assets/images/properties/konkan_laterite_house.png',
        facility3_image: '/assets/images/home/konkan_village_festival.png'
      }
    ];

    for (const p of allProperties) {
      await client.query(`
        INSERT INTO properties (
          id, title, description, location, type, price_per_night, rating, reviews_count,
          image_url, status, amenities, host_name, host_email, host_phone,
          facility1_image, facility2_image, facility3_image, created_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, NOW())
        ON CONFLICT (id) DO UPDATE SET
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          location = EXCLUDED.location,
          type = EXCLUDED.type,
          price_per_night = EXCLUDED.price_per_night,
          rating = EXCLUDED.rating,
          reviews_count = EXCLUDED.reviews_count,
          image_url = EXCLUDED.image_url,
          status = EXCLUDED.status,
          amenities = EXCLUDED.amenities,
          host_name = EXCLUDED.host_name,
          host_email = EXCLUDED.host_email,
          host_phone = EXCLUDED.host_phone,
          facility1_image = EXCLUDED.facility1_image,
          facility2_image = EXCLUDED.facility2_image,
          facility3_image = EXCLUDED.facility3_image;
      `, [
        p.id, p.title, p.description, p.location, p.type, p.price_per_night, p.rating, p.reviews_count,
        p.image_url, p.status, p.amenities, p.host_name, p.host_email, p.host_phone,
        p.facility1_image, p.facility2_image, p.facility3_image
      ]);
    }

    const countRes = await client.query('SELECT COUNT(*) FROM properties');
    console.log(`Successfully seeded/updated all ${countRes.rows[0].count} properties with unique images!`);

    const listRes = await client.query('SELECT id, title, image_url FROM properties ORDER BY id ASC');
    listRes.rows.forEach(r => {
      console.log(` ${r.id.padEnd(8)} | ${r.title.padEnd(42)} | ${r.image_url}`);
    });

  } catch (err) {
    console.error('Error updating properties:', err);
  } finally {
    await client.end();
  }
}

updatePropertyImages();

import { query } from '../src/db.js';

const dummyHostMap = {
  'prop_01': {
    host_name: 'Ramesh Parab',
    host_email: 'ramesh.parab@stayinkonkan.com',
    host_phone: '+91 94220 18402',
    host_languages: 'Marathi, Malvani, Hindi & English',
    amenities: JSON.stringify(['Air Conditioning', 'Free High-Speed Wi-Fi', 'Attached Private Bathroom', 'Hot Water Supply', 'Malvani Home-Cooked Meals', 'Sea View Balcony', 'Scuba Diving Assistance'])
  },
  'prop_02': {
    host_name: 'Shantaram Joshi',
    host_email: 'shantaram.joshi@stayinkonkan.com',
    host_phone: '+91 98224 45910',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Traditional Heritage Courtyard', 'Alphonso Mango Plantation Access', 'Home Cooked Vegetarian Thali', 'Hot Water', 'Free Parking'])
  },
  'prop_03': {
    host_name: 'Siddharth Patil',
    host_email: 'siddharth.patil@stayinkonkan.com',
    host_phone: '+91 94238 67123',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Private Coconut Garden', 'BBQ Grill Setup', 'Free Wi-Fi', 'Air Conditioning', 'Pet Friendly', '24/7 Power Backup'])
  },
  'prop_04': {
    host_name: 'Mahesh Kadam',
    host_email: 'mahesh.kadam@stayinkonkan.com',
    host_phone: '+91 98901 23456',
    host_languages: 'Marathi, Malvani, Hindi & English',
    amenities: JSON.stringify(['Infinity Swimming Pool', 'Oceanfront Dining', 'Spa & Wellness Center', 'Temple Shuttle Service', 'Free Breakfast'])
  },
  'prop_05': {
    host_name: 'Pradeep Sawant',
    host_email: 'pradeep.sawant@stayinkonkan.com',
    host_phone: '+91 91582 89012',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Panoramic Hilltop Ocean View', 'Private Swimming Pool', 'Outdoor Bonfire Deck', 'Chef on Request', 'Air Conditioning'])
  },
  'prop_06': {
    host_name: 'Anil Sanap',
    host_email: 'anil.sanap@stayinkonkan.com',
    host_phone: '+91 94220 34567',
    host_languages: 'Marathi, Malvani & Hindi',
    amenities: JSON.stringify(['Red Sand Beach Access', 'Water Sports Booking', 'Home-cooked Seafood', 'Solar Hot Water', 'Veranda Seating'])
  },
  'prop_07': {
    host_name: 'Dattatray Rane',
    host_email: 'dattatray.rane@stayinkonkan.com',
    host_phone: '+91 98224 78901',
    host_languages: 'Marathi, Malvani & Hindi',
    amenities: JSON.stringify(['Organic Alphonso Mango Tour', 'Fresh Farm Breakfast', 'Campfire & Star Gazing', 'Spacious Veranda', 'Free Parking'])
  },
  'prop_08': {
    host_name: 'Deep Magare',
    host_email: 'deepmagare0@gmail.com',
    host_phone: '+91 91234 56433',
    host_languages: 'Marathi, Malvani, Hindi & English',
    amenities: JSON.stringify(['Eco-Friendly Wooden Huts', 'Coconut Grove Lawn', 'Authentic Malvani Thali', 'Solar Power Backup', 'Beach Walk Path'])
  },
  'prop_09': {
    host_name: 'Tariq Khan',
    host_email: 'tariq.khan@stayinkonkan.com',
    host_phone: '+91 94238 90123',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Janjira Fort Boat Tour Aid', 'Sea Facing Terrace', 'Fresh Fish Curry & Fried Fish', 'Air Conditioning', 'Free Wi-Fi'])
  },
  'prop_10': {
    host_name: 'Ganesh Naik',
    host_email: 'ganesh.naik@stayinkonkan.com',
    host_phone: '+91 98901 56789',
    host_languages: 'Marathi, Malvani, Konkani & English',
    amenities: JSON.stringify(['Private Beach Cliff Access', 'Dolphin Safari Assistance', 'Authentic Goan/Malvani Food', 'Sunset View Deck', 'Power Backup'])
  },
  'prop_11': {
    host_name: 'Vishwas Gawde',
    host_email: 'vishwas.gawde@stayinkonkan.com',
    host_phone: '+91 91582 12345',
    host_languages: 'Marathi, Malvani & Hindi',
    amenities: JSON.stringify(['Kunkeshwar Temple Walking Distance', 'Pure Veg Konkani Meals', 'Spacious Terrace', 'Hot Water', 'Quiet Courtyard'])
  },
  'prop_12': {
    host_name: 'Suresh Bapat',
    host_email: 'suresh.bapat@stayinkonkan.com',
    host_phone: '+91 94220 67890',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Suvarna Ganesh Temple Proximity', 'Plush Lawns & Garden', 'Air Conditioning', 'Home Cooked Ukadiche Modak', 'Free Parking'])
  },
  'prop_13': {
    host_name: 'Mohan Kasarkod',
    host_email: 'mohan.kasarkod@stayinkonkan.com',
    host_phone: '+91 98224 23456',
    host_languages: 'Marathi, Malvani & Hindi',
    amenities: JSON.stringify(['Turtle Hatching Festival Guide', 'Authentic Village Eco Stay', 'Homely Sol Kadhi & Rice', 'Hot Water', 'Peaceful Courtyard'])
  },
  'prop_14': {
    host_name: 'Jayant Bhosle',
    host_email: 'jayant.bhosle@stayinkonkan.com',
    host_phone: '+91 94238 34567',
    host_languages: 'Marathi, Malvani, Hindi & English',
    amenities: JSON.stringify(['Royal Heritage Wada Architecture', 'Sawantwadi Toys Workshop Tour', 'Malvani Mutton/Fish Thali', 'Free Wi-Fi', 'Hot Water'])
  },
  'prop_15': {
    host_name: 'Vilas Deshmukh',
    host_email: 'vilas.deshmukh@stayinkonkan.com',
    host_phone: '+91 98901 89012',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['White Sand Aaravi Beach View', 'Swimming Pool', 'Open Air Dining', 'Air Conditioning', 'Volleyball Court'])
  },
  'prop_16': {
    host_name: 'Avinash Kulkarni',
    host_email: 'avinash.kulkarni@stayinkonkan.com',
    host_phone: '+91 91582 45678',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Riverfront Boat Ride Access', 'Crocodile Safari Guide', 'Riverside Deck', 'Fresh Konkan Breakfast', 'Air Conditioning'])
  },
  'prop_17': {
    host_name: 'Sachin Kambli',
    host_email: 'sachin.kambli@stayinkonkan.com',
    host_phone: '+91 94220 90123',
    host_languages: 'Marathi, Malvani, Hindi & English',
    amenities: JSON.stringify(['Chivla Beach Front Row', 'Authentic Surmai & Bangda Fry', 'Free Wi-Fi', 'Solar Water Heater', 'Sea View Balcony'])
  },
  'prop_18': {
    host_name: 'Nitin Chaudhari',
    host_email: 'nitin.chaudhari@stayinkonkan.com',
    host_phone: '+91 98224 56789',
    host_languages: 'Marathi, Hindi & English',
    amenities: JSON.stringify(['Close to Varsoli Water Sports', 'Private Garden Lawn', 'Barbecue & Music System', 'Air Conditioning', 'Free Parking'])
  },
  'prop_19': {
    host_name: 'Prabhakar Bhat',
    host_email: 'prabhakar.bhat@stayinkonkan.com',
    host_phone: '+91 94238 01234',
    host_languages: 'Marathi, Malvani & Hindi',
    amenities: JSON.stringify(['Crescent Beach View', 'Shiva Temple Proximity', 'Pure Veg & Non-Veg Kitchens', 'Hot Water', 'Large Veranda'])
  },
  'prop_20': {
    host_name: 'Santosh More',
    host_email: 'santosh.more@stayinkonkan.com',
    host_phone: '+91 98901 34567',
    host_languages: 'Marathi & Hindi',
    amenities: JSON.stringify(['Valley & Waterfall View', 'Organic Farm Vegetable Tour', 'Campfire Night', 'Homemade Konkani Breakfast', 'Free Parking'])
  }
};

const defaultHost = {
  host_name: 'Kuldeep Mahajan',
  host_email: 'kuldeep.mahajan@stayinkonkan.com',
  host_phone: '+91 91234 56789',
  host_languages: 'Marathi, Malvani, Hindi & English',
  amenities: JSON.stringify(['Air Conditioning', 'Free High-Speed Wi-Fi', 'Attached Private Bathroom', 'Hot Water Supply', 'Konkani Home-Cooked Meals', 'Free Parking'])
};

async function seedData() {
  console.log('🌱 Starting properties table dummy data population...');

  // Ensure columns exist first
  try {
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS amenities TEXT;`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_name VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_email VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_phone VARCHAR(255);`);
    await query(`ALTER TABLE properties ADD COLUMN IF NOT EXISTS host_languages VARCHAR(255);`);
  } catch (e) {
    console.warn('Column ensure warning:', e.message);
  }

  const allRes = await query('SELECT id, title FROM properties;');
  const rows = allRes.rows || [];
  console.log(`Found ${rows.length} total properties in table.`);

  let updatedCount = 0;
  for (const p of rows) {
    const pId = p.id;
    const dummy = dummyHostMap[pId] || defaultHost;

    const updateSql = `
      UPDATE properties
      SET 
        host_name = $1,
        host_email = $2,
        host_phone = $3,
        host_languages = $4,
        amenities = $5
      WHERE id = $6 OR LOWER(id) = LOWER($6)
      RETURNING id, title, host_name, host_phone;
    `;

    try {
      const uRes = await query(updateSql, [
        dummy.host_name,
        dummy.host_email,
        dummy.host_phone,
        dummy.host_languages,
        dummy.amenities,
        pId
      ]);
      if (uRes && uRes.rows && uRes.rows.length > 0) {
        console.log(`✅ Updated ${pId} (${p.title}) -> Host: ${dummy.host_name} (${dummy.host_phone})`);
        updatedCount++;
      } else {
        console.warn(`⚠️ Could not update ${pId}`);
      }
    } catch (err) {
      console.error(`❌ Error updating ${pId}:`, err.message);
    }
  }

  console.log(`🎉 Finished! Successfully populated host details & amenities for ${updatedCount}/${rows.length} properties.`);
  process.exit(0);
}

seedData().catch(e => {
  console.error('Migration script failed:', e);
  process.exit(1);
});

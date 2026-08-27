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

async function checkPropertyImages() {
  try {
    console.log('🔍 Checking image columns for properties in PostgreSQL...');

    const res = await pool.query(`SELECT id, title, image_url, facility1_image, facility2_image, images FROM properties ORDER BY created_at DESC;`);
    console.log('📋 Properties in DB with Image Data:');
    res.rows.forEach(p => {
      console.log(` - ID: ${p.id} | Title: "${p.title}" | image_url: "${p.image_url}" | facility1_image: "${p.facility1_image}" | images type: ${typeof p.images}`);
    });

  } catch (err) {
    console.error('❌ Error checking images:', err);
  } finally {
    await pool.end();
  }
}

checkPropertyImages();

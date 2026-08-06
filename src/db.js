import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const poolConfig = connectionString
  ? {
      connectionString,
      ssl: { rejectUnauthorized: false }
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: parseInt(process.env.PGPORT || '5432', 10),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || '',
      database: process.env.PGDATABASE || 'stay_in_konkan',
      ssl: false
    };

export const pool = new Pool(poolConfig);

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://twogullikwakapmsyrvw.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3b2d1bGxpa3dha2FwbXN5cnZ3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDU0NjQ1OSwiZXhwIjoyMTAwMTIyNDU5fQ.XEzd5sP5iyLA0KboDxWKNd5otU4epO5BrLK4oLR4mPk';

const detectTable = (text) => {
  const lower = text.toLowerCase();
  if (lower.includes('properties')) return 'properties';
  if (lower.includes('host_applications')) return 'host_applications';
  if (lower.includes('users')) return 'users';
  if (lower.includes('bookings')) return 'bookings';
  if (lower.includes('contact_messages')) return 'contact_messages';
  if (lower.includes('newsletter_subscribers')) return 'newsletter_subscribers';
  if (lower.includes('cancellations')) return 'cancellations';
  return '';
};

export const query = async (text, params = []) => {
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    const lower = text.toLowerCase().trim();
    const tableName = detectTable(text);

    if (tableName) {
      const headers = {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      };

      try {
        // 1. SELECT Query Fallback with Parameter Filtering
        if (lower.startsWith('select')) {
          const restUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
          const restRes = await fetch(restUrl, { headers });
          if (restRes.ok) {
            let rows = await restRes.json();

            // Filter rows if parameters are supplied for user_email, host_email, or id/booking_id
            if (Array.isArray(rows) && params && params.length > 0 && params[0]) {
              const p0 = String(params[0]).toLowerCase().trim();
              if (lower.includes('where') || lower.includes('= $1')) {
                if (lower.includes('user_email')) {
                  rows = rows.filter(r => {
                    const uEmail = (r.user_email || r.guest_email || r.email || '').toLowerCase().trim();
                    const uId = (r.id || r.booking_id || '').toLowerCase().trim();
                    return uEmail === p0 || uId === p0;
                  });
                } else if (lower.includes('host_email')) {
                  rows = rows.filter(r => {
                    const hEmail = (r.host_email || r.owner_email || r.email || '').toLowerCase().trim();
                    const hId = (r.id || r.booking_id || '').toLowerCase().trim();
                    return hEmail === p0 || hId === p0;
                  });
                } else if (lower.includes('id = $1') || lower.includes('email = $1')) {
                  rows = rows.filter(r => {
                    const rEmail = (r.email || r.user_email || r.applicant_email || '').toLowerCase().trim();
                    const rId = (r.id || r.booking_id || r.application_id || '').toLowerCase().trim();
                    return rEmail === p0 || rId === p0;
                  });
                }
              }
            }

            return { rows, rowCount: rows.length };
          }
        }

        // 2. INSERT Host Applications Fallback
        if (lower.startsWith('insert into host_applications')) {
          const body = {
            id: params[0] || undefined,
            application_id: params[1] || undefined,
            applicant_name: params[2] || undefined,
            applicant_email: params[3] || undefined,
            phone: params[4] || undefined,
            location: params[5] || undefined,
            property_type: params[6] || undefined,
            description: params[7] || undefined,
            custom_property_name: params[8] || undefined,
            property_doc_name: params[9] || undefined,
            gst_doc_name: params[10] || undefined,
            identity_doc_name: params[11] || undefined,
            status: params[12] || 'pending'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/host_applications`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 3. INSERT Properties Fallback
        if (lower.startsWith('insert into properties')) {
          const body = {
            id: params[0] || undefined,
            name: params[1] || undefined,
            title: params[2] || undefined,
            host: params[3] || undefined,
            host_email: params[4] || undefined,
            host_phone: params[5] || undefined,
            location: params[6] || undefined,
            price: params[7] ? String(params[7]) : '2999',
            price_per_night: params[8] || 2999,
            type: params[9] || 'homestay',
            status: params[10] || 'pending',
            description: params[11] || ''
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 4. INSERT Bookings Fallback
        if (lower.startsWith('insert into bookings')) {
          const body = {
            id: params[0] || undefined,
            booking_id: params[1] || undefined,
            user_email: params[2] || undefined,
            user_name: params[3] || undefined,
            user_phone: params[4] || undefined,
            property_name: params[5] || undefined,
            check_in: params[6] || undefined,
            check_out: params[7] || undefined,
            guests: params[8] ? String(params[8]) : '2 Guests',
            total_amount: params[9] ? String(params[9]) : '0',
            paid_amount: params[10] ? String(params[10]) : '0',
            remaining_amount: params[11] ? String(params[11]) : '0',
            payment_id: params[12] || undefined,
            status: params[13] || 'confirmed'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 5. INSERT Contact Messages Fallback
        if (lower.startsWith('insert into contact_messages')) {
          const body = {
            id: params[0] || undefined,
            name: params[1] || undefined,
            email: params[2] || undefined,
            phone: params[3] || undefined,
            subject: params[4] || undefined,
            message: params[5] || undefined
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 6. UPDATE Host Applications Fallback
        if (lower.startsWith('update host_applications')) {
          const status = params[0];
          const id = params[1];
          const email = params[2] || id;
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/host_applications?or=(id.eq.${id},applicant_email.eq.${email})`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status })
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 7. DELETE Host Applications Fallback
        if (lower.startsWith('delete from host_applications')) {
          const id = params[0];
          const email = params[1] || id;
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/host_applications?or=(id.eq.${id},applicant_email.eq.${email})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }
      } catch (restErr) {
        console.warn('Supabase REST fallback warning:', restErr.message);
      }
    }

    return { rows: [], rowCount: 0 };
  }
};

pool.on('error', (err) => {
  console.warn('PostgreSQL pool note:', err.message);
});

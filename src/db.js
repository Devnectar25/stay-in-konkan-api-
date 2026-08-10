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
  const fromMatch = lower.match(/\bfrom\s+([a-z0-9_]+)/);
  if (fromMatch && fromMatch[1]) {
    const mainTable = fromMatch[1].trim();
    if (['properties', 'host_applications', 'users', 'bookings', 'contact_messages', 'newsletter_subscribers', 'cancellations', 'reviews', 'wishlists'].includes(mainTable)) {
      return mainTable;
    }
  }

  if (lower.includes('bookings')) return 'bookings';
  if (lower.includes('properties')) return 'properties';
  if (lower.includes('host_applications')) return 'host_applications';
  if (lower.includes('users')) return 'users';
  if (lower.includes('contact_messages')) return 'contact_messages';
  if (lower.includes('newsletter_subscribers')) return 'newsletter_subscribers';
  if (lower.includes('cancellations')) return 'cancellations';
  if (lower.includes('reviews')) return 'reviews';
  if (lower.includes('wishlists')) return 'wishlists';
  return '';
};

export const query = async (text, params = []) => {
  try {
    const res = await pool.query(text, params);
    // If pg pool returns data, use it directly
    if (res && res.rows && res.rows.length > 0) {
      return res;
    }
    // If pg pool returns 0 rows on a SELECT for properties, fall through to Supabase REST
    // (pg pool may be connected to a different/empty local database)
    const lowerCheck = text.toLowerCase().trim();
    if (lowerCheck.startsWith('select') && lowerCheck.includes('properties')) {
      throw new Error('pg_empty_fallthrough');
    }
    return res;
  } catch (err) {
    const lower = text.toLowerCase().trim();
    if (lower.includes('count(') || lower.includes('sum(') || lower.includes('group by')) {
      throw err;
    }
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
          // In-memory properties JOIN users fallback
          if (lower.includes('join') && tableName === 'properties') {
            const propsRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?select=id,name,title,host,host_email,host_phone,location,price,type,status,description,rating,reviews_count,image,image_url,facility1_image,facility2_image,facility3_image,rooms,created_at`, { headers });
            const usersRes = await fetch(`${SUPABASE_URL}/rest/v1/users?select=id,full_name,email`, { headers });
            if (propsRes.ok && usersRes.ok) {
              const props = await propsRes.json();
              const users = await usersRes.json();
              let joined = props.map(p => {
                const user = users.find(u => (u.email || '').toLowerCase().trim() === (p.host_email || '').toLowerCase().trim());
                return {
                  ...p,
                  owner_name: user ? user.full_name : (p.host || 'Registered Host'),
                  owner_email: user ? user.email : (p.host_email || '')
                };
              });

              const statusMatch = lower.match(/status\s*=\s*\$(\d+)/);
              if (statusMatch && statusMatch[1]) {
                const statusIdx = parseInt(statusMatch[1], 10) - 1;
                const statusVal = params[statusIdx];
                if (statusVal && statusVal !== 'all') {
                  joined = joined.filter(r => String(r.status).toLowerCase().trim() === String(statusVal).toLowerCase().trim());
                }
              }

              return { rows: joined, rowCount: joined.length };
            }
          }

          let selectCols = '*';
          const match = text.match(/select\s+(.+?)\s+from/i);
          if (match && match[1]) {
            const cols = match[1].split(',').map(c => c.trim().split(/\s+/).pop());
            const validCols = cols.filter(c => c && c !== '*' && !c.includes('('));
            if (validCols.length > 0) {
              selectCols = validCols.join(',');
            }
          }
          if (selectCols === '*' && tableName === 'users') {
            selectCols = 'id,full_name,email,phone,role,provider,verified,created_at';
          } else if (selectCols === '*' && tableName === 'properties') {
            selectCols = 'id,name,title,host,host_email,host_phone,location,price,type,status,description,rating,reviews_count,image,image_url,facility1_image,facility2_image,facility3_image,rooms,created_at';
          }

          // Build REST URL with optional filters for properties status
          let restUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=${selectCols}`;
          if (tableName === 'properties' && lower.includes("!= 'rejected'")) {
            restUrl += `&status=neq.rejected`;
          }
          const restRes = await fetch(restUrl, { headers });
          if (restRes.ok) {
            let rows = await restRes.json();

            // Filter rows if parameters/roles are supplied
            if (Array.isArray(rows)) {
              if (params && params.length > 0 && params[0] !== undefined) {
                const p0 = String(params[0]).toLowerCase().trim();
                if (lower.includes('where') || lower.includes('$1')) {
                  rows = rows.filter(r => {
                    const rEmail = (r.email || r.user_email || r.applicant_email || r.guest_email || '').toLowerCase().trim();
                    const rId = (r.id || r.booking_id || r.application_id || '').toLowerCase().trim();
                    const rHostEmail = (r.host_email || r.owner_email || '').toLowerCase().trim();
                    return rEmail === p0 || rId === p0 || rHostEmail === p0;
                  });
                }
              }

              // Filter by role parameter (e.g. role = $2)
              if (params && params.length > 1 && params[1] !== undefined && (lower.includes('role = $2') || lower.includes('role=$2'))) {
                const p1 = String(params[1]).toLowerCase().trim();
                rows = rows.filter(r => r && String(r.role || '').toLowerCase() === p1);
              }

              // Filter by hardcoded roles (e.g. role = 'subadmin' OR role = 'admin')
              if (lower.includes("role = 'subadmin'") || lower.includes("role='subadmin'") || lower.includes("role = 'admin'") || lower.includes("role='admin'")) {
                rows = rows.filter(r => {
                  const rRole = String(r.role || '').toLowerCase();
                  const matchSubadmin = lower.includes("role = 'subadmin'") || lower.includes("role='subadmin'");
                  const matchAdmin = lower.includes("role = 'admin'") || lower.includes("role='admin'");
                  if (matchSubadmin && matchAdmin) {
                    return rRole === 'subadmin' || rRole === 'admin';
                  } else if (matchSubadmin) {
                    return rRole === 'subadmin';
                  } else if (matchAdmin) {
                    return rRole === 'admin';
                  }
                  return true;
                });
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
            title: params[2] || params[1] || undefined,
            host: params[3] || undefined,
            host_email: params[4] || undefined,
            host_phone: params[5] || undefined,
            location: params[6] || undefined,
            price: params[7] ? String(params[7]) : undefined,
            type: params[8] || 'homestay',
            status: params[9] || 'pending',
            image: params[10] || undefined,
            image_url: params[11] || undefined,
            description: params[12] || '',
            rating: params[13] ? Number(params[13]) : 5.0,
            reviews_count: params[14] ? Number(params[14]) : 0,
            rooms: (() => {
              if (!params[15]) return [];
              if (typeof params[15] === 'string') {
                try { return JSON.parse(params[15]); } catch (e) { return []; }
              }
              return params[15];
            })(),
            facility1_image: params[16] || null,
            facility2_image: params[17] || null,
            facility3_image: params[18] || null
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase property insert error:', restRes.status, errText);
          }
        }

        // 4. INSERT Bookings Fallback
        if (lower.startsWith('insert into bookings')) {
          const body = {
            id: params[0] || undefined,
            booking_id: params[1] || params[0] || undefined,
            user_email: params[2] || undefined,
            user_name: params[3] || undefined,
            user_phone: params[4] || undefined,
            property_name: params[6] || params[5] || 'Konkan Homestay',
            check_in: params[9] || undefined,
            check_out: params[10] || undefined,
            guests: params[11] ? String(params[11]) : '2 Guests',
            total_amount: params[12] ? Number(params[12]) : 0,
            paid_amount: params[13] ? Number(params[13]) : 0,
            remaining_amount: params[14] ? Number(params[14]) : 0,
            payment_id: params[15] || undefined,
            status: params[16] || 'pending'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase booking insert error:', restRes.status, errText);
          }
        }

        // 4.5 INSERT Cancellations Fallback
        if (lower.startsWith('insert into cancellations')) {
          const body = {
            id: params[0] || undefined,
            booking_id: params[1] || undefined,
            user_email: params[2] || undefined,
            user_name: params[3] || undefined,
            property_name: params[4] || 'Konkan Stay',
            check_in: params[5] || undefined,
            check_out: params[6] || undefined,
            paid_amount: params[7] ? Number(params[7]) : 0,
            refund_amount: params[8] ? Number(params[8]) : 0,
            refund_percentage: params[9] ? Number(params[9]) : 0,
            notice_days: params[10] ? Number(params[10]) : 0,
            cancellation_reason: params[11] || 'Guest requested cancellation',
            status: params[12] || 'pending',
            refund_status: 'pending'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/cancellations`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase cancellation insert error:', restRes.status, errText);
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

        // 7.1 DELETE Properties Fallback
        if (lower.startsWith('delete from properties')) {
          const propId = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?or=(id.eq.${encodeURIComponent(propId)},name.eq.${encodeURIComponent(propId)},title.eq.${encodeURIComponent(propId)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 7.2 DELETE Bookings Fallback
        if (lower.startsWith('delete from bookings')) {
          const bookingId = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?or=(id.eq.${encodeURIComponent(bookingId)},booking_id.eq.${encodeURIComponent(bookingId)},payment_id.eq.${encodeURIComponent(bookingId)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 7.3 DELETE Cancellations Fallback
        if (lower.startsWith('delete from cancellations')) {
          const cancId = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/cancellations?or=(id.eq.${encodeURIComponent(cancId)},booking_id.eq.${encodeURIComponent(cancId)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 7.5 DELETE Contact Messages Fallback
        if (lower.startsWith('delete from contact_messages')) {
          const id = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 8. DELETE Users Fallback
        if (lower.startsWith('delete from users')) {
          const emailOrId = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/users?or=(email.eq.${encodeURIComponent(emailOrId)},id.eq.${encodeURIComponent(emailOrId)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 9. INSERT / UPSERT Users Fallback
        if (lower.startsWith('insert into users')) {
          const body = {
            id: params[0] || undefined,
            full_name: params[1] || undefined,
            email: params[2] || undefined,
            avatar_url: params[3] || null,
            phone: params[4] || null,
            role: params[5] || 'guest',
            provider: params[6] || 'email',
            verified: params[7] !== undefined ? params[7] : false,
            password_hash: params[8] || null
          };

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase user insert/upsert error:', restRes.status, errText);
          }
        }

        // 10. UPDATE Users Fallback
        if (lower.startsWith('update users')) {
          const val = params[0];
          const emailOrId = params[1];
          const isRoleUpdate = lower.includes('set role');
          const isVerifiedUpdate = lower.includes('set verified');

          const updateBody = {};
          if (isRoleUpdate) updateBody.role = val;
          if (isVerifiedUpdate) updateBody.verified = val;

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/users?or=(email.eq.${encodeURIComponent(emailOrId)},id.eq.${encodeURIComponent(emailOrId)})`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify(updateBody)
          });
        }

        // 10.2 UPDATE Properties Fallback
        if (lower.startsWith('update properties')) {
          const updateBody = {};
          
          // Parse SET clause parameters across newlines
          const setClauseMatch = lower.match(/set\s+([\s\S]+?)\s+where/i);
          if (setClauseMatch && setClauseMatch[1]) {
            const clauses = setClauseMatch[1].split(',').map(c => c.trim());
            clauses.forEach(clause => {
              const parts = clause.split('=').map(p => p.trim());
              if (parts.length === 2) {
                const colName = parts[0].replace(/"/g, '').toLowerCase();
                const valPlaceholder = parts[1];
                const paramMatch = valPlaceholder.match(/\$(\d+)/);
                if (paramMatch && paramMatch[1]) {
                  const paramIdx = parseInt(paramMatch[1], 10) - 1;
                  const val = params[paramIdx];
                  
                  let supabaseCol = colName;
                  if (colName === 'amenities') return;
                  if (colName === 'price_per_night') supabaseCol = 'price';
                  if (colName === 'facilityimage1' || colName === 'facility1_image') supabaseCol = 'facility1_image';
                  if (colName === 'facilityimage2' || colName === 'facility2_image') supabaseCol = 'facility2_image';
                  if (colName === 'facilityimage3' || colName === 'facility3_image') supabaseCol = 'facility3_image';
                  
                  if (supabaseCol === 'rooms') {
                    try {
                      updateBody.rooms = typeof val === 'string' ? JSON.parse(val) : val;
                    } catch(e) {
                      updateBody.rooms = val;
                    }
                  } else {
                    updateBody[supabaseCol] = val;
                  }
                }
              }
            });
          }

          // Extract propId from WHERE clause or parameter matching
          let propId = params[params.length - 1];
          const whereClauseMatch = lower.match(/where\s+(.+)$/i);
          if (whereClauseMatch && whereClauseMatch[1]) {
            const parts = whereClauseMatch[1].split('=').map(p => p.trim());
            if (parts.length === 2) {
              const valPlaceholder = parts[1].replace(/lower\((.*?)\)/i, '$1').trim();
              const paramMatch = valPlaceholder.match(/\$(\d+)/);
              if (paramMatch && paramMatch[1]) {
                const paramIdx = parseInt(paramMatch[1], 10) - 1;
                propId = params[paramIdx];
              }
            }
          }

          Object.keys(updateBody).forEach(key => {
            if (updateBody[key] === undefined || updateBody[key] === null) delete updateBody[key];
          });

          if (propId) {
            console.log('[db.js UPDATE fallback] propId:', propId, 'updateBody keys:', Object.keys(updateBody));
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/properties?or=(id.eq.${encodeURIComponent(propId)},name.eq.${encodeURIComponent(propId)},title.eq.${encodeURIComponent(propId)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              console.log('[db.js UPDATE fallback] res rows count:', Array.isArray(rows) ? rows.length : 1);
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: Array.isArray(rows) ? rows.length : 1 };
            } else {
              console.log('[db.js UPDATE fallback] restRes not ok:', restRes.status, await restRes.text());
            }
          }
        }

        // 10.3 UPDATE Bookings Fallback
        if (lower.startsWith('update bookings')) {
          const status = params[0];
          const bookingId = params[1];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?or=(id.eq.${encodeURIComponent(bookingId)},booking_id.eq.${encodeURIComponent(bookingId)},payment_id.eq.${encodeURIComponent(bookingId)})`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ status })
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 10.4 UPDATE Cancellations Fallback
        if (lower.startsWith('update cancellations')) {
          let updateBody = {};
          let cancId = '';

          if (lower.includes('refund_status')) {
            updateBody = {
              refund_status: params[0] || 'refunded',
              refund_txn_id: params[1] || undefined,
              refund_amount: params[2] ? Number(params[2]) : undefined
            };
            cancId = params[3] || params[0];
          } else {
            updateBody = {
              status: params[0]
            };
            cancId = params[1];
          }

          Object.keys(updateBody).forEach(k => {
            if (updateBody[k] === undefined || updateBody[k] === null) delete updateBody[k];
          });

          if (cancId) {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/cancellations?or=(id.eq.${encodeURIComponent(cancId)},booking_id.eq.${encodeURIComponent(cancId)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          }
        }

        // 10.5 UPDATE Contact Messages Fallback
        if (lower.startsWith('update contact_messages')) {
          const val = params[0];
          const id = params[1];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/contact_messages?id=eq.${encodeURIComponent(id)}`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ unread: val })
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 11. INSERT Into Reviews Fallback
        if (lower.startsWith('insert into reviews')) {
          const body = {
            id: params[0] || undefined,
            property_id: params[1] || undefined,
            property_name: params[2] || 'Konkan Stay',
            guest_name: params[3] || 'Guest',
            user_email: params[4] || null,
            rating: params[5] ? Number(params[5]) : 5,
            comment: params[6] || '',
            status: params[7] || 'published'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase review insert error:', restRes.status, errText);
          }
        }

        // 12. DELETE Reviews Fallback
        if (lower.startsWith('delete from reviews')) {
          const id = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews?id=eq.${encodeURIComponent(id)}`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 13. INSERT Into Newsletter Subscribers Fallback
        if (lower.startsWith('insert into newsletter_subscribers')) {
          const body = {
            id: params[0] || undefined,
            email: params[1] || undefined
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase newsletter subscribe insert error:', restRes.status, errText);
          }
        }

        // 14. DELETE Newsletter Subscriber Fallback
        if (lower.startsWith('delete from newsletter_subscribers')) {
          const idOrEmail = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?or=(id.eq.${encodeURIComponent(idOrEmail)},email.eq.${encodeURIComponent(idOrEmail)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 15. SELECT Wishlists Fallback
        if (lower.startsWith('select') && tableName === 'wishlists') {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists?select=*`, { headers });
          if (restRes.ok) {
            let rows = await restRes.json();
            if (Array.isArray(rows) && params && params.length > 0) {
              if (params[0]) {
                const userEmail = String(params[0]).toLowerCase().trim();
                rows = rows.filter(r => (r.user_email || '').toLowerCase().trim() === userEmail);
              }
              if (params[1]) {
                const propertyId = String(params[1]).trim();
                rows = rows.filter(r => String(r.property_id).trim() === propertyId);
              }
            }
            return { rows, rowCount: rows.length };
          }
        }

        // 16. INSERT Into Wishlists Fallback
        if (lower.startsWith('insert into wishlists')) {
          const body = {
            id: params[0] || undefined,
            user_email: params[1] || undefined,
            user_name: params[2] || undefined,
            property_id: params[3] || undefined,
            property_title: params[4] || undefined,
            property_image: params[5] || null,
            property_location: params[6] || null,
            property_price: params[7] ? Number(params[7]) : null
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase wishlist insert error:', restRes.status, errText);
          }
        }

        // 17. DELETE From Wishlists Fallback
        if (lower.startsWith('delete from wishlists')) {
          const id = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists?id=eq.${encodeURIComponent(id)}`, {
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

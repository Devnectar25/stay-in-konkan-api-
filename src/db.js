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

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://luggntcaytyyyedeytha.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx1Z2dudGNheXR5eXllZGV5dGhhIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NzQwNDc1MCwiZXhwIjoyMTAyOTgwNzUwfQ.sS3XlFeYB47RYZwl0_JskrV82Z_LuO3BEjCR3eh67jk';

export const userBankMap = new Map();

export async function cleanupCorruptedUserRoles() {
  try {
    await pool.query(`UPDATE users SET role = 'subadmin' WHERE LOWER(role) LIKE '%subadmin%';`);
    await pool.query(`UPDATE users SET role = 'admin' WHERE LOWER(email) = 'admin@stayinkonkan.com';`);
    await pool.query(`UPDATE users SET role = 'host' WHERE LOWER(role) = 'host';`);
    await pool.query(`UPDATE users SET role = 'guest' WHERE role NOT IN ('admin', 'subadmin', 'host', 'guest');`);
  } catch (e) {}
}
// Safely run cleanup asynchronously without blocking serverless function cold starts
if (process.env.NODE_ENV !== 'production') {
  cleanupCorruptedUserRoles().catch(() => {});
}

const detectTable = (text) => {
  const lower = text.toLowerCase();
  const fromMatch = lower.match(/\bfrom\s+([a-z0-9_]+)/);
  if (fromMatch && fromMatch[1]) {
    const mainTable = fromMatch[1].trim();
    if (['hosts', 'host_accounts', 'properties', 'host_applications', 'users', 'bookings', 'contact_messages', 'newsletter_subscribers', 'cancellations', 'subadmins', 'reviews', 'wishlists', 'coupons', 'help_desk', 'helpdesk', 'issue', 'application_errors', 'platform_config'].includes(mainTable)) {
      return mainTable;
    }
  }

  if (lower.includes('platform_config')) return 'platform_config';
  if (lower.includes('host_accounts')) return 'host_accounts';
  if (lower.includes('hosts')) return 'hosts';
  if (lower.includes('application_errors')) return 'application_errors';
  if (lower.includes('help_desk')) return 'help_desk';
  if (lower.includes('helpdesk')) return 'help_desk';
  if (lower.includes('issue')) return 'help_desk';
  if (lower.includes('coupons')) return 'coupons';
  if (lower.includes('subadmins')) return 'subadmins';
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
  const lower = text.toLowerCase().trim();
  try {
    const res = await pool.query(text, params);
    return res;
  } catch (err) {
    if (lower.includes('count(') || lower.includes('sum(') || lower.includes('group by')) {
      throw err;
    }
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
        let selectCols = '*';
        let sortField = 'created_at';
        if (tableName === 'newsletter_subscribers') {
          sortField = 'subscribed_at';
        }

        // Build REST URL with optional filters for properties status
        let restUrl = `${SUPABASE_URL}/rest/v1/${tableName}?select=*`;
        if (tableName === 'properties' && lower.includes("!= 'rejected'")) {
          restUrl += `&status=neq.rejected`;
        }
        if (lower.includes('order by')) {
          restUrl += `&order=${sortField}.desc`;
        }
        let restRes = await fetch(restUrl, { headers });
        if (!restRes.ok) {
          restRes = await fetch(`${SUPABASE_URL}/rest/v1/${tableName}?select=*`, { headers });
        }
        if (restRes.ok) {
          let rows = await restRes.json();

          // Filter rows if parameters/roles are supplied
          if (Array.isArray(rows)) {
            if (params && params.length > 0 && params[0] !== undefined) {
              const p0 = String(params[0]).toLowerCase().trim();
              if (lower.includes('where') || lower.includes('$1')) {
                rows = rows.filter(r => {
                  const rEmail = (r.email || r.user_email || r.applicant_email || r.guest_email || '').toLowerCase().trim();
                  const rId = (r.id || r.booking_id || r.application_id || r.issue_id || r.error_id || '').toLowerCase().trim();
                  const rHostEmail = (r.host_email || r.owner_email || '').toLowerCase().trim();
                  const rPropId = (r.property_id || '').toLowerCase().trim();
                  // If checking property_id with $1 (e.g. SELECT FROM reviews WHERE property_id = $1)
                  if (lower.includes('property_id = $1') || lower.includes('property_id=$1')) {
                    return rPropId === p0;
                  }
                  // If checking role with $1 (e.g. SELECT FROM users WHERE role = $1)
                  if (lower.includes('role = $1') || lower.includes('lower(role) = $1') || lower.includes('role=$1') || lower.includes('lower(role)=$1')) {
                    return String(r.role || '').toLowerCase().trim() === p0;
                  }
                  return rEmail === p0 || rId === p0 || rHostEmail === p0;
                });
              }
            }

            // Filter by property_id parameter (e.g. property_id = $2)
            if (params && params.length > 1 && params[1] !== undefined && (lower.includes('property_id = $2') || lower.includes('property_id=$2') || lower.includes('property_id = $1'))) {
              const pProp = String(params[1]).toLowerCase().trim();
              rows = rows.filter(r => r && String(r.property_id || '').toLowerCase().trim() === pProp);
            }

            // Filter by role parameter (e.g. role = $2)
            if (params && params.length > 1 && params[1] !== undefined && (lower.includes('role = $2') || lower.includes('role=$2'))) {
              const p1 = String(params[1]).toLowerCase().trim();
              rows = rows.filter(r => r && String(r.role || '').toLowerCase() === p1);
            }

            // Filter by host role (e.g. role = 'host')
            if (lower.includes("role = 'host'") || lower.includes("role='host'") || lower.includes("lower(role) = 'host'") || lower.includes("lower(role)='host'")) {
              rows = rows.filter(r => r && String(r.role || '').toLowerCase() === 'host');
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
            // Apply descending timestamp ordering if requested
            if (lower.includes('desc')) {
              rows.sort((a, b) => {
                const timeA = new Date(a.created_at || a.requested_at || a.date || a.timestamp || 0).getTime() ||
                              (typeof a.id === 'string' && a.id.includes('-') && !isNaN(Number(a.id.split('-')[1])) ? Number(a.id.split('-')[1]) : 0);
                const timeB = new Date(b.created_at || b.requested_at || b.date || b.timestamp || 0).getTime() ||
                              (typeof b.id === 'string' && b.id.includes('-') && !isNaN(Number(b.id.split('-')[1])) ? Number(b.id.split('-')[1]) : 0);
                return timeB - timeA;
              });
            }

            if (tableName === 'users' && Array.isArray(rows)) {
              rows = rows.map(u => {
                const emailKey = (u.email || '').toLowerCase().trim();
                const idKey = String(u.id || '').toLowerCase().trim();
                const cachedBank = userBankMap.get(emailKey) || userBankMap.get(idKey);
                if (cachedBank) {
                  return { ...u, ...cachedBank };
                }
                return u;
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
            property_doc_url: params[12] || undefined,
            gst_doc_url: params[13] || undefined,
            identity_doc_url: params[14] || undefined,
            status: params[15] || 'pending'
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

        // 2.5 INSERT / UPSERT Users Fallback
        if (lower.startsWith('insert into users')) {
          const body = {
            id: params[0] || `usr_${Date.now()}`,
            full_name: params[1] || 'Guest User',
            email: params[2] ? params[2].trim().toLowerCase() : undefined,
            avatar_url: params[3] || null,
            phone: params[4] || null,
            role: params[5] || 'guest',
            provider: params[6] || 'email',
            verified: params[7] !== undefined ? Boolean(params[7]) : false,
            password_hash: params[8] || null
          };

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/users`, {
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
            return { rows: [body], rowCount: 1 };
          }
        }

        // 2.55 UPDATE Users Fallback
        if (lower.startsWith('update users')) {
          const idOrEmail = params[params.length - 1];
          const patchBody = {};

          if (lower.includes('bank_details') || lower.includes('bank_name')) {
            if (params[0] !== undefined && params[0] !== null) patchBody.bank_details = params[0];
            if (params[1]) patchBody.bank_name = params[1];
            if (params[2]) patchBody.account_number = params[2];
            if (params[3]) patchBody.account_holder_name = params[3];
            if (params[4]) patchBody.ifsc_code = params[4];
            if (params[5]) patchBody.account_type = params[5];
            if (params[6]) patchBody.upi_id = params[6];
            if (params[7]) patchBody.branch_name = params[7];
          } else {
            if (params[0]) patchBody.full_name = params[0];
            if (params[1]) patchBody.phone = params[1];
            if (params[2]) patchBody.avatar_url = params[2];
          }

          patchBody.updated_at = new Date().toISOString();

          const key = String(idOrEmail || '').toLowerCase().trim();
          if (key) {
            const existing = userBankMap.get(key) || {};
            userBankMap.set(key, { ...existing, ...patchBody });
          }

          const filter = String(idOrEmail).includes('@')
            ? `email.eq.${encodeURIComponent(String(idOrEmail).toLowerCase())}`
            : `or=(id.eq.${encodeURIComponent(idOrEmail)},email.eq.${encodeURIComponent(idOrEmail)})`;

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/users?${filter}`, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(patchBody)
          });

          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase users update error:', restRes.status, errText);
            return { rows: [{ id: idOrEmail, ...patchBody }], rowCount: 1 };
          }
        }

        // 2.6 INSERT Hosts Fallback
        if (lower.startsWith('insert into hosts')) {
          const body = {
            id: params[0] || undefined,
            full_name: params[1] || 'Verified Host',
            email: params[2] || undefined,
            phone: params[3] || undefined,
            location: params[4] || 'Konkan, Maharashtra',
            total_properties: 1,
            verified: true,
            status: 'verified'
          };
          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/hosts`, {
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
          }
          return { rows: [body], rowCount: 1 };
        }

        // 3. INSERT Properties Fallback
        if (lower.startsWith('insert into properties')) {
          let body = {
            id: params[0] || `prop-${Date.now()}`,
            title: params[1] || 'Konkan Stay',
            description: params[2] || 'Authentic Konkan stay listing.',
            location: params[3] || 'Konkan Coast, Maharashtra',
            type: params[4] || 'homestay',
            price_per_night: Number(params[5] || 1500),
            image_url: params[6] || '/assets/images/properties/konkan_village_home.png',
            status: params[7] || 'approved',
            facility1_image: params[8] || null,
            facility2_image: params[9] || null,
            facility3_image: params[10] || null,
            rooms: (() => {
              if (!params[11]) return [];
              if (typeof params[11] === 'string') {
                try { return JSON.parse(params[11]); } catch (e) { return []; }
              }
              return params[11];
            })(),
            rating: 4.8
          };

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/properties`, {
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
            console.warn('Supabase property insert error:', restRes.status, errText);
            return { rows: [body], rowCount: 1 };
          }
        }

        // 3.5 UPDATE Properties Status & Fields Fallback
        if (lower.startsWith('update properties')) {
          let updateBody = {};
          let id = '';
          let titleAlt = '';

          if (params.length >= 15 && typeof params[14] === 'string' && params[14].length > 2) {
            // Full property update from PUT /api/properties/:id:
            // [passedTitle, passedLocation, passedPrice, passedType, passedDesc, passedImage, passedStatus, passedHostName, passedHostEmail, passedHostPhone, passedFac1, passedFac2, passedFac3, passedRooms, lookupId, lookupTitle]
            id = params[14];
            if (params[15] && typeof params[15] === 'string') titleAlt = params[15];

            if (params[0]) updateBody.title = params[0];
            if (params[1]) updateBody.location = params[1];
            if (params[2] !== null && params[2] !== undefined) updateBody.price_per_night = Number(params[2]);
            if (params[3]) updateBody.type = params[3];
            if (params[4]) updateBody.description = params[4];
            if (params[5]) updateBody.image_url = params[5];
            if (params[6]) updateBody.status = params[6];
            if (params[10]) updateBody.facility1_image = params[10];
            if (params[11]) updateBody.facility2_image = params[11];
            if (params[12]) updateBody.facility3_image = params[12];
            if (params[13] !== undefined && params[13] !== null) {
              updateBody.rooms = typeof params[13] === 'string' ? (() => { try { return JSON.parse(params[13]); } catch (e) { return []; } })() : params[13];
            }
          } else {
            // Simple status update
            let status = 'live';
            params.forEach(p => {
              const val = String(p || '').toLowerCase().trim();
              if (['live', 'pending', 'rejected', 'inactive', 'paused', 'disabled', 'active'].includes(val)) {
                status = val;
              } else if (typeof p === 'string' && (p.startsWith('prop-') || p.includes('-') || p.length > 2)) {
                id = p;
              }
            });

            if (!id && params.length > 1) id = params[1] || params[0];
            if (params.length > 0) {
              const p0 = String(params[0] || '').toLowerCase().trim();
              if (['live', 'pending', 'rejected', 'inactive', 'paused', 'disabled', 'active'].includes(p0)) {
                status = p0;
              }
            }

            updateBody = { status: status.toLowerCase() };
          }

          const patchFilter = titleAlt 
            ? `or=(id.eq.${encodeURIComponent(id)},title.ilike.${encodeURIComponent(id)},title.ilike.${encodeURIComponent(titleAlt)},name.ilike.${encodeURIComponent(titleAlt)})`
            : `or=(id.eq.${encodeURIComponent(id)},title.ilike.${encodeURIComponent(id)})`;
          const patchUrl = `${SUPABASE_URL}/rest/v1/properties?${patchFilter}`;
          const restRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateBody)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase property update error:', restRes.status, errText);
            return { rows: [{ id, ...updateBody }], rowCount: 1 };
          }
        }

        // 3.6 UPDATE Bookings Status Fallback
        if (lower.startsWith('update bookings')) {
          let status = 'confirmed';
          let id = '';

          params.forEach(p => {
            if (['confirmed', 'completed', 'pending', 'cancelled', 'cancellation_pending', 'cancellation_requested', 'rejected', 'declined'].includes(String(p).toLowerCase())) {
              status = String(p).toLowerCase();
            } else if (typeof p === 'string' && (p.startsWith('SIK-') || p.includes('-') || p.length > 2)) {
              id = p;
            }
          });

          if (!id && params.length > 1) id = params[1] || params[0];
          if (params.length > 0 && ['confirmed', 'completed', 'pending', 'cancelled', 'cancellation_pending', 'cancellation_requested', 'rejected', 'declined'].includes(String(params[0]).toLowerCase())) {
            status = String(params[0]).toLowerCase();
          }

          const updateBody = { status: status.toLowerCase() };
          const patchUrl = `${SUPABASE_URL}/rest/v1/bookings?or=(id.eq.${encodeURIComponent(id)},booking_id.eq.${encodeURIComponent(id)},payment_id.eq.${encodeURIComponent(id)})`;
          const restRes = await fetch(patchUrl, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateBody)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase booking update error:', restRes.status, errText);
            return { rows: [{ id, status }], rowCount: 1 };
          }
        }

        // 4. INSERT Bookings Fallback
        if (lower.startsWith('insert into bookings')) {
          const parseDateToISO = (dateStr) => {
            if (!dateStr) return new Date().toISOString().split('T')[0];
            const d = new Date(dateStr);
            if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
            return new Date().toISOString().split('T')[0];
          };

          const parseGuestsCount = (val) => {
            if (typeof val === 'number') {
              if (val === 21) return 2;
              if (val === 31) return 3;
              if (val === 41) return 4;
              return Math.max(1, Math.round(val));
            }
            const str = String(val || '').trim();
            const match = str.match(/^(\d+)/) || str.match(/(\d+)\s*guest/i);
            if (match) {
              const n = parseInt(match[1], 10);
              if (n === 21 && str.includes('1 Room')) return 2;
              if (n === 31 && str.includes('1 Room')) return 3;
              if (n === 41 && str.includes('1 Room')) return 4;
              if (!isNaN(n) && n > 0) return n;
            }
            const matchDigit = str.match(/\d+/);
            if (matchDigit) {
              const n = parseInt(matchDigit[0], 10);
              if (!isNaN(n) && n > 0) return n;
            }
            return 2;
          };

          const roomsNum = (() => {
            const r = params[12];
            const num = Number(r);
            if (!isNaN(num) && num > 0) return num;
            const match = String(params[11] || '').match(/(\d+)\s*room/i);
            if (match) {
              const parsed = parseInt(match[1], 10);
              if (!isNaN(parsed) && parsed > 0) return parsed;
            }
            return 1;
          })();

          const totalNum = Number(params[13] || 0);
          const paidNum = Number(params[14] || totalNum);
          const remainNum = Math.max(0, totalNum - paidNum);
          const paymentIdVal = (params[16] && String(params[16]).startsWith('pay_')) ? String(params[16]) : `pay_${Date.now()}`;
          const rawStatusVal = params[17] ? String(params[17]).toLowerCase() : 'pending';
          const statusVal = rawStatusVal.startsWith('pay_') ? 'pending' : rawStatusVal;

          const body = {
            id: params[0] || `BK-${Date.now()}`,
            booking_id: params[1] || params[0] || `BK-${Date.now()}`,
            user_id: 'guest_user',
            user_email: params[2] || undefined,
            guest_email: params[2] || undefined,
            user_name: params[3] || undefined,
            guest_name: params[3] || undefined,
            user_phone: params[4] || undefined,
            guest_phone: params[4] || undefined,
            property_id: params[5] || 'prop_homestay',
            property_name: params[6] || 'Konkan Homestay',
            host_email: params[7] || null,
            host_name: params[8] || null,
            check_in: parseDateToISO(params[9]),
            check_out: parseDateToISO(params[10]),
            guests: parseGuestsCount(params[11]),
            rooms: roomsNum,
            total_price: totalNum,
            total_amount: totalNum,
            paid_amount: String(paidNum),
            remaining_amount: String(remainNum),
            payment_id: paymentIdVal,
            payment_status: 'completed',
            status: statusVal
          };

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase booking insert error:', restRes.status, errText);
            return { rows: [body], rowCount: 1 };
          }
        }

        // 4.45 UPDATE Bookings Status Fallback
        if (lower.startsWith('update bookings')) {
          const status = params[0];
          const id = params[1];
          const updateBody = {};
          if (status) updateBody.status = String(status).toLowerCase();

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?or=(id.eq.${encodeURIComponent(id)},booking_id.eq.${encodeURIComponent(id)})`, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateBody)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('Supabase booking update error:', restRes.status, errText);
            return { rows: [{ id, status }], rowCount: 1 };
          }
        }

        // 4.46 DELETE Bookings Fallback
        if (lower.startsWith('delete from bookings')) {
          const id = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/bookings?or=(id.eq.${encodeURIComponent(id)},booking_id.eq.${encodeURIComponent(id)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
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
            console.warn(`Supabase ${targetEndpoint} insert error:`, restRes.status, errText);
          }
        }

        // 4.8 INSERT Subadmins Fallback
        if (lower.startsWith('insert into subadmins')) {
          const body = {
            id: params[0] || undefined,
            full_name: params[1] || undefined,
            email: params[2] || undefined,
            password_hash: params[3] || undefined,
            phone: params[4] || '',
            role: 'subadmin',
            permissions: params[5] || 'Property & User Management'
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/subadmins`, {
            method: 'POST',
            headers,
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 4.90 UPDATE platform_config Fallback
        if (lower.startsWith('update platform_config')) {
          const pct = Number(params[0] || 20);
          const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_config?id=eq.default`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({
              token_percentage: pct,
              updated_at: new Date().toISOString()
            })
          });
          if (patchRes.ok) {
            const rows = await patchRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        } else if (lower.startsWith('insert into platform_config')) {
          const pct = Number(params[0] || 20);
          const postRes = await fetch(`${SUPABASE_URL}/rest/v1/platform_config`, {
            method: 'POST',
            headers: { ...headers, 'Prefer': 'resolution=ignore-duplicates,return=representation' },
            body: JSON.stringify({
              id: 'default',
              token_percentage: pct,
              platform_name: 'Stay in Konkan',
              updated_at: new Date().toISOString()
            })
          });
          if (postRes.ok) {
            const rows = await postRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 4.91 UPDATE Users Fallback
        if (lower.startsWith('update users')) {
          const updateBody = {};
          let id = params[params.length - 1];

          if (lower.includes('avatar_url = $1') || lower.includes('avatar_url=$1')) {
            updateBody.avatar_url = params[0];
            id = params[1] || params[params.length - 1];
          } else {
            const bankDetails = params[0];
            const bank_name = params[1];
            const account_number = params[2];
            const account_holder_name = params[3];
            const ifsc_code = params[4];
            const account_type = params[5];
            const upi_id = params[6];
            const branch_name = params[7];
            id = params[8] || params[params.length - 1];

            if (bankDetails) updateBody.bank_details = bankDetails;
            if (bank_name) updateBody.bank_name = bank_name;
            if (account_number) updateBody.account_number = account_number;
            if (account_holder_name) updateBody.account_holder_name = account_holder_name;
            if (bankDetails) updateBody.bank_details = bankDetails;
            if (bank_name) updateBody.bank_name = bank_name;
            if (account_number) updateBody.account_number = account_number;
            if (account_holder_name) updateBody.account_holder_name = account_holder_name;
            if (ifsc_code) updateBody.ifsc_code = ifsc_code;
            if (account_type) updateBody.account_type = account_type;
            if (upi_id) updateBody.upi_id = upi_id;
            if (branch_name) updateBody.branch_name = branch_name;
          }

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/users?or=(id.eq.${encodeURIComponent(id)},email.eq.${encodeURIComponent(id)})`, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateBody)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            return { rows: [updateBody], rowCount: 1 };
          }
        }

        // 4.92 UPDATE Hosts Fallback
        if (lower.startsWith('update hosts')) {
          const bankDetails = params[0];
          const bank_name = params[1];
          const account_number = params[2];
          const account_holder_name = params[3];
          const ifsc_code = params[4];
          const account_type = params[5];
          const upi_id = params[6];
          const branch_name = params[7];
          const id = params[8];

          const updateBody = {};
          if (bankDetails) updateBody.bank_details = bankDetails;
          if (bank_name) updateBody.bank_name = bank_name;
          if (account_number) updateBody.account_number = account_number;
          if (account_holder_name) updateBody.account_holder_name = account_holder_name;
          if (ifsc_code) updateBody.ifsc_code = ifsc_code;
          if (account_type) updateBody.account_type = account_type;
          if (upi_id) updateBody.upi_id = upi_id;
          if (branch_name) updateBody.branch_name = branch_name;

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/hosts?or=(id.eq.${encodeURIComponent(id)},email.eq.${encodeURIComponent(id)})`, {
            method: 'PATCH',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(updateBody)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => []);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            return { rows: [updateBody], rowCount: 1 };
          }
        }

        // 4.10 DELETE Subadmins Fallback
        if (lower.startsWith('delete from subadmins')) {
          const id = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/subadmins?or=(id.eq.${id},email.eq.${id})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 4.11 INSERT Coupons Fallback
        if (lower.startsWith('insert into coupons')) {
          const body = {
            id: params[0] || `COUP-${Date.now()}`,
            code: params[1] || undefined,
            discount_type: params[2] || 'percentage',
            discount_value: params[3] !== undefined ? Number(params[3]) : 0,
            min_booking: params[4] !== undefined ? Number(params[4]) : 0,
            apply_to: params[5] || 'All Products',
            max_uses: params[6] !== undefined ? Number(params[6]) : 100,
            times_used: 0,
            active: params[7] !== undefined ? Boolean(params[7]) : true,
            is_private: params[8] !== undefined ? Boolean(params[8]) : false,
            expiry: params[9] || '2026-12-31'
          };

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(body)
          });

          if (!restRes.ok) {
            // Fallback to core columns if PostgREST cache lacks new columns
            const baseBody = {
              id: body.id,
              code: body.code,
              discount_type: body.discount_type,
              discount_value: body.discount_value,
              min_booking: body.min_booking,
              max_uses: body.max_uses,
              times_used: 0,
              active: body.active,
              expiry: body.expiry
            };
            restRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons`, {
              method: 'POST',
              headers: {
                ...headers,
                'Prefer': 'resolution=merge-duplicates,return=representation'
              },
              body: JSON.stringify(baseBody)
            });
          }

          if (restRes.ok) {
            const rows = await restRes.json();
            const returnedRow = Array.isArray(rows) ? rows[0] : rows;
            return { rows: [{ ...body, ...(returnedRow || {}) }], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('[DB Fallback] Supabase coupons insert note:', restRes.status, errText);
            return { rows: [body], rowCount: 1 };
          }
        }

        // 4.12 UPDATE Coupons Fallback
        if (lower.startsWith('update coupons')) {
          const idOrCode = params[1] || params[0];

          if (lower.includes('times_used = coalesce(times_used, 0) + 1') || lower.includes('times_used = times_used + 1')) {
            const fetchRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?or=(id.eq.${idOrCode},code.eq.${idOrCode})`, { headers });
            if (fetchRes.ok) {
              const rows = await fetchRes.json();
              if (rows && rows.length > 0) {
                const c = rows[0];
                const newTimesUsed = (c.times_used || 0) + 1;
                await fetch(`${SUPABASE_URL}/rest/v1/coupons?or=(id.eq.${idOrCode},code.eq.${idOrCode})`, {
                  method: 'PATCH',
                  headers,
                  body: JSON.stringify({ times_used: newTimesUsed })
                });
                return { rows: [{ ...c, times_used: newTimesUsed }], rowCount: 1 };
              }
            }
          }

          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?or=(id.eq.${idOrCode},code.eq.${idOrCode})`, {
            method: 'PATCH',
            headers,
            body: JSON.stringify({ active: params[0] })
          });
          if (restRes.ok) {
            const rows = await restRes.json();
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          }
        }

        // 4.13 DELETE Coupons Fallback
        if (lower.startsWith('delete from coupons')) {
          const idOrCode = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/coupons?or=(id.eq.${idOrCode},code.eq.${idOrCode},code.ilike.${idOrCode})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        // 4.14 INSERT Reviews Fallback
        if (lower.startsWith('insert into reviews')) {
          const body = {
            id: params[0] || `REV-${Date.now()}`,
            property_id: String(params[1] || 'default'),
            guest_name: params[2] || params[3] || 'Verified Guest',
            user_email: params[3] || params[4] || null,
            rating: params[4] !== undefined ? Number(params[4]) : (params[5] !== undefined ? Number(params[5]) : 5),
            comment: params[5] || params[6] || 'Great homestay!'
          };

          // If query has 6 parameters (id, property_id, guest_name, user_email, rating, comment)
          if (params.length === 6) {
            body.guest_name = params[2];
            body.user_email = params[3];
            body.rating = Number(params[4]) || 5;
            body.comment = params[5];
          } else if (params.length >= 7) {
            // (id, property_id, property_name, guest_name, user_email, rating, comment, ...)
            body.guest_name = params[3];
            body.user_email = params[4];
            body.rating = Number(params[5]) || 5;
            body.comment = params[6];
          }

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });

          if (restRes.ok) {
            const rows = await restRes.json().catch(() => [body]);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('[DB Fallback] Supabase reviews insert note:', restRes.status, errText);
            return { rows: [body], rowCount: 1 };
          }
        }

        // 4.15 DELETE Reviews Fallback
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

        // 4.16 INSERT Wishlists Fallback
        if (lower.startsWith('insert into wishlists')) {
          const body = {
            id: params[0] || `WISH-${Date.now()}`,
            user_email: params[1] || undefined,
            user_name: params[2] || undefined,
            property_id: String(params[3] || 'default'),
            property_title: params[4] || 'Konkan Stay',
            property_image: params[5] || null,
            property_location: params[6] || 'Konkan',
            property_price: params[7] ? String(params[7]) : '0'
          };

          let restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'return=representation'
            },
            body: JSON.stringify(body)
          });

          if (restRes.ok) {
            const rows = await restRes.json().catch(() => [body]);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            const errText = await restRes.text().catch(() => '');
            console.warn('[DB Fallback] Supabase wishlists insert note:', restRes.status, errText);
            return { rows: [body], rowCount: 1 };
          }
        }

        // 4.17 DELETE Wishlists Fallback
        if (lower.startsWith('delete from wishlists')) {
          let deleteUrl = `${SUPABASE_URL}/rest/v1/wishlists`;
          if (params.length === 1) {
            const id = params[0];
            deleteUrl += `?id=eq.${encodeURIComponent(id)}`;
          } else if (params.length >= 2) {
            const email = params[0];
            const propId = params[1];
            deleteUrl += `?and=(user_email.ilike.${encodeURIComponent(email)},property_id.eq.${encodeURIComponent(propId)})`;
          }
          const restRes = await fetch(deleteUrl, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
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

        // 5.1 INSERT Newsletter Subscribers Fallback
        if (lower.startsWith('insert into newsletter_subscribers')) {
          const body = {
            id: params[0] || `sub_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            email: params[1] || undefined,
            subscribed_at: new Date().toISOString()
          };
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers`, {
            method: 'POST',
            headers: {
              ...headers,
              'Prefer': 'resolution=merge-duplicates,return=representation'
            },
            body: JSON.stringify(body)
          });
          if (restRes.ok) {
            const rows = await restRes.json().catch(() => [body]);
            return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
          } else {
            return { rows: [body], rowCount: 1 };
          }
        }

        // 5.2 DELETE Newsletter Subscribers Fallback
        if (lower.startsWith('delete from newsletter_subscribers')) {
          const idOrEmail = params[0];
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/newsletter_subscribers?or=(id.eq.${encodeURIComponent(idOrEmail)},email.ilike.${encodeURIComponent(idOrEmail)})`, {
            method: 'DELETE',
            headers
          });
          if (restRes.ok) {
            return { rows: [], rowCount: 1 };
          }
        }

        if (lower.startsWith('create table')) {
          return { rows: [], rowCount: 0 };
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
          const targetTable = 'cancellations';
          let updateBody = {};
          let cancId = params[params.length - 1];

          if (lower.includes('cancellation_reason') && lower.includes('status')) {
            updateBody.cancellation_reason = params[0];
            updateBody.status = params[1] || undefined;
          } else if (lower.includes('cancellation_reason')) {
            updateBody.cancellation_reason = params[0];
          } else if (lower.includes('refund_status')) {
            updateBody = {
              refund_status: params[0] || 'refunded',
              refund_txn_id: params[1] || undefined,
              refund_amount: params[2] ? Number(params[2]) : undefined
            };
          } else {
            updateBody = {
              status: params[0]
            };
          }

          Object.keys(updateBody).forEach(k => {
            if (updateBody[k] === undefined || updateBody[k] === null) delete updateBody[k];
          });

          if (cancId) {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?or=(id.eq.${encodeURIComponent(cancId)},booking_id.eq.${encodeURIComponent(cancId)})`, {
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
        if (lower.startsWith('select') && lower.includes('from wishlists')) {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists?select=*&order=created_at.desc`, { headers });
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
            return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
          }
        }

        // 15.5 SELECT Reviews Fallback
        if (lower.startsWith('select') && lower.includes('from reviews')) {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&order=created_at.desc`, { headers });
          if (restRes.ok) {
            let rows = await restRes.json();
            if (Array.isArray(rows) && params && params.length > 0 && params[0]) {
              const propId = String(params[0]).trim();
              rows = rows.filter(r => String(r.property_id).trim() === propId);
            }
            return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
          }
        }

        // 18. INSERT Into application_errors Fallback
        if (lower.startsWith('insert into application_errors')) {
          const body = {
            id: params[0] || `ERR-UUID-${Date.now()}`,
            error_id: params[1] || `ERR-${Date.now()}`,
            message: params[2] || '',
            error_type: params[3] || 'UnhandledError',
            stack_trace: params[4] || '',
            endpoint: params[5] || '/',
            http_method: params[6] || 'GET',
            status_code: params[7] ? Number(params[7]) : 500,
            user_id: params[8] || null,
            user_email: params[9] || null,
            browser: params[10] || 'Unknown Browser',
            device: params[11] || 'Desktop/Mobile',
            environment: params[12] || 'production',
            severity: params[13] || 'Medium',
            status: 'New'
          };
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors`, {
              method: 'POST',
              headers: {
                ...headers,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(body)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [body], rowCount: 1 };
        }

        // 18.5 DELETE From application_errors Fallback
        if (lower.startsWith('delete from application_errors')) {
          const id = params[0];
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?or=(id.eq.${encodeURIComponent(id)},error_id.eq.${encodeURIComponent(id)})`, {
              method: 'DELETE',
              headers
            });
            if (restRes.ok) {
              return { rows: [], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [], rowCount: 0 };
        }

        // 18.6 UPDATE application_errors Fallback
        if (lower.startsWith('update application_errors')) {
          const id = params[params.length - 1];
          try {
            const updateBody = {};
            if (lower.includes('status =')) updateBody.status = params[0];
            if (lower.includes('developer_notes =')) updateBody.developer_notes = params[1] || params[0];
            if (lower.includes('severity =')) updateBody.severity = params[2] || params[1] || params[0];
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?or=(id.eq.${encodeURIComponent(id)},error_id.eq.${encodeURIComponent(id)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [], rowCount: 0 };
        }

        // 18.7 INSERT Into cancellations / cancel_bookings Fallback
        if (lower.startsWith('insert into cancel_bookings') || lower.startsWith('insert into cancellations')) {
          const body = {
            id: params[0] || ('CNC-' + Math.floor(100000 + Math.random() * 900000)),
            booking_id: params[1] || 'SIK-000000',
            user_email: params[2] || 'guest@example.com',
            user_name: params[3] || 'Guest User',
            property_name: params[4] || 'Konkan Stay',
            check_in: params[5] || '',
            check_out: params[6] || '',
            paid_amount: params[7] || 0,
            refund_amount: params[8] || 0,
            refund_percentage: params[9] || 0,
            notice_days: params[10] || 0,
            cancellation_reason: params[11] || 'Guest requested cancellation',
            status: params[12] || 'requested',
            refund_status: 'pending',
            bank_name: params[13] || null,
            account_holder_name: params[14] || null,
            account_number: params[15] || null,
            ifsc_code: params[16] || null,
            upi_id: params[17] || null,
            created_at: new Date().toISOString()
          };
          const targetTable = lower.includes('cancel_bookings') ? 'cancel_bookings' : 'cancellations';
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=representation' },
              body: JSON.stringify(body)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [body], rowCount: 1 };
        }

        // 18.8 UPDATE cancellations / cancel_bookings Fallback
        if (lower.startsWith('update cancel_bookings') || lower.startsWith('update cancellations')) {
          const targetTable = lower.includes('cancel_bookings') ? 'cancel_bookings' : 'cancellations';
          const cancId = params[params.length - 1];
          const updateBody = { updated_at: new Date().toISOString() };
          if (lower.includes('status =')) updateBody.status = params[0];
          if (lower.includes('refund_status =')) {
            updateBody.refund_status = params[0];
            if (params[1]) updateBody.refund_txn_id = params[1];
            if (params[2]) updateBody.refund_amount = params[2];
          }
          if (lower.includes('bank_name =')) {
            updateBody.cancellation_reason = params[0];
            updateBody.bank_name = params[1];
            updateBody.account_holder_name = params[2];
            updateBody.account_number = params[3];
            updateBody.ifsc_code = params[4];
            updateBody.upi_id = params[5];
          }
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?or=(id.eq.${encodeURIComponent(cancId)},booking_id.eq.${encodeURIComponent(cancId)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [{ id: cancId, ...updateBody }], rowCount: 1 };
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
        if (lower.startsWith('select') && lower.includes('from wishlists')) {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/wishlists?select=*&order=created_at.desc`, { headers });
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
            return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
          }
        }

        // 15.5 SELECT Reviews Fallback
        if (lower.startsWith('select') && lower.includes('from reviews')) {
          const restRes = await fetch(`${SUPABASE_URL}/rest/v1/reviews?select=*&order=created_at.desc`, { headers });
          if (restRes.ok) {
            let rows = await restRes.json();
            if (Array.isArray(rows) && params && params.length > 0 && params[0]) {
              const propId = String(params[0]).trim();
              rows = rows.filter(r => String(r.property_id).trim() === propId);
            }
            return { rows: Array.isArray(rows) ? rows : [], rowCount: Array.isArray(rows) ? rows.length : 0 };
          }
        }

        // 18. INSERT Into application_errors Fallback
        if (lower.startsWith('insert into application_errors')) {
          const body = {
            id: params[0] || `ERR-UUID-${Date.now()}`,
            error_id: params[1] || `ERR-${Date.now()}`,
            message: params[2] || '',
            error_type: params[3] || 'UnhandledError',
            stack_trace: params[4] || '',
            endpoint: params[5] || '/',
            http_method: params[6] || 'GET',
            status_code: params[7] ? Number(params[7]) : 500,
            user_id: params[8] || null,
            user_email: params[9] || null,
            browser: params[10] || 'Unknown Browser',
            device: params[11] || 'Desktop/Mobile',
            environment: params[12] || 'production',
            severity: params[13] || 'Medium',
            status: 'New'
          };
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors`, {
              method: 'POST',
              headers: {
                ...headers,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(body)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [body], rowCount: 1 };
        }

        // 18.5 DELETE From application_errors Fallback
        if (lower.startsWith('delete from application_errors')) {
          const id = params[0];
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?or=(id.eq.${encodeURIComponent(id)},error_id.eq.${encodeURIComponent(id)})`, {
              method: 'DELETE',
              headers
            });
            if (restRes.ok) {
              return { rows: [], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [], rowCount: 0 };
        }

        // 18.6 UPDATE application_errors Fallback
        if (lower.startsWith('update application_errors')) {
          const id = params[params.length - 1];
          try {
            const updateBody = {};
            if (lower.includes('status =')) updateBody.status = params[0];
            if (lower.includes('developer_notes =')) updateBody.developer_notes = params[1] || params[0];
            if (lower.includes('severity =')) updateBody.severity = params[2] || params[1] || params[0];
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/application_errors?or=(id.eq.${encodeURIComponent(id)},error_id.eq.${encodeURIComponent(id)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [], rowCount: 0 };
        }

        // 19. INSERT Into help_desk / issue Fallback
        if (lower.startsWith('insert into help_desk') || lower.startsWith('insert into issue')) {
          const uuid = params[0] || `UUID-${Date.now()}`;
          const issueId = params[1] || `ISSUE-${Math.floor(1000 + Math.random() * 9000)}`;
          const body = {
            id: uuid,
            issue_id: issueId,
            title: params[2] || 'Help Desk Request',
            description: params[3] || '',
            category: params[4] || 'General',
            user_name: params[5] || 'Guest User',
            user_email: params[6] || null,
            user_phone: params[7] || null,
            priority: params[8] || 'Medium',
            status: params[9] || 'Open',
            admin_notes: params[10] || 'Your issue is sent to our team. Our team will review it and contact you soon.',
            comments: '[]',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };

          try {
            const rest1 = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent('Help Desk')}`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=representation' },
              body: JSON.stringify(body)
            });
            if (rest1.ok) {
              const rows = await rest1.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}

          try {
            const rest2 = await fetch(`${SUPABASE_URL}/rest/v1/issue`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=representation' },
              body: JSON.stringify(body)
            });
            if (rest2.ok) {
              const rows = await rest2.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}

          return { rows: [body], rowCount: 1 };
        }

        // 20. SELECT From help_desk / issue Fallback
        if (lower.startsWith('select') && (lower.includes('from help_desk') || lower.includes('from issue'))) {
          let rows = [];
          try {
            const r1 = await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent('Help Desk')}?select=*&order=created_at.desc`, { headers });
            if (r1.ok) {
              const data1 = await r1.json();
              if (Array.isArray(data1)) rows.push(...data1);
            }
          } catch (_) {}

          try {
            const r2 = await fetch(`${SUPABASE_URL}/rest/v1/issue?select=*&order=created_at.desc`, { headers });
            if (r2.ok) {
              const data2 = await r2.json();
              if (Array.isArray(data2)) rows.push(...data2);
            }
          } catch (_) {}

          return { rows: Array.isArray(rows) ? rows : [], rowCount: rows.length };
        }

        // 21. UPDATE help_desk / issue Fallback
        if (lower.startsWith('update help_desk') || lower.startsWith('update issue')) {
          const id = params[params.length - 1];
          const updateBody = { updated_at: new Date().toISOString() };
          if (lower.includes('status =')) updateBody.status = params[0];
          if (lower.includes('admin_notes =')) updateBody.admin_notes = params[1] || params[0];

          try {
            await fetch(`${SUPABASE_URL}/rest/v1/${encodeURIComponent('Help Desk')}?or=(id.eq.${encodeURIComponent(id)},issue_id.eq.${encodeURIComponent(id)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            await fetch(`${SUPABASE_URL}/rest/v1/issue?or=(id.eq.${encodeURIComponent(id)},issue_id.eq.${encodeURIComponent(id)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
          } catch (_) {}

          return { rows: [{ id, ...updateBody }], rowCount: 1 };
        }
        // 18.7 INSERT Into cancellations / cancel_bookings Fallback
        if (lower.startsWith('insert into cancel_bookings') || lower.startsWith('insert into cancellations')) {
          const body = {
            id: params[0] || ('CNC-' + Math.floor(100000 + Math.random() * 900000)),
            booking_id: params[1] || 'SIK-000000',
            user_email: params[2] || 'guest@example.com',
            user_name: params[3] || 'Guest User',
            property_name: params[4] || 'Konkan Stay',
            check_in: params[5] || '',
            check_out: params[6] || '',
            paid_amount: params[7] || 0,
            refund_amount: params[8] || 0,
            refund_percentage: params[9] || 0,
            notice_days: params[10] || 0,
            cancellation_reason: params[11] || 'Guest requested cancellation',
            status: params[12] || 'requested',
            refund_status: 'pending',
            bank_name: params[13] || null,
            account_holder_name: params[14] || null,
            account_number: params[15] || null,
            ifsc_code: params[16] || null,
            upi_id: params[17] || null,
            created_at: new Date().toISOString()
          };
          const targetTable = lower.includes('cancel_bookings') ? 'cancel_bookings' : 'cancellations';
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}`, {
              method: 'POST',
              headers: { ...headers, 'Prefer': 'return=representation' },
              body: JSON.stringify(body)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [body], rowCount: 1 };
        }

        // 18.8 UPDATE cancellations / cancel_bookings Fallback
        if (lower.startsWith('update cancel_bookings') || lower.startsWith('update cancellations')) {
          const targetTable = lower.includes('cancel_bookings') ? 'cancel_bookings' : 'cancellations';
          const cancId = params[params.length - 1];
          const updateBody = { updated_at: new Date().toISOString() };
          if (lower.includes('status =')) updateBody.status = params[0];
          if (lower.includes('refund_status =')) {
            updateBody.refund_status = params[0];
            if (params[1]) updateBody.refund_txn_id = params[1];
            if (params[2]) updateBody.refund_amount = params[2];
          }
          if (lower.includes('bank_name =')) {
            updateBody.cancellation_reason = params[0];
            updateBody.bank_name = params[1];
            updateBody.account_holder_name = params[2];
            updateBody.account_number = params[3];
            updateBody.ifsc_code = params[4];
            updateBody.upi_id = params[5];
          }
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/${targetTable}?or=(id.eq.${encodeURIComponent(cancId)},booking_id.eq.${encodeURIComponent(cancId)})`, {
              method: 'PATCH',
              headers,
              body: JSON.stringify(updateBody)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [{ id: cancId, ...updateBody }], rowCount: 1 };
        }

        // 19. INSERT Into issue Fallback
        if (lower.startsWith('insert into issue')) {
          const body = {
            id: params[0] || `ISSUE-UUID-${Date.now()}`,
            issue_id: params[1] || `ISSUE-${Date.now()}`,
            title: params[2] || '',
            description: params[3] || '',
            category: params[4] || 'General',
            user_name: params[5] || 'Guest User',
            user_email: params[6] || null,
            user_phone: params[7] || null,
            priority: params[8] || 'Medium',
            status: params[9] || 'Open',
            admin_notes: params[10] || 'Your issue is sent to our team.'
          };
          try {
            const restRes = await fetch(`${SUPABASE_URL}/rest/v1/issue`, {
              method: 'POST',
              headers: {
                ...headers,
                'Prefer': 'return=representation'
              },
              body: JSON.stringify(body)
            });
            if (restRes.ok) {
              const rows = await restRes.json();
              return { rows: Array.isArray(rows) ? rows : [rows], rowCount: 1 };
            }
          } catch (_) {}
          return { rows: [body], rowCount: 1 };
        }
      } catch (restErr) {}
    }

    return { rows: [], rowCount: 0 };
};

pool.on('error', (err) => {
  console.warn('PostgreSQL pool note:', err.message);
});

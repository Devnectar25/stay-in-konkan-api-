import { query } from './src/db.js';

async function seedDatabase() {
  console.log('Seeding Help Desk & Error Monitoring tables in database...');

  try {
    // 1. Seed Help Desk Issues
    const issueSql = `
      INSERT INTO issue (id, issue_id, title, description, category, user_name, user_email, user_phone, priority, status, admin_notes, created_at, updated_at)
      VALUES
        (
          'ISSUE-UUID-001',
          'TK-20260813-8A7B',
          'Payment Receipt Download Failing on Safari Browser',
          'When clicking on Download Invoice PDF after booking Tarkarli Beach Villa on Safari iOS, the PDF popup opens blank.',
          'Payment Issue',
          'Vikram Shinde',
          'vikram.shinde@example.com',
          '+91 98220 12345',
          'High',
          'Open',
          'Support team acknowledged inquiry. Testing Safari blob download.',
          NOW() - INTERVAL '30 minutes',
          NOW() - INTERVAL '30 minutes'
        ),
        (
          'ISSUE-UUID-002',
          'TK-20260813-4F2A',
          'Host Listing Verification Document Upload Size Limit',
          'Host unable to upload 12MB property 7/12 extract PDF document during host application process.',
          'Property Issue',
          'Sunita Wada',
          'sunita.wada@example.com',
          '+91 98233 45678',
          'Medium',
          'In Progress',
          'Increased Express body parser limit to 50MB.',
          NOW() - INTERVAL '3 hours',
          NOW() - INTERVAL '1 hour'
        ),
        (
          'ISSUE-UUID-003',
          'TK-20260813-9E1C',
          'Request to Add Malvani Cuisine Breakfast Option in Homestays',
          'Feature request: Add an option for hosts to list local Konkani breakfast included in stay price.',
          'Feature Request',
          'Rajesh Patil',
          'rajesh.patil@example.com',
          '+91 97654 32109',
          'Low',
          'Resolved',
          'Added facility tag "Authentic Malvani Breakfast Available".',
          NOW() - INTERVAL '24 hours',
          NOW() - INTERVAL '12 hours'
        ),
        (
          'ISSUE-UUID-004',
          'TK-20260813-6D8E',
          'Booking Check-in Confirmation WhatsApp Alert Not Received',
          'Guest completed token payment for Malvan Sea Breeze Villa, but WhatsApp notification was delayed.',
          'Booking Issue',
          'Ankita Sawant',
          'ankita.sawant@example.com',
          '+91 98700 11223',
          'High',
          'Open',
          'Checking Twilio/WhatsApp API webhook logs.',
          NOW() - INTERVAL '10 minutes',
          NOW() - INTERVAL '10 minutes'
        )
      ON CONFLICT (issue_id) DO NOTHING;
    `;

    await query(issueSql);
    console.log('✓ Successfully seeded sample issues into database table "issue"!');

    // 2. Seed Application Errors
    const errorSql = `
      INSERT INTO application_errors (id, error_id, message, error_type, stack_trace, endpoint, http_method, status_code, user_id, user_email, browser, device, environment, severity, status, developer_notes, created_at)
      VALUES
        (
          'ERR-UUID-001',
          'ERR-20260813-9F8A',
          'Unhandled API Error: Failed to fetch property booking calendar for property prop-deepmagare-sea-breeze',
          'APIError',
          'Error: Failed to fetch property booking calendar\\n    at fetchPropertyCalendar (api.js:142)\\n    at async loadBookingDetails (Booking.jsx:89)\\n    at Object.componentDidCatch (App.jsx:45)',
          '/api/bookings/calendar/prop-deepmagare-sea-breeze',
          'GET',
          500,
          'USR-101',
          'guest.konkan@example.com',
          'Chrome 127.0.0 (Windows NT 10.0)',
          '1920x1080 • Desktop',
          'production',
          'High',
          'New',
          'Investigating database query latency on calendar table.',
          NOW() - INTERVAL '15 minutes'
        ),
        (
          'ERR-UUID-002',
          'ERR-20260813-3B4C',
          'React Component Exception: Cannot read properties of undefined (reading "map")',
          'ReactError',
          'TypeError: Cannot read properties of undefined (reading "map")\\n    at PropertyDetails (PropertyDetails.jsx:154)\\n    at renderWithHooks (react-dom.development.js:16305)',
          '/property-details?id=mango-farmstay',
          'CLIENT_REACT',
          500,
          'USR-102',
          'anand.sawant@example.com',
          'Safari 17.4 (iOS Mobile)',
          '390x844 • iPhone',
          'production',
          'Medium',
          'Investigating',
          'Checking if room images array fallback is handled when null.',
          NOW() - INTERVAL '2 hours'
        ),
        (
          'ERR-UUID-003',
          'ERR-20260813-7D1E',
          'PostgreSQL Pool Connection Timeout: timeout exceeded when connecting to database',
          'DatabaseError',
          'Error: connect ETIMEDOUT 127.0.0.1:5432\\n    at Connection.connect (pg/lib/connection.js:77)\\n    at Pool.connect (pg/lib/pool.js:45)',
          '/api/properties',
          'POST',
          503,
          'admin_01',
          'admin@stayinkonkan.com',
          'Node.js Express Server',
          'Backend Node.js API Server',
          'production',
          'Critical',
          'Resolved',
          'Reconnected connection pool and verified Supabase REST fallback.',
          NOW() - INTERVAL '6 hours'
        )
      ON CONFLICT (error_id) DO NOTHING;
    `;

    await query(errorSql);
    console.log('✓ Successfully seeded sample error logs into database table "application_errors"!');
  } catch (err) {
    console.warn('Seed execution note:', err.message);
  } finally {
    process.exit(0);
  }
}

seedDatabase();

import { query } from '../src/db.js';

async function fixBookingHosts() {
  console.log('🔧 Fixing booking host emails & names to match actual properties...');

  const bookingsRes = await query('SELECT id, property_id, property_name, host_email, host_name FROM bookings;');
  const bookings = bookingsRes.rows || [];

  const propsRes = await query('SELECT id, title, host_email, host_name, host_phone FROM properties;');
  const properties = propsRes.rows || [];

  console.log(`Found ${bookings.length} bookings and ${properties.length} properties.`);

  let updatedCount = 0;
  for (const b of bookings) {
    const bPropId = String(b.property_id || '').trim().toLowerCase();
    const bPropName = String(b.property_name || '').trim().toLowerCase();

    // Match property
    const propMatch = properties.find(p => {
      const pId = String(p.id || '').trim().toLowerCase();
      const pTitle = String(p.title || '').trim().toLowerCase();
      return (bPropId && pId && (bPropId === pId || bPropId.replace(/_/g, '-') === pId.replace(/_/g, '-'))) ||
             (bPropName && pTitle && (bPropName.includes(pTitle) || pTitle.includes(bPropName)));
    });

    if (propMatch && propMatch.host_email) {
      const realHostEmail = propMatch.host_email;
      const realHostName = propMatch.host_name || 'Registered Host';

      if (b.host_email !== realHostEmail || b.host_name !== realHostName) {
        await query(
          `UPDATE bookings SET host_email = $1, host_name = $2 WHERE id = $3;`,
          [realHostEmail, realHostName, b.id]
        );
        console.log(`✅ Updated Booking ${b.id} (${b.property_name}) -> Host Email: ${realHostEmail} (${realHostName})`);
        updatedCount++;
      }
    }
  }

  console.log(`🎉 Done! Updated ${updatedCount} bookings.`);
  process.exit(0);
}

fixBookingHosts().catch(e => {
  console.error('Fix failed:', e);
  process.exit(1);
});

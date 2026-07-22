import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL || 'https://twogullikwakapmsyrvw.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log('Testing Supabase REST API connection to:', supabaseUrl);

async function testSupabaseUser() {
  const testUserId = `usr_${Date.now()}`;
  const testEmail = `konkan.user.${Date.now()}@example.com`;
  const testName = 'Konkan Live User';

  const userPayload = {
    id: testUserId,
    full_name: testName,
    email: testEmail,
    phone: '+91 9876543210',
    role: 'guest',
    provider: 'email',
    verified: true
  };

  try {
    // 1. Post new user to Supabase REST API
    const response = await fetch(`${supabaseUrl}/rest/v1/users`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify(userPayload)
    });

    if (response.ok) {
      const data = await response.json();
      console.log('🎉 SUCCESS! User created in Supabase database:');
      console.log(data);
    } else {
      const errText = await response.text();
      console.error(`❌ HTTP Error ${response.status}:`, errText);
    }

    // 2. Fetch all users from Supabase DB
    const getRes = await fetch(`${supabaseUrl}/rest/v1/users?select=*`, {
      headers: {
        'apikey': serviceKey,
        'Authorization': `Bearer ${serviceKey}`
      }
    });

    if (getRes.ok) {
      const allUsers = await getRes.json();
      console.log(`📊 Total Users in Supabase Database: ${allUsers.length}`);
      console.log('Latest Users:', allUsers);
    } else {
      console.error('Fetch users error:', await getRes.text());
    }

  } catch (err) {
    console.error('❌ Supabase Test Error:', err);
  }
}

testSupabaseUser();

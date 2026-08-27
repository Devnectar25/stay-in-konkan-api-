async function testVercelIssues() {
  try {
    console.log('🚀 Testing remote production API endpoint https://stay-in-konkan-api.vercel.app/api/issues...');

    const payload = {
      id: `ISSUE-${Date.now()}`,
      issue_id: `TK-LIVE-${Math.floor(1000 + Math.random() * 9000)}`,
      title: 'UI Form Submission Live Test Ticket',
      description: 'Testing if Help Desk form submission writes to live PostgreSQL database via Vercel endpoint.',
      category: 'UI Form Live Test',
      user_name: 'Live UI Tester',
      user_email: 'liveuitester@example.com',
      user_phone: '9876543210',
      priority: 'High',
      status: 'Open'
    };

    const response = await globalThis.fetch('https://stay-in-konkan-api.vercel.app/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`📡 Response status: ${response.status}`);
    console.log('📦 Response data:', data);

  } catch (err) {
    console.error('❌ Vercel HTTP POST request failed:', err.message);
  }
}

testVercelIssues();

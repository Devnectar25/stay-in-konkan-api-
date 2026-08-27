
async function testHttpPostIssue() {
  try {
    console.log('🚀 Sending real HTTP POST request to http://localhost:5001/api/issues...');

    const payload = {
      id: `ISSUE-${Date.now()}`,
      issue_id: `TK-TEST-${Math.floor(1000 + Math.random() * 9000)}`,
      title: 'UI Form Submission Test Ticket',
      description: 'Testing if UI form submission successfully writes to PostgreSQL database via HTTP API.',
      category: 'UI Form Test',
      user_name: 'UI Tester',
      user_email: 'uitester@example.com',
      user_phone: '9876543210',
      priority: 'High',
      status: 'Open'
    };

    const response = await fetch('http://localhost:5001/api/issues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await response.json();
    console.log(`📡 Response status: ${response.status}`);
    console.log('📦 Response data:', data);

  } catch (err) {
    console.error('❌ HTTP POST request failed:', err.message);
  }
}

testHttpPostIssue();

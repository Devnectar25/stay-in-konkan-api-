
async function findPort() {
  const ports = [5000, 5001, 3000, 8000, 5002];
  for (const port of ports) {
    try {
      const res = await globalThis.fetch(`http://localhost:${port}/api/health`).catch(() => null);
      if (res) {
        console.log(`✅ API server found running on http://localhost:${port}! Status: ${res.status}`);
        return;
      }
    } catch (e) {}
  }
  console.log('❌ Could not find API server listening on ports 5000, 5001, 3000, 8000, 5002.');
}

findPort();

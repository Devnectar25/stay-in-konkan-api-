async function testPropertySearch() {
  try {
    console.log('🚀 Testing property name search queries against live/local API...');

    const searchQueries = [
      'ratnagiri mango shadow',
      'mango shadow',
      'tarkarli samudra sparsh',
      'kashid white sand',
      'velas turtle'
    ];

    for (const q of searchQueries) {
      const url = `https://stay-in-konkan-api.vercel.app/api/properties?location=${encodeURIComponent(q)}`;
      const res = await globalThis.fetch(url);
      const data = await res.json();
      console.log(`\n🔍 Search Query: "${q}"`);
      console.log(`📊 Found count: ${data.count}`);
      if (data.properties && data.properties.length > 0) {
        data.properties.forEach(p => {
          console.log(`   - ID: ${p.id} | Title: "${p.title}" | Location: "${p.location}"`);
        });
      } else {
        console.log(`   ❌ No properties returned for "${q}"`);
      }
    }
  } catch (err) {
    console.error('❌ Search test failed:', err);
  }
}

testPropertySearch();

import { BetaAnalyticsDataClient } from '@google-analytics/data';
import dotenv from 'dotenv';

dotenv.config();

const propertyId = process.env.GA4_PROPERTY_ID || '551879771';
const clientEmail = process.env.GA4_CLIENT_EMAIL || 'stay-in-konkan@aerial-gadget-506817-f8.iam.gserviceaccount.com';
let privateKey = process.env.GA4_PRIVATE_KEY || '';
if (privateKey) {
  privateKey = privateKey.replace(/\\n/g, '\n');
}

async function testGA4RealtimeDimensions() {
  const analyticsDataClient = new BetaAnalyticsDataClient({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey
    }
  });

  const dimensionsToTest = [
    'unifiedPagePathScreen',
    'deviceCategory',
    'city',
    'unifiedScreenName'
  ];

  for (const dim of dimensionsToTest) {
    try {
      const [res] = await analyticsDataClient.runRealtimeReport({
        property: `properties/${propertyId}`,
        dimensions: [{ name: dim }],
        metrics: [{ name: 'activeUsers' }]
      });
      console.log(`✅ Dimension [${dim}] Success! Rows count: ${res.rows?.length || 0}`);
      if (res.rows) {
        res.rows.forEach(r => console.log(`  Val: ${r.dimensionValues[0].value} | Active: ${r.metricValues[0].value}`));
      }
    } catch (e) {
      console.error(`❌ Dimension [${dim}] Failed:`, e.message);
    }
  }
}

testGA4RealtimeDimensions();

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Root Endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: '🚀 Stay in Konkan API is running live on Vercel!',
    health: '/api/health'
  });
});

// Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    service: 'Stay in Konkan Backend API',
    databaseDriver: 'pg (Raw Queries)',
    timestamp: new Date().toISOString()
  });
});


// API Routes
app.use('/api/users', userRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/newsletter', newsletterRoutes);

// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Export app for Vercel serverless deployment
export default app;

// Start Server (only when run directly in Node)
if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Stay in Konkan API running on http://localhost:${PORT}`);
    console.log(`⚡ Database mode: Raw PostgreSQL queries (via pg)`);
    console.log(`=================================================`);
  });
}


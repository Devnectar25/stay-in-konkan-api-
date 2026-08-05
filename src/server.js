import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import userRoutes from './routes/userRoutes.js';
import propertyRoutes from './routes/propertyRoutes.js';
import bookingRoutes from './routes/bookingRoutes.js';
import adminRoutes from './routes/adminRoutes.js';
import newsletterRoutes from './routes/newsletterRoutes.js';
import contactRoutes from './routes/contactRoutes.js';
import hostApplicationRoutes from './routes/hostApplicationRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import cancellationRoutes from './routes/cancellationRoutes.js';

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
app.use('/api/contact', contactRoutes);
app.use('/api/host-applications', hostApplicationRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cancellations', cancellationRoutes);



// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  res.status(500).json({ success: false, message: err.message || 'Internal Server Error' });
});

// Global Unhandled Rejection & Exception Handlers (Prevents server crashes)
process.on('unhandledRejection', (reason, promise) => {
  console.warn('[API Server Warning] Unhandled Promise Rejection:', reason?.message || reason);
});

process.on('uncaughtException', (err) => {
  console.warn('[API Server Warning] Uncaught Exception:', err?.message || err);
});

// Export app for Vercel serverless deployment
export default app;

// Start Server (only when run directly in Node)
if (process.env.NODE_ENV !== 'production') {
  const server = app.listen(PORT, () => {
    console.log(`=================================================`);
    console.log(`🚀 Stay in Konkan API running on http://localhost:${PORT}`);
    console.log(`⚡ Database mode: Raw PostgreSQL queries (via pg)`);
    console.log(`=================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`[API Server Warning] Port ${PORT} is currently in use. Retrying in 1 second...`);
      setTimeout(() => {
        try {
          server.close();
        } catch (e) { }
        server.listen(PORT);
      }, 1000);
    } else {
      console.error('[API Server Error]:', err.message);
    }
  });
}


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
import hostRoutes from './routes/hostRoutes.js';
import wishlistRoutes from './routes/wishlistRoutes.js';
import reviewRoutes from './routes/reviewRoutes.js';
import cancellationRoutes from './routes/cancellationRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import bankRoutes from './routes/bankRoutes.js';
import uploadRoutes from './routes/uploadRoutes.js';

import errorRoutes, { generateErrorId, sanitizeSensitiveData, calculateSeverity } from './routes/errorRoutes.js';
import issueRoutes from './routes/issueRoutes.js';
import analyticsRoutes from './routes/analyticsRoutes.js';
import { query } from './db.js';

dotenv.config();
// Server initialized with Supabase config: stkpofofekgobpnzvdor

const app = express();
const PORT = process.env.PORT || 5001;

// Global CORS Middleware & Preflight Handling
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PATCH, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-user-email');
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  next();
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['*']
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

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
app.use('/api/hosts', hostRoutes);
app.use('/api/wishlists', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/cancellations', cancellationRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/bank-details', bankRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/errors', errorRoutes);
app.use('/api/issues', issueRoutes);
app.use('/api/analytics', analyticsRoutes);


// Centralized Express Error Handling Middleware
app.use(async (err, req, res, next) => {
  console.error('[Centralized Express Error Handler caught exception]:', err);
  const errorId = generateErrorId();
  const statusCode = err.status || err.statusCode || 500;
  const rawMsg = err.message || 'Internal Server Error';
  const cleanMsg = sanitizeSensitiveData(rawMsg);
  const cleanStack = sanitizeSensitiveData(err.stack || '');
  const severity = calculateSeverity(statusCode, err.name || 'ExpressException', cleanMsg);

  // Asynchronously log to application_errors without blocking response or failing main process
  try {
    const insertSql = `
      INSERT INTO application_errors (
        id, error_id, message, error_type, stack_trace, endpoint, http_method,
        status_code, user_email, browser, device, environment, severity, status, created_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'New', NOW());
    `;
    const userEmail = req.user?.email || req.body?.email || req.headers['x-user-email'] || null;
    const browser = req.headers['user-agent'] || 'Unknown Server Client';

    await query(insertSql, [
      `ERR-SYS-${Date.now()}`,
      errorId,
      cleanMsg.slice(0, 2000),
      (err.name || 'APIException').slice(0, 100),
      cleanStack,
      (req.originalUrl || req.url || '/api').slice(0, 500),
      (req.method || 'GET').toUpperCase(),
      statusCode,
      userEmail,
      browser,
      'Backend Node.js API Server',
      process.env.NODE_ENV || 'production',
      severity
    ]).catch(dbErr => console.warn('[Express Error Handler DB Log Note]:', dbErr.message));
  } catch (logErr) {
    console.warn('[Express Error Handler Silent Log Note]:', logErr.message);
  }

  // Return safe response to frontend without exposing sensitive stack traces in production
  res.status(statusCode).json({
    success: false,
    message: statusCode >= 500 ? 'An unexpected server error occurred. Please contact support.' : cleanMsg,
    error_id: errorId
  });
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


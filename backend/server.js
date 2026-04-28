import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { config } from 'dotenv';
import lighthouseRoutes from './routes/lighthouse.js';
import { verifyToken } from '../api/lib/auth.js';

// Load environment variables
config({ path: '../.env' });
config({ path: '../.env.local', override: true });

// Dynamic import ensures dotenv has run before redis.js and db.js read env vars at module level
import('./workers/auditWorker.js').catch(err => console.error('[worker] Failed to start:', err));

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
  optionsSuccessStatus: 200,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cache-Control']
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Auth middleware — parity with api/lighthouse.js (see docs/architecture.md Design Constraints)
function requireAuth(req, res, next) {
  try {
    req.user = verifyToken(req);
    next();
  } catch (err) {
    res.status(err.status || 401).json({ error: err.message });
  }
}

// Routes
app.use('/api/lighthouse', requireAuth, lighthouseRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    service: 'lighthouse-performance-backend'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Route not found',
    message: `Cannot ${req.method} ${req.originalUrl}`
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Lighthouse Performance Backend running on port ${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
});

export default app;

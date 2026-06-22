const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');
const tenancyMiddleware = require('./middleware/tenancyMiddleware');

const app = express();

// Middleware chain (order matters)
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no tenancy required)
// Placeholder - will be filled in Task 6
// app.post('/auth/zalo/callback', require('./handlers/authHandler'));

// Protected routes (require auth + tenancy)
app.use(authMiddleware);
app.use(tenancyMiddleware);

// Zalo webhook (verify signature before processing)
// Placeholder - will be filled in Task 9
// app.post('/api/zalo/webhook', require('./handlers/zaloWebhookHandler'));

// Inngest webhook
// Placeholder - will be filled in Task 7
// app.use('/api/inngest', require('./handlers/inngestHandler'));

// Error handler (final middleware)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

module.exports = app;

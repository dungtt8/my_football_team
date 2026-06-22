const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');
const tenancyMiddleware = require('./middleware/tenancyMiddleware');
const { handleError } = require('./services/errorService');

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
const authHandler = require('./handlers/authHandler');
app.post('/auth/zalo/callback', authHandler);

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
  handleError(err, req, res, {
    team_id: req.user?.team_id,
    user_id: req.user?.user_id,
    path: req.path
  });
});

module.exports = app;

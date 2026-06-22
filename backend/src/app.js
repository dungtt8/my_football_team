const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');
const tenancyMiddleware = require('./middleware/tenancyMiddleware');
const rbacMiddleware = require('./middleware/rbacMiddleware');
const { handleError } = require('./services/errorService');
const inngest = require('./config/inngest');

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

// Zalo webhook (NO AUTH - verify signature before processing)
const zaloWebhookHandler = require('./handlers/zaloWebhookHandler');
app.post('/api/zalo/webhook', zaloWebhookHandler);

// Protected routes (require auth + tenancy)
app.use(authMiddleware);
app.use(tenancyMiddleware);

// Inngest webhook
const inngestHandler = require('./handlers/inngestHandler');
app.use('/api/inngest', inngestHandler);

// Finance routes
const financeHandler = require('./handlers/financeHandler');
app.post('/api/finance/transactions', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.submitTransaction);
app.get('/api/finance/transactions', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.listTransactions);
app.get('/api/finance/transactions/:id', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getTransaction);
app.patch('/api/finance/transactions/:id/approve', rbacMiddleware(['co_manager', 'owner']), financeHandler.approveTransaction);
app.patch('/api/finance/transactions/:id/reject', rbacMiddleware(['co_manager', 'owner']), financeHandler.rejectTransaction);
app.get('/api/finance/approvals/pending', rbacMiddleware(['co_manager', 'owner']), financeHandler.getPendingApprovals);
app.get('/api/finance/balance', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getBalance);

// Campaign routes
const campaignHandler = require('./handlers/campaignHandler');
// Create new campaign (co-managers and owners only)
app.post('/api/campaigns', rbacMiddleware(['co_manager', 'owner']), campaignHandler.createCampaign);
// List all campaigns (accessible to all roles)
app.get('/api/campaigns', rbacMiddleware(['member', 'co_manager', 'owner']), campaignHandler.listCampaigns);
// Get single campaign details
app.get('/api/campaigns/:id', rbacMiddleware(['member', 'co_manager', 'owner']), campaignHandler.getCampaign);
// Get campaign assignments (co-managers view)
app.get('/api/campaigns/:id/assignments', rbacMiddleware(['co_manager', 'owner']), campaignHandler.getAssignments);
// Member confirms participation in campaign
app.post('/api/campaigns/:id/assignments/:userId/confirm', rbacMiddleware(['member', 'co_manager', 'owner']), campaignHandler.memberConfirm);
// Member rejects participation in campaign
app.post('/api/campaigns/:id/assignments/:userId/reject', rbacMiddleware(['member', 'co_manager', 'owner']), campaignHandler.memberReject);
// Co-manager approves member participation
app.patch('/api/campaigns/:id/assignments/:userId/approve', rbacMiddleware(['co_manager', 'owner']), campaignHandler.coManagerApprove);
// Co-manager rejects member participation
app.patch('/api/campaigns/:id/assignments/:userId/reject', rbacMiddleware(['co_manager', 'owner']), campaignHandler.coManagerReject);
// Co-manager exempts member from campaign
app.patch('/api/campaigns/:id/assignments/:userId/exempt', rbacMiddleware(['co_manager', 'owner']), campaignHandler.coManagerExempt);
// Close campaign and finalize
app.post('/api/campaigns/:id/close', rbacMiddleware(['co_manager', 'owner']), campaignHandler.closeCampaign);
// Get campaign report (analytics and results)
app.get('/api/campaigns/:id/report', rbacMiddleware(['co_manager', 'owner']), campaignHandler.getReport);

// Error handler (final middleware)
app.use((err, req, res, next) => {
  handleError(err, req, res, {
    team_id: req.user?.team_id,
    user_id: req.user?.user_id,
    path: req.path
  });
});

module.exports = app;

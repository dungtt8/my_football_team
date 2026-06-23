const express = require('express');
const cors = require('cors');
const authMiddleware = require('./middleware/authMiddleware');
const tenancyMiddleware = require('./middleware/tenancyMiddleware');
const rbacMiddleware = require('./middleware/rbacMiddleware');
const { handleError } = require('./services/errorService');
const inngest = require('./config/inngest');

const app = express();

// CORS — allow configured origins
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map(o => o.trim())
    .filter(Boolean);

// Always allow localhost in development
if (process.env.NODE_ENV !== 'production') {
    ALLOWED_ORIGINS.push('http://localhost:3000', 'http://127.0.0.1:3000');
}

const corsOptions = {
    origin: (origin, callback) => {
        // Allow requests with no origin (mobile apps, curl, Postman)
        if (!origin) return callback(null, true);
        if (ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
            return callback(null, true);
        }
        return callback(new Error(`CORS: origin ${origin} not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
};

app.use(cors(corsOptions));

// Handle preflight for all routes
app.options('*', cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check (no auth required)
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth routes (no tenancy required)
const authHandler = require('./handlers/authHandler');
app.post('/api/auth/zalo/callback', authHandler);

const phoneAuthHandler = require('./handlers/phoneAuthHandler');
app.post('/api/auth/phone/login', phoneAuthHandler);

// Zalo webhook (NO AUTH - verify signature before processing)
const zaloWebhookHandler = require('./handlers/zaloWebhookHandler');
app.post('/api/zalo/webhook', zaloWebhookHandler);

// Protected routes (require auth, but NOT yet tenancy)
app.use(authMiddleware);

// Team onboarding — auth required but no team context yet
const teamHandler = require('./handlers/teamHandler');
app.post('/api/teams', teamHandler.createTeam);
app.post('/api/teams/join', teamHandler.joinTeam);

// All remaining routes require auth + team context
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

// Attendance routes
const attendanceHandler = require('./handlers/attendanceHandler');
// Create attendance session (co-managers and owners only)
app.post('/api/attendance/sessions', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.createSession);
// Create manual attendance session (manager+ only)
app.post('/api/team/attendance/sessions/manual', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.createManualSession);
// List all attendance sessions
app.get('/api/attendance/sessions', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.listSessions);
// Get attendance session details
app.get('/api/attendance/sessions/:id', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getSession);
// Member check-in for session
app.post('/api/attendance/sessions/:id/check-in', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.memberCheckIn);
// Co-manager mark member absent
app.post('/api/attendance/sessions/:id/mark-absent', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.coManagerMarkAbsent);
// Close attendance session
app.post('/api/attendance/sessions/:id/close', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.closeSession);
// Get current month leaderboard
app.get('/api/attendance/leaderboard', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getLeaderboard);
// Get historical leaderboard by month
app.get('/api/attendance/leaderboard/:month', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getHistoricalLeaderboard);
// Get user attendance statistics
app.get('/api/attendance/stats/:userId', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getUserStats);
// Get attendance history
app.get('/api/attendance/history', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getAttendanceHistory);

// Team management routes (tenancy-scoped)
app.get('/api/team/members', rbacMiddleware(['member', 'co_manager', 'owner']), teamHandler.listMembers);
app.patch('/api/team/members/:userId/role', rbacMiddleware(['owner']), teamHandler.updateMemberRole);
app.get('/api/team/invite', rbacMiddleware(['owner', 'co_manager']), teamHandler.getInviteCode);
app.post('/api/team/invite/regenerate', rbacMiddleware(['owner']), teamHandler.regenerateInviteCode);
app.get('/api/team/settings', rbacMiddleware(['member', 'co_manager', 'owner']), teamHandler.getSettings);
app.put('/api/team/settings', rbacMiddleware(['owner']), teamHandler.updateSettings);

// Error handler (final middleware)
app.use((err, req, res, next) => {
    handleError(err, req, res, {
        team_id: req.user?.team_id,
        user_id: req.user?.user_id,
        path: req.path
    });
});

module.exports = app;

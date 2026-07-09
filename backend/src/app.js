const express = require('express');
const cors = require('cors');
const multer = require('multer');
const authMiddleware = require('./middleware/authMiddleware');
const tenancyMiddleware = require('./middleware/tenancyMiddleware');
const rbacMiddleware = require('./middleware/rbacMiddleware');
const { handleError } = require('./services/errorService');
const inngest = require('./config/inngest');

// Multer configuration for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
    fileFilter: (req, file, cb) => {
        const allowedMimes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
        if (allowedMimes.includes(file.mimetype)) {
            cb(null, true);
        } else {
            cb(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'));
        }
    }
});

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

// Inngest webhook — must be mounted BEFORE authMiddleware/tenancyMiddleware.
// Inngest Cloud calls this endpoint directly (sync + step invocation) without
// this app's JWT/team headers, so it cannot pass authMiddleware/tenancyMiddleware.
// Inngest's serve() handler verifies requests itself via the signing key.
const inngestHandler = require('./handlers/inngestHandler');
app.use('/api/inngest', inngestHandler);

// Protected routes (require auth, but NOT yet tenancy)
app.use(authMiddleware);

// Profile & account management (auth required, NOT tenancy-scoped)
const teamHandler = require('./handlers/teamHandler');
app.put('/api/profile', teamHandler.updateProfile);
app.put('/api/auth/password', teamHandler.changePassword);

// Team onboarding — auth required but no team context yet
app.post('/api/teams', teamHandler.createTeam);
app.post('/api/teams/join', teamHandler.joinTeam);

// Multi-team support — auth required but no specific team context needed
app.get('/api/user/teams', teamHandler.listUserTeams);
app.post('/api/teams/:teamId/switch', teamHandler.switchTeam);

// All remaining routes require auth + team context
app.use(tenancyMiddleware);

// Finance routes
const financeHandler = require('./handlers/financeHandler');
app.post('/api/finance/transactions', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.submitTransaction);
app.get('/api/finance/transactions', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.listTransactions);
app.get('/api/finance/transactions/:id', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getTransaction);
app.patch('/api/finance/transactions/:id/approve', rbacMiddleware(['co_manager', 'owner']), financeHandler.approveTransaction);
app.patch('/api/finance/transactions/:id/reject', rbacMiddleware(['co_manager', 'owner']), financeHandler.rejectTransaction);
app.get('/api/finance/approvals/pending', rbacMiddleware(['co_manager', 'owner']), financeHandler.getPendingApprovals);
app.get('/api/finance/balance', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getBalance);
app.get('/api/team/finance/closing-period', rbacMiddleware(['member', 'co_manager', 'owner']), financeHandler.getClosingPeriod);

// Campaign routes
const campaignHandler = require('./handlers/campaignHandler');
// Upload payment proof image (used before memberConfirm)
app.post('/api/campaigns/bill-image/upload', rbacMiddleware(['member', 'co_manager', 'owner']), upload.single('bill_image'), campaignHandler.uploadBillImage);
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
// ── Attendance sessions ──────────────────────────────────────────────────────
const attendanceHandler = require('./handlers/attendanceHandler');
app.post('/api/attendance/sessions', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.createSession);
app.get('/api/attendance/sessions', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.listSessions);
app.get('/api/attendance/sessions/:id', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getSession);
app.post('/api/attendance/sessions/:id/close', rbacMiddleware(['co_manager', 'owner']), attendanceHandler.closeSession);
app.get('/api/attendance/leaderboard', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getLeaderboard);
app.get('/api/attendance/leaderboard/:month', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getHistoricalLeaderboard);
app.get('/api/attendance/stats/:userId', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getUserStats);
app.get('/api/attendance/history', rbacMiddleware(['member', 'co_manager', 'owner']), attendanceHandler.getAttendanceHistory);

// ── Attendance checkins (member Yes/No responses) ────────────────────────────
const checkinHandler = require('./handlers/checkinHandler');
app.get('/api/attendance/checkin/active', rbacMiddleware(['member', 'co_manager', 'owner']), checkinHandler.getActiveCheckIn);
app.post('/api/attendance/checkin/:checkInId/respond', rbacMiddleware(['member', 'co_manager', 'owner']), checkinHandler.respondToCheckIn);
// Manager confirms/overrides a member's participation on their behalf.
app.patch('/api/attendance/checkin/:checkInId/confirm', rbacMiddleware(['co_manager', 'owner']), checkinHandler.managerRespondToCheckIn);
app.get('/api/attendance/sessions/:sessionId/checkin-stats', rbacMiddleware(['member', 'co_manager', 'owner']), checkinHandler.getCheckInStats);

// Team management routes (tenancy-scoped)
app.get('/api/team/members', rbacMiddleware(['member', 'co_manager', 'owner']), teamHandler.listMembers);
app.patch('/api/team/members/:userId/role', rbacMiddleware(['owner']), teamHandler.updateMemberRole);
app.get('/api/team/invite', rbacMiddleware(['owner', 'co_manager']), teamHandler.getInviteCode);
app.post('/api/team/invite/regenerate', rbacMiddleware(['owner']), teamHandler.regenerateInviteCode);
app.get('/api/team/settings', rbacMiddleware(['member', 'co_manager', 'owner']), teamHandler.getSettings);
app.put('/api/team/settings', rbacMiddleware(['owner']), teamHandler.updateSettings);
app.post('/api/team/settings/qr-code/upload', rbacMiddleware(['owner']), upload.single('qr_code'), teamHandler.uploadQRCode);
app.delete('/api/team/settings/qr-code', rbacMiddleware(['owner']), teamHandler.deleteQRCode);

// Team member management routes (tenancy-scoped)
app.put('/api/team/members/:memberId/deactivate', rbacMiddleware(['owner', 'co_manager']), teamHandler.deactivateMember);
app.put('/api/team/members/:memberId/kick', rbacMiddleware(['owner', 'co_manager']), teamHandler.kickMember);

// Jersey number update (tenancy-scoped via the global tenancyMiddleware applied above, self-update)
app.put('/api/members/jersey-number', teamHandler.updateJerseyNumber);

// Error handler (final middleware)
app.use((err, req, res, next) => {
    handleError(err, req, res, {
        team_id: req.user?.team_id,
        user_id: req.user?.user_id,
        path: req.path
    });
});

module.exports = app;

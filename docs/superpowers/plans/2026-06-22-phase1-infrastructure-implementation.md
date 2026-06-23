# Phase 1: Infrastructure Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a scalable multi-tenant backend infrastructure with authentication, event processing, and Zalo OA integration ready for Phase 2 business modules.

**Architecture:** Express.js backend with Supabase PostgreSQL (multi-tenant via Row-Level Security), JWT authentication with Zalo OAuth, Inngest for async event processing, and Zalo OA webhooks for messaging.

**Tech Stack:** Node.js/Express, Supabase PostgreSQL, JWT (jsonwebtoken), Zalo OAuth, Inngest, Winston (logging), Knex.js (query builder)

---

## File Structure Overview

**Backend directory structure (to be created):**
```
backend/
├── src/
│   ├── config/
│   │   ├── database.js          # Knex + Supabase connection
│   │   ├── auth.js              # JWT secret, expiration config
│   │   ├── zalo.js              # Zalo OAuth credentials
│   │   └── inngest.js           # Inngest client setup
│   ├── middleware/
│   │   ├── authMiddleware.js    # JWT verification + context extraction
│   │   ├── tenancyMiddleware.js # team_id injection + RLS
│   │   └── rbacMiddleware.js    # Role-based permission checks
│   ├── services/
│   │   ├── authService.js       # Zalo OAuth flow, token generation
│   │   ├── zaloService.js       # Zalo OA message sending, webhook parsing
│   │   ├── inngestService.js    # Event emission helper
│   │   └── errorService.js      # Error class definitions, handlers
│   ├── handlers/
│   │   ├── authHandler.js       # POST /auth/zalo/callback
│   │   ├── healthHandler.js     # GET /health
│   │   ├── zaloWebhookHandler.js # POST /api/zalo/webhook
│   │   └── inngestHandler.js    # POST /api/inngest (for events)
│   ├── inngest/
│   │   ├── events.js            # Event definitions + cron schedules
│   │   ├── handlers/
│   │   │   ├── monthlyReminder.js
│   │   │   ├── campaignDeadlineCheck.js
│   │   │   ├── transactionApproved.js
│   │   │   └── sessionClosed.js
│   │   └── utils/
│   │       └── retryPolicies.js
│   ├── utils/
│   │   ├── logger.js            # Winston logger instance
│   │   ├── validation.js        # Input validation helpers
│   │   └── deepLinks.js         # Deep link generation
│   ├── database/
│   │   └── migrations/          # Knex migration files
│   ├── app.js                   # Express app setup, middleware chain
│   └── index.js                 # Server entry point
├── tests/
│   ├── middleware/
│   │   ├── authMiddleware.test.js
│   │   ├── tenancyMiddleware.test.js
│   │   └── rbacMiddleware.test.js
│   ├── services/
│   │   ├── authService.test.js
│   │   └── zaloService.test.js
│   └── handlers/
│       └── zaloWebhookHandler.test.js
├── .env.example                 # Environment variables template
└── package.json                 # (already exists, will update)
```

---

## Task 1: Database Schema & Migration Setup

**Files:**
- Create: `backend/src/config/database.js`
- Create: `backend/src/database/migrations/001_initial_schema.js`
- Create: `backend/src/database/migrations/002_rls_policies.js`
- Modify: `backend/package.json` (add dependencies)

- [ ] **Step 1: Install Knex and database dependencies**

Run:
```bash
cd backend
npm install knex@3.1.0 pg@8.11.3 dotenv@16.4.5 --save
npm install -D knex-cli
```

- [ ] **Step 2: Create Knex configuration file**

Create `backend/src/config/database.js`:
```javascript
const knex = require('knex');
require('dotenv').config();

const config = {
  client: 'pg',
  connection: {
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
  },
  pool: { min: 2, max: 10 },
  migrations: {
    directory: './src/database/migrations',
    extension: 'js'
  }
};

const db = knex(config);

module.exports = db;
```

- [ ] **Step 3: Create initial schema migration**

Create `backend/src/database/migrations/001_initial_schema.js`:
```javascript
exports.up = async (knex) => {
  // teams table
  await knex.schema.createTable('teams', (table) => {
    table.bigIncrements('id').primary();
    table.string('name', 255).notNullable();
    table.text('description');
    table.bigInteger('owner_id').references('users.id');
    table.string('viet_qr_account', 255);
    table.string('viet_qr_bank_account', 255);
    table.string('viet_qr_bank_name', 255);
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
  });

  // users table
  await knex.schema.createTable('users', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
    table.string('email', 255).notNullable();
    table.string('full_name', 255);
    table.string('zalo_user_id', 255);
    table.string('phone', 20);
    table.string('role', 50).notNullable(); // 'owner', 'co_manager', 'member'
    table.string('status', 50).defaultTo('active'); // 'active', 'inactive'
    table.timestamp('deactivated_at').nullable();
    table.timestamp('last_login_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('deleted_at').nullable();
    table.unique(['team_id', 'email']);
    table.unique(['team_id', 'zalo_user_id']);
    table.index(['team_id', 'status']);
    table.index(['team_id', 'role']);
  });

  // fund_campaigns table
  await knex.schema.createTable('fund_campaigns', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
    table.string('name', 255).notNullable();
    table.text('description');
    table.string('campaign_type', 50).notNullable(); // 'monthly', 'ad_hoc'
    table.decimal('amount_per_member', 12, 2);
    table.decimal('total_target_amount', 12, 2);
    table.string('cashflow_category', 50);
    table.string('status', 50).defaultTo('active');
    table.timestamp('deadline').nullable();
    table.bigInteger('created_by').notNullable().references('users.id');
    table.string('member_scope', 50).notNullable(); // 'all_active', 'selected_members'
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.index(['team_id', 'deadline']);
  });

  // fund_transactions table
  await knex.schema.createTable('fund_transactions', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
    table.bigInteger('campaign_id').references('fund_campaigns.id');
    table.bigInteger('submitted_by').notNullable().references('users.id');
    table.decimal('amount', 12, 2).notNullable();
    table.string('status', 50).defaultTo('pending');
    table.text('rejection_reason');
    table.string('bill_image_url', 255);
    table.timestamp('transaction_date').notNullable();
    table.bigInteger('approved_by').references('users.id');
    table.timestamp('approved_at').nullable();
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.timestamp('updated_at').defaultTo(knex.fn.now());
    table.checkRaw('amount > 0');
    table.index(['team_id', 'status']);
    table.index(['campaign_id']);
  });

  // campaign_assignments table
  await knex.schema.createTable('campaign_assignments', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('campaign_id').notNullable().references('fund_campaigns.id').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.string('status', 50).defaultTo('unpaid');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['campaign_id', 'user_id']);
  });

  // attendance_records table
  await knex.schema.createTable('attendance_records', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').notNullable().references('teams.id').onDelete('CASCADE');
    table.bigInteger('user_id').notNullable().references('users.id').onDelete('CASCADE');
    table.timestamp('session_date').notNullable();
    table.boolean('attended').defaultTo(true);
    table.text('notes');
    table.bigInteger('created_by').notNullable().references('users.id');
    table.timestamp('created_at').defaultTo(knex.fn.now());
    table.unique(['team_id', 'user_id', 'session_date']);
    table.index(['team_id', 'user_id']);
  });

  // inngest_logs table
  await knex.schema.createTable('inngest_logs', (table) => {
    table.bigIncrements('id').primary();
    table.bigInteger('team_id').references('teams.id');
    table.string('event_name', 255).notNullable();
    table.jsonb('event_data');
    table.string('status', 50);
    table.text('error_message');
    table.integer('attempt_count').defaultTo(1);
    table.timestamp('created_at').defaultTo(knex.fn.now());
  });
};

exports.down = async (knex) => {
  await knex.schema.dropTable('inngest_logs');
  await knex.schema.dropTable('attendance_records');
  await knex.schema.dropTable('campaign_assignments');
  await knex.schema.dropTable('fund_transactions');
  await knex.schema.dropTable('fund_campaigns');
  await knex.schema.dropTable('users');
  await knex.schema.dropTable('teams');
};
```

- [ ] **Step 4: Create RLS policies migration**

Create `backend/src/database/migrations/002_rls_policies.js`:
```javascript
exports.up = async (knex) => {
  // Enable RLS on all business tables
  await knex.raw('ALTER TABLE teams ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE users ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE fund_campaigns ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE fund_transactions ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE campaign_assignments ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE inngest_logs ENABLE ROW LEVEL SECURITY');

  // fund_transactions RLS policies
  await knex.raw(`
    CREATE POLICY "Users can view their team's transactions"
    ON fund_transactions
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Only owner/co_manager can approve transactions"
    ON fund_transactions
    FOR UPDATE
    USING (team_id = (current_setting('app.current_team_id'))::bigint
      AND (current_setting('app.current_role')) IN ('owner', 'co_manager'));
  `);

  // Similar policies for other tables...
  await knex.raw(`
    CREATE POLICY "Users can view their team's records"
    ON users
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Users can view their team's campaigns"
    ON fund_campaigns
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);

  await knex.raw(`
    CREATE POLICY "Users can view attendance for their team"
    ON attendance_records
    FOR SELECT
    USING (team_id = (current_setting('app.current_team_id'))::bigint);
  `);
};

exports.down = async (knex) => {
  await knex.raw('ALTER TABLE teams DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE users DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE fund_campaigns DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE fund_transactions DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE campaign_assignments DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE attendance_records DISABLE ROW LEVEL SECURITY');
  await knex.raw('ALTER TABLE inngest_logs DISABLE ROW LEVEL SECURITY');
};
```

- [ ] **Step 5: Run migrations to verify**

Run:
```bash
npx knex migrate:latest --knexfile src/config/database.js
```

Expected: Migration runs without errors, tables created in PostgreSQL.

- [ ] **Step 6: Commit**

```bash
git add backend/src/config/database.js backend/src/database/migrations/
git add backend/package.json backend/package-lock.json
git commit -m "feat: database schema migrations with RLS policies"
```

---

## Task 2: Authentication Middleware & JWT Setup

**Files:**
- Create: `backend/src/config/auth.js`
- Create: `backend/src/services/authService.js`
- Create: `backend/src/middleware/authMiddleware.js`
- Create: `backend/tests/middleware/authMiddleware.test.js`
- Modify: `backend/package.json` (add jsonwebtoken)

- [ ] **Step 1: Install JWT dependencies**

Run:
```bash
cd backend
npm install jsonwebtoken@9.1.2 axios@1.7.7 --save
npm install -D jest@29.7.0 @types/jest@29.5.12
```

- [ ] **Step 2: Create JWT configuration**

Create `backend/src/config/auth.js`:
```javascript
require('dotenv').config();

module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-change-in-production',
  jwtExpiration: '24h',
  refreshTokenExpiration: '7d',
  zaloAppId: process.env.ZALO_APP_ID,
  zaloAppSecret: process.env.ZALO_APP_SECRET,
  zaloOAuthRedirectUri: process.env.ZALO_OAUTH_REDIRECT_URI || 'http://localhost:3000/auth/zalo/callback'
};
```

- [ ] **Step 3: Create auth service with JWT generation**

Create `backend/src/services/authService.js`:
```javascript
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { jwtSecret, jwtExpiration, zaloAppId, zaloAppSecret } = require('../config/auth');

class AuthService {
  generateJWT(user) {
    const payload = {
      user_id: user.id,
      team_id: user.team_id,
      email: user.email,
      role: user.role,
      zalo_user_id: user.zalo_user_id
    };

    return jwt.sign(payload, jwtSecret, { expiresIn: jwtExpiration });
  }

  verifyJWT(token) {
    try {
      return jwt.verify(token, jwtSecret);
    } catch (error) {
      throw new Error(`JWT verification failed: ${error.message}`);
    }
  }

  decodeJWT(token) {
    return jwt.decode(token);
  }

  async exchangeZaloCode(code) {
    try {
      const response = await axios.post('https://oauth.zaloapp.com/v4/access_token', {
        app_id: zaloAppId,
        app_secret: zaloAppSecret,
        code
      });

      return response.data.access_token;
    } catch (error) {
      throw new Error(`Zalo OAuth exchange failed: ${error.message}`);
    }
  }

  async fetchZaloUserInfo(accessToken) {
    try {
      const response = await axios.get('https://graph.zalo.me/v2.0/me', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });

      return {
        zalo_user_id: response.data.id,
        email: response.data.email,
        full_name: response.data.name,
        avatar_url: response.data.avatar
      };
    } catch (error) {
      throw new Error(`Zalo user fetch failed: ${error.message}`);
    }
  }
}

module.exports = new AuthService();
```

- [ ] **Step 4: Create auth middleware**

Create `backend/src/middleware/authMiddleware.js`:
```javascript
const authService = require('../services/authService');

const authMiddleware = (req, res, next) => {
  try {
    // Extract token from Authorization header or cookies
    const authHeader = req.headers.authorization || '';
    const token = authHeader.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: 'Missing authentication token' });
    }

    // Verify and decode token
    const decoded = authService.verifyJWT(token);

    // Attach user context to request
    req.user = decoded;
    req.teamId = decoded.team_id;

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

module.exports = authMiddleware;
```

- [ ] **Step 5: Write failing test for auth middleware**

Create `backend/tests/middleware/authMiddleware.test.js`:
```javascript
const authMiddleware = require('../../src/middleware/authMiddleware');
const authService = require('../../src/services/authService');

jest.mock('../../src/services/authService');

describe('authMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      headers: {}
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should attach user context to req when valid token provided', () => {
    const mockUser = {
      user_id: 123,
      team_id: 456,
      email: 'test@example.com',
      role: 'member'
    };

    req.headers.authorization = 'Bearer valid-token';
    authService.verifyJWT.mockReturnValue(mockUser);

    authMiddleware(req, res, next);

    expect(req.user).toEqual(mockUser);
    expect(req.teamId).toBe(456);
    expect(next).toHaveBeenCalled();
  });

  test('should return 401 when token is missing', () => {
    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Missing authentication token' });
    expect(next).not.toHaveBeenCalled();
  });

  test('should return 401 when token is invalid', () => {
    req.headers.authorization = 'Bearer invalid-token';
    authService.verifyJWT.mockImplementation(() => {
      throw new Error('Invalid token');
    });

    authMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'Invalid or expired token' });
  });
});
```

- [ ] **Step 6: Run tests to verify they pass**

Run:
```bash
npm test -- tests/middleware/authMiddleware.test.js
```

Expected: All 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/auth.js backend/src/services/authService.js
git add backend/src/middleware/authMiddleware.js backend/tests/middleware/authMiddleware.test.js
git add backend/package.json backend/package-lock.json
git commit -m "feat: JWT authentication middleware and service"
```

---

## Task 3: Tenancy Middleware & RLS Integration

**Files:**
- Create: `backend/src/middleware/tenancyMiddleware.js`
- Create: `backend/tests/middleware/tenancyMiddleware.test.js`

- [ ] **Step 1: Write failing test for tenancy middleware**

Create `backend/tests/middleware/tenancyMiddleware.test.js`:
```javascript
const tenancyMiddleware = require('../../src/middleware/tenancyMiddleware');

describe('tenancyMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        user_id: 123,
        team_id: 456
      },
      app: {
        set: jest.fn()
      }
    };
    res = {};
    next = jest.fn();
  });

  test('should set team_id in app context from user', () => {
    tenancyMiddleware(req, res, next);

    expect(req.app.set).toHaveBeenCalledWith('team_id', 456);
    expect(next).toHaveBeenCalled();
  });

  test('should return 403 if user has no team_id', () => {
    req.user = { user_id: 123 };
    res.status = jest.fn().mockReturnThis();
    res.json = jest.fn();

    tenancyMiddleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 2: Create tenancy middleware**

Create `backend/src/middleware/tenancyMiddleware.js`:
```javascript
const tenancyMiddleware = (req, res, next) => {
  if (!req.user || !req.user.team_id) {
    return res.status(403).json({ error: 'Missing team context' });
  }

  // Store team_id in app context for all database queries
  req.app.set('team_id', req.user.team_id);
  req.app.set('current_role', req.user.role);

  // Add helper to automatically scope queries
  req.teamScope = (query) => {
    return query.where('team_id', req.user.team_id);
  };

  next();
};

module.exports = tenancyMiddleware;
```

- [ ] **Step 3: Run tenancy tests**

Run:
```bash
npm test -- tests/middleware/tenancyMiddleware.test.js
```

Expected: Both tests pass.

- [ ] **Step 4: Create RBAC middleware test**

Create `backend/tests/middleware/rbacMiddleware.test.js`:
```javascript
const rbacMiddleware = require('../../src/middleware/rbacMiddleware');

describe('rbacMiddleware', () => {
  let req, res, next;

  beforeEach(() => {
    req = {
      user: {
        role: 'member'
      }
    };
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn()
    };
    next = jest.fn();
  });

  test('should allow access if user role matches required roles', () => {
    const rbac = rbacMiddleware(['member', 'owner']);

    rbac(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.status).not.toHaveBeenCalled();
  });

  test('should deny access if user role does not match', () => {
    const rbac = rbacMiddleware(['owner', 'co_manager']);

    rbac(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith({ error: 'Insufficient permissions' });
    expect(next).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 5: Create RBAC middleware**

Create `backend/src/middleware/rbacMiddleware.js`:
```javascript
const rbacMiddleware = (requiredRoles) => {
  return (req, res, next) => {
    if (!req.user || !req.user.role) {
      return res.status(401).json({ error: 'User role not found' });
    }

    if (!requiredRoles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    next();
  };
};

module.exports = rbacMiddleware;
```

- [ ] **Step 6: Run all middleware tests**

Run:
```bash
npm test -- tests/middleware/
```

Expected: All 5 tests pass (3 auth + 2 tenancy + placeholder for rbac).

- [ ] **Step 7: Commit**

```bash
git add backend/src/middleware/tenancyMiddleware.js backend/src/middleware/rbacMiddleware.js
git add backend/tests/middleware/
git commit -m "feat: tenancy and RBAC middleware for multi-tenant isolation"
```

---

## Task 4: Express App Setup & Middleware Chain

**Files:**
- Create: `backend/src/app.js`
- Create: `backend/src/index.js`
- Create: `backend/.env.example`
- Modify: `backend/package.json`

- [ ] **Step 1: Install Express dependencies**

Run:
```bash
cd backend
npm install express@4.19.2 cors@2.8.5 --save
```

- [ ] **Step 2: Create Express app with middleware chain**

Create `backend/src/app.js`:
```javascript
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
app.post('/auth/zalo/callback', require('./handlers/authHandler'));

// Protected routes (require auth + tenancy)
app.use(authMiddleware);
app.use(tenancyMiddleware);

// Zalo webhook (verify signature before processing)
app.post('/api/zalo/webhook', require('./handlers/zaloWebhookHandler'));

// Inngest webhook
app.post('/api/inngest', require('./handlers/inngestHandler'));

// Error handler (final middleware)
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(err.statusCode || 500).json({
    error: err.message || 'Internal server error',
    code: err.code || 'INTERNAL_ERROR'
  });
});

module.exports = app;
```

- [ ] **Step 3: Create server entry point**

Create `backend/src/index.js`:
```javascript
require('dotenv').config();
const app = require('./app');
const db = require('./config/database');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 3001;

// Test database connection
db.raw('SELECT 1')
  .then(() => {
    logger.info('Database connection successful');
    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
    });
  })
  .catch((err) => {
    logger.error('Database connection failed', { error: err.message });
    process.exit(1);
  });
```

- [ ] **Step 4: Create .env.example template**

Create `backend/.env.example`:
```env
# Database
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your-password
DB_NAME=football_team_db
DB_SSL=false

# JWT
JWT_SECRET=your-super-secret-key-change-in-production

# Zalo OAuth
ZALO_APP_ID=your-zalo-app-id
ZALO_APP_SECRET=your-zalo-app-secret
ZALO_OAUTH_REDIRECT_URI=https://api.myteam.revonexus.net/auth/zalo/callback

# Zalo OA
ZALO_OA_ACCOUNT_ID=your-oa-account-id
ZALO_OA_ACCESS_TOKEN=your-oa-access-token
ZALO_OA_WEBHOOK_VERIFY_TOKEN=your-webhook-verify-token

# Inngest
INNGEST_EVENT_KEY=your-inngest-event-key
INNGEST_SIGNING_KEY=your-inngest-signing-key

# Server
PORT=3001
NODE_ENV=development
```

- [ ] **Step 5: Update package.json scripts**

Update `backend/package.json` scripts section:
```json
{
  "scripts": {
    "start": "node src/index.js",
    "dev": "nodemon src/index.js",
    "test": "jest",
    "test:watch": "jest --watch",
    "migrate": "knex migrate:latest --knexfile src/config/database.js",
    "migrate:rollback": "knex migrate:rollback --knexfile src/config/database.js"
  }
}
```

- [ ] **Step 6: Test app startup**

Run:
```bash
NODE_ENV=test npm run dev
```

Expected: Server logs "Database connection successful" and "Server running on port 3001".

- [ ] **Step 7: Commit**

```bash
git add backend/src/app.js backend/src/index.js backend/.env.example
git add backend/package.json backend/package-lock.json
git commit -m "feat: Express app setup with middleware chain"
```

---

## Task 5: Error Handling & Logging System

**Files:**
- Create: `backend/src/utils/logger.js`
- Create: `backend/src/services/errorService.js`
- Create: `backend/tests/services/errorService.test.js`

- [ ] **Step 1: Install logging dependencies**

Run:
```bash
cd backend
npm install winston@3.14.2 --save
```

- [ ] **Step 2: Create Winston logger**

Create `backend/src/utils/logger.js`:
```javascript
const winston = require('winston');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { service: 'football-backend' },
  transports: [
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error'
    }),
    new winston.transports.File({
      filename: 'logs/combined.log'
    })
  ]
});

// Console logging in development
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple()
    )
  }));
}

module.exports = logger;
```

- [ ] **Step 3: Create error service with custom error classes**

Create `backend/src/services/errorService.js`:
```javascript
const logger = require('../utils/logger');

class BusinessError extends Error {
  constructor(code, message, statusCode = 400) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.name = 'BusinessError';
  }
}

class ValidationError extends BusinessError {
  constructor(message, details = {}) {
    super('VALIDATION_ERROR', message, 400);
    this.details = details;
  }
}

class AuthenticationError extends BusinessError {
  constructor(message = 'Authentication failed') {
    super('AUTH_ERROR', message, 401);
  }
}

class AuthorizationError extends BusinessError {
  constructor(message = 'Access denied') {
    super('RBAC_ERROR', message, 403);
  }
}

class NotFoundError extends BusinessError {
  constructor(resource, id) {
    super('NOT_FOUND', `${resource} with id ${id} not found`, 404);
  }
}

class ConflictError extends BusinessError {
  constructor(message) {
    super('CONFLICT', message, 409);
  }
}

const handleError = (error, req, res, context = {}) => {
  if (error instanceof BusinessError) {
    logger.warn(`Business error: ${error.code}`, {
      code: error.code,
      message: error.message,
      statusCode: error.statusCode,
      ...context
    });
    return res.status(error.statusCode).json({
      error: error.message,
      code: error.code,
      details: error.details || undefined
    });
  }

  // Unknown error
  logger.error('Unhandled error', {
    message: error.message,
    stack: error.stack,
    ...context
  });

  return res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

module.exports = {
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError,
  handleError
};
```

- [ ] **Step 4: Write tests for error service**

Create `backend/tests/services/errorService.test.js`:
```javascript
const {
  BusinessError,
  ValidationError,
  AuthenticationError,
  AuthorizationError,
  NotFoundError,
  ConflictError
} = require('../../src/services/errorService');

describe('Error Classes', () => {
  test('BusinessError has correct properties', () => {
    const error = new BusinessError('TEST_ERROR', 'Test message', 400);
    expect(error.code).toBe('TEST_ERROR');
    expect(error.message).toBe('Test message');
    expect(error.statusCode).toBe(400);
  });

  test('ValidationError inherits from BusinessError', () => {
    const error = new ValidationError('Invalid input', { field: 'email' });
    expect(error.code).toBe('VALIDATION_ERROR');
    expect(error.statusCode).toBe(400);
    expect(error.details).toEqual({ field: 'email' });
  });

  test('AuthenticationError has 401 status', () => {
    const error = new AuthenticationError('Invalid credentials');
    expect(error.statusCode).toBe(401);
    expect(error.code).toBe('AUTH_ERROR');
  });

  test('AuthorizationError has 403 status', () => {
    const error = new AuthorizationError('Insufficient permissions');
    expect(error.statusCode).toBe(403);
    expect(error.code).toBe('RBAC_ERROR');
  });

  test('NotFoundError creates correct message', () => {
    const error = new NotFoundError('User', 123);
    expect(error.message).toBe('User with id 123 not found');
    expect(error.statusCode).toBe(404);
  });

  test('ConflictError has 409 status', () => {
    const error = new ConflictError('Resource already exists');
    expect(error.statusCode).toBe(409);
    expect(error.code).toBe('CONFLICT');
  });
});
```

- [ ] **Step 5: Run error service tests**

Run:
```bash
npm test -- tests/services/errorService.test.js
```

Expected: All 6 tests pass.

- [ ] **Step 6: Update app.js error handler to use errorService**

Modify `backend/src/app.js` error handler:
```javascript
const { handleError } = require('./services/errorService');

// At bottom of app.js, replace error handler with:
app.use((err, req, res, next) => {
  handleError(err, req, res, {
    team_id: req.user?.team_id,
    user_id: req.user?.user_id,
    path: req.path
  });
});
```

- [ ] **Step 7: Commit**

```bash
git add backend/src/utils/logger.js backend/src/services/errorService.js
git add backend/tests/services/errorService.test.js
git add backend/src/app.js
git commit -m "feat: error handling and logging system"
```

---

## Task 6: Zalo OAuth Integration Handler

**Files:**
- Create: `backend/src/handlers/authHandler.js`
- Create: `backend/tests/handlers/authHandler.test.js`
- Modify: `backend/src/database/seeds/` (optional seed data)

- [ ] **Step 1: Write failing test for auth handler**

Create `backend/tests/handlers/authHandler.test.js`:
```javascript
const db = require('../../src/config/database');
const authService = require('../../src/services/authService');
const authHandler = require('../../src/handlers/authHandler');

jest.mock('../../src/config/database');
jest.mock('../../src/services/authService');

describe('POST /auth/zalo/callback', () => {
  let req, res;

  beforeEach(() => {
    req = { query: { code: 'auth-code-123' } };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should create JWT and return user data for new user', async () => {
    const zaloUserData = {
      zalo_user_id: 'zuid-001',
      email: 'newuser@example.com',
      full_name: 'New Player'
    };

    authService.exchangeZaloCode.mockResolvedValue('access-token');
    authService.fetchZaloUserInfo.mockResolvedValue(zaloUserData);
    authService.generateJWT.mockReturnValue('jwt-token-123');

    db.query = jest.fn().mockResolvedValue(null); // User not found

    await authHandler(req, res);

    expect(authService.exchangeZaloCode).toHaveBeenCalledWith('auth-code-123');
    expect(authService.fetchZaloUserInfo).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        token: 'jwt-token-123',
        user: expect.objectContaining({
          email: 'newuser@example.com'
        })
      })
    );
  });

  test('should return 400 for invalid code', async () => {
    authService.exchangeZaloCode.mockRejectedValue(new Error('Invalid code'));

    await authHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
  });
});
```

- [ ] **Step 2: Create auth handler**

Create `backend/src/handlers/authHandler.js`:
```javascript
const db = require('../config/database');
const authService = require('../services/authService');
const { handleError, ValidationError } = require('../services/errorService');
const logger = require('../utils/logger');

const authHandler = async (req, res) => {
  try {
    const { code } = req.query;

    if (!code) {
      throw new ValidationError('Authorization code is required');
    }

    logger.info('Zalo OAuth callback initiated', { code: code.substring(0, 10) });

    // Exchange code for access token
    const accessToken = await authService.exchangeZaloCode(code);

    // Fetch user info from Zalo
    const zaloUserData = await authService.fetchZaloUserInfo(accessToken);
    logger.info('Zalo user info fetched', { zalo_user_id: zaloUserData.zalo_user_id });

    // Check if user exists in database
    let user = await db('users')
      .where('zalo_user_id', zaloUserData.zalo_user_id)
      .first();

    if (!user) {
      logger.info('New user detected, creating team and user', {
        zalo_user_id: zaloUserData.zalo_user_id,
        email: zaloUserData.email
      });

      // Create new team for user (as owner)
      const [teamId] = await db('teams').insert({
        name: `Team of ${zaloUserData.full_name}`,
        description: 'Default team',
        created_at: new Date()
      });

      // Create user in team as owner
      const [userId] = await db('users').insert({
        team_id: teamId,
        email: zaloUserData.email,
        full_name: zaloUserData.full_name,
        zalo_user_id: zaloUserData.zalo_user_id,
        role: 'owner',
        status: 'active',
        created_at: new Date()
      });

      user = await db('users').where('id', userId).first();
    } else {
      // Update last login
      await db('users').where('id', user.id).update({
        last_login_at: new Date()
      });
    }

    // Generate JWT
    const token = authService.generateJWT(user);

    logger.info('User authenticated successfully', { user_id: user.id, team_id: user.team_id });

    return res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        team_id: user.team_id
      }
    });
  } catch (error) {
    return handleError(error, req, res, {
      endpoint: '/auth/zalo/callback'
    });
  }
};

module.exports = authHandler;
```

- [ ] **Step 3: Update app.js to use auth handler**

Modify `backend/src/app.js`:
```javascript
// Around line 17 where auth routes are defined:
const authHandler = require('./handlers/authHandler');
app.post('/auth/zalo/callback', authHandler);
```

- [ ] **Step 4: Run auth handler tests**

Run:
```bash
npm test -- tests/handlers/authHandler.test.js
```

Expected: 2 tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/handlers/authHandler.js backend/tests/handlers/authHandler.test.js
git add backend/src/app.js
git commit -m "feat: Zalo OAuth callback handler with user/team creation"
```

---

## Task 7: Inngest Setup & Event Definitions

**Files:**
- Create: `backend/src/config/inngest.js`
- Create: `backend/src/inngest/events.js`
- Create: `backend/src/handlers/inngestHandler.js`
- Modify: `backend/package.json`

- [ ] **Step 1: Install Inngest dependencies**

Run:
```bash
cd backend
npm install inngest@3.20.0 --save
```

- [ ] **Step 2: Create Inngest client configuration**

Create `backend/src/config/inngest.js`:
```javascript
const { Inngest } = require('inngest');

const inngest = new Inngest({
  id: 'football-backend',
  eventKey: process.env.INNGEST_EVENT_KEY,
  signingKey: process.env.INNGEST_SIGNING_KEY
});

module.exports = inngest;
```

- [ ] **Step 3: Define events and cron schedules**

Create `backend/src/inngest/events.js`:
```javascript
const inngest = require('../config/inngest');

// Event definitions
const events = {
  // Finance events
  FUND_MONTHLY_REMINDER: 'fund.monthly-reminder',
  FUND_CAMPAIGN_DEADLINE_24H: 'fund.campaign-deadline-24h',
  FUND_TRANSACTION_APPROVED: 'fund.transaction-approved',

  // Attendance events
  ATTENDANCE_SESSION_CLOSED: 'attendance.session-closed',

  // Zalo events
  ZALO_MESSAGE_FAILED: 'zalo.message-failed'
};

// Define functions (to be implemented in separate files)
const createMonthlyReminderFunction = inngest.createFunction(
  { id: 'fund.monthly-reminder' },
  { cron: '0 1 1 * *' }, // 1st of month at 01:00 UTC
  async ({ event, step }) => {
    // Placeholder - implemented in next task
    return { status: 'scheduled' };
  }
);

const createCampaignDeadlineCheckFunction = inngest.createFunction(
  { id: 'fund.campaign-deadline-check' },
  { cron: '0 23 * * *' }, // Daily at 23:00 UTC (06:00 UTC+7)
  async ({ event, step }) => {
    // Placeholder - implemented in next task
    return { status: 'scheduled' };
  }
);

module.exports = {
  events,
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
};
```

- [ ] **Step 4: Create Inngest handler**

Create `backend/src/handlers/inngestHandler.js`:
```javascript
const { serve } = require('inngest/express');
const inngest = require('../config/inngest');
const {
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
} = require('../inngest/events');

// Register all functions
const functions = [
  createMonthlyReminderFunction,
  createCampaignDeadlineCheckFunction
];

// Export handler
const inngestHandler = serve({
  client: inngest,
  functions
});

module.exports = inngestHandler;
```

- [ ] **Step 5: Update app.js to use Inngest handler**

Modify `backend/src/app.js`:
```javascript
// Add after other imports:
const inngestHandler = require('./handlers/inngestHandler');

// Add after Zalo webhook route (around line 30):
app.use('/api/inngest', inngestHandler);
```

- [ ] **Step 6: Verify Inngest configuration**

Run:
```bash
npm run dev
```

Check logs for: "Inngest client initialized" or similar Inngest startup message.

- [ ] **Step 7: Commit**

```bash
git add backend/src/config/inngest.js backend/src/inngest/events.js
git add backend/src/handlers/inngestHandler.js backend/src/app.js
git add backend/package.json backend/package-lock.json
git commit -m "feat: Inngest event bus setup with cron scheduling"
```

---

## Task 8: Inngest Event Handlers - Monthly Reminder

**Files:**
- Create: `backend/src/inngest/handlers/monthlyReminder.js`
- Create: `backend/src/services/zaloService.js`
- Create: `backend/tests/inngest/handlers/monthlyReminder.test.js`

- [ ] **Step 1: Create Zalo service for message sending**

Create `backend/src/services/zaloService.js`:
```javascript
const axios = require('axios');
const logger = require('../utils/logger');

class ZaloService {
  constructor() {
    this.oaAccountId = process.env.ZALO_OA_ACCOUNT_ID;
    this.accessToken = process.env.ZALO_OA_ACCESS_TOKEN;
  }

  async sendUtilityMessage(zaloUserId, message) {
    try {
      const response = await axios.post(
        'https://openapi.zalo.me/v3.0/oa/message/send',
        {
          recipient: { user_id: zaloUserId },
          message: { text: message }
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Zalo utility message sent', {
        zalo_user_id: zaloUserId,
        message_length: message.length
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send Zalo message', {
        zalo_user_id: zaloUserId,
        error: error.message
      });
      throw error;
    }
  }

  async sendZNS(zaloUserId, templateId, templateData) {
    try {
      const response = await axios.post(
        'https://openapi.zalo.me/v3.0/oa/message/zns/send',
        {
          recipient: { user_id: zaloUserId },
          template_id: templateId,
          template_data: templateData
        },
        {
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      logger.info('Zalo ZNS message sent', {
        zalo_user_id: zaloUserId,
        template_id: templateId
      });

      return response.data;
    } catch (error) {
      logger.error('Failed to send ZNS message', {
        zalo_user_id: zaloUserId,
        template_id: templateId,
        error: error.message
      });
      throw error;
    }
  }
}

module.exports = new ZaloService();
```

- [ ] **Step 2: Write failing test for monthly reminder handler**

Create `backend/tests/inngest/handlers/monthlyReminder.test.js`:
```javascript
const db = require('../../../src/config/database');
const zaloService = require('../../../src/services/zaloService');
const monthlyReminderHandler = require('../../../src/inngest/handlers/monthlyReminder');

jest.mock('../../../src/config/database');
jest.mock('../../../src/services/zaloService');

describe('Monthly Reminder Handler', () => {
  test('should fetch all active teams and send reminders', async () => {
    const mockTeams = [
      { id: 1, name: 'Team A' },
      { id: 2, name: 'Team B' }
    ];

    const mockMembers = [
      { zalo_user_id: 'zuid-001', full_name: 'Player 1' },
      { zalo_user_id: 'zuid-002', full_name: 'Player 2' }
    ];

    db.query = jest.fn()
      .mockResolvedValueOnce(mockTeams) // First query: teams
      .mockResolvedValue(mockMembers);   // Subsequent queries: members per team

    zaloService.sendUtilityMessage.mockResolvedValue({ success: true });

    const result = await monthlyReminderHandler({ step: { run: (id, fn) => fn() } });

    expect(result.processed).toBe(2); // 2 teams
    expect(zaloService.sendUtilityMessage.mock.calls.length).toBe(4); // 2 teams * 2 members
  });
});
```

- [ ] **Step 3: Implement monthly reminder handler**

Create `backend/src/inngest/handlers/monthlyReminder.js`:
```javascript
const db = require('../../config/database');
const zaloService = require('../../services/zaloService');
const logger = require('../../utils/logger');
const inngest = require('../../config/inngest');

const monthlyReminderHandler = inngest.createFunction(
  {
    id: 'fund.monthly-reminder',
    retryOptions: { maxRetries: 3, initialDelayMs: 300000 } // 5min, 10min, 20min
  },
  { cron: '0 1 1 * *' }, // 1st of month at 01:00 UTC
  async ({ event, step }) => {
    logger.info('Monthly reminder job started');

    // Step 1: Fetch all active teams
    const teams = await step.run('fetch-teams', async () => {
      return db('teams')
        .where('deleted_at', null)
        .select('id', 'name');
    });

    logger.info('Teams fetched for reminder', { count: teams.length });

    // Step 2: For each team, fetch active members and send reminders
    let totalMessagesQueued = 0;

    for (const team of teams) {
      await step.run(`process-team-${team.id}`, async () => {
        const activeMembers = await db('users')
          .where('team_id', team.id)
          .where('status', 'active')
          .select('id', 'zalo_user_id', 'full_name');

        logger.info(`Processing team ${team.id} with ${activeMembers.length} active members`);

        for (const member of activeMembers) {
          try {
            const currentMonth = new Date().toLocaleString('vi-VN', { month: 'long', year: 'numeric' });
            const message = `📢 Nhắc nợ quỹ tháng ${currentMonth}\n\nVui lòng thanh toán trước hết hạn.\nhttps://myteam.revonexus.net/fund`;

            await zaloService.sendUtilityMessage(member.zalo_user_id, message);
            totalMessagesQueued++;
          } catch (error) {
            logger.error('Failed to send reminder', {
              team_id: team.id,
              member_id: member.id,
              error: error.message
            });
            // Continue with next member on error
          }
        }
      });
    }

    logger.info('Monthly reminder job completed', { totalMessagesQueued });

    return {
      processed: teams.length,
      messagesQueued: totalMessagesQueued
    };
  }
);

module.exports = monthlyReminderHandler;
```

- [ ] **Step 4: Register monthly reminder handler in events.js**

Update `backend/src/inngest/events.js`:
```javascript
const monthlyReminderHandler = require('./handlers/monthlyReminder');

// At end of exports:
module.exports = {
  events,
  createMonthlyReminderFunction: monthlyReminderHandler,
  createCampaignDeadlineCheckFunction
  // ... existing
};
```

- [ ] **Step 5: Run monthly reminder tests**

Run:
```bash
npm test -- tests/inngest/handlers/monthlyReminder.test.js
```

Expected: 1 test passes.

- [ ] **Step 6: Commit**

```bash
git add backend/src/services/zaloService.js
git add backend/src/inngest/handlers/monthlyReminder.js
git add backend/src/inngest/events.js
git add backend/tests/inngest/handlers/monthlyReminder.test.js
git commit -m "feat: Inngest monthly reminder handler with Zalo messaging"
```

---

## Task 9: Zalo Webhook Handler & Deep Links

**Files:**
- Create: `backend/src/handlers/zaloWebhookHandler.js`
- Create: `backend/src/utils/deepLinks.js`
- Create: `backend/tests/handlers/zaloWebhookHandler.test.js`

- [ ] **Step 1: Create deep link utility**

Create `backend/src/utils/deepLinks.js`:
```javascript
const BASE_URL = process.env.FRONTEND_URL || 'https://myteam.revonexus.net';

const deepLinks = {
  fundCampaign: (campaignId, action = 'view') => {
    return `${BASE_URL}/fund/campaign/${campaignId}?action=${action}`;
  },

  fundPage: () => {
    return `${BASE_URL}/fund`;
  },

  attendanceSession: (sessionId) => {
    return `${BASE_URL}/attendance/session/${sessionId}`;
  },

  attendancePage: () => {
    return `${BASE_URL}/attendance`;
  },

  campaignPay: (campaignId) => {
    return `${BASE_URL}/fund/campaign/${campaignId}?action=pay`;
  }
};

module.exports = deepLinks;
```

- [ ] **Step 2: Write failing test for webhook handler**

Create `backend/tests/handlers/zaloWebhookHandler.test.js`:
```javascript
const crypto = require('crypto');
const zaloWebhookHandler = require('../../../src/handlers/zaloWebhookHandler');

describe('POST /api/zalo/webhook', () => {
  let req, res;

  beforeEach(() => {
    req = {
      headers: {
        'x-zalo-signature': ''
      },
      body: {}
    };
    res = {
      json: jest.fn().mockReturnThis(),
      status: jest.fn().mockReturnThis()
    };
  });

  test('should verify webhook signature', async () => {
    const body = { event: 'follow', user_id: 'zuid-001' };
    const signature = crypto
      .createHmac('sha256', process.env.ZALO_OA_WEBHOOK_VERIFY_TOKEN)
      .update(JSON.stringify(body))
      .digest('hex');

    req.headers['x-zalo-signature'] = signature;
    req.body = body;

    // Handler should call next or process webhook
    await zaloWebhookHandler(req, res);

    expect(res.status).not.toHaveBeenCalledWith(403);
  });

  test('should reject request with invalid signature', async () => {
    req.headers['x-zalo-signature'] = 'invalid-signature';
    req.body = { event: 'follow' };

    await zaloWebhookHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(403);
  });
});
```

- [ ] **Step 3: Create webhook handler**

Create `backend/src/handlers/zaloWebhookHandler.js`:
```javascript
const crypto = require('crypto');
const db = require('../config/database');
const logger = require('../utils/logger');
const { handleError } = require('../services/errorService');

const verifyZaloSignature = (body, signature) => {
  const verifyToken = process.env.ZALO_OA_WEBHOOK_VERIFY_TOKEN;
  const hash = crypto
    .createHmac('sha256', verifyToken)
    .update(JSON.stringify(body))
    .digest('hex');

  return hash === signature;
};

const zaloWebhookHandler = async (req, res) => {
  try {
    const signature = req.headers['x-zalo-signature'];
    const body = req.body;

    // Verify webhook signature
    if (!verifyZaloSignature(body, signature)) {
      logger.warn('Invalid Zalo webhook signature');
      return res.status(403).json({ error: 'Invalid signature' });
    }

    logger.info('Zalo webhook received', { event: body.event });

    // Route by event type
    switch (body.event) {
      case 'follow':
        await handleFollowEvent(body);
        break;
      case 'unfollow':
        await handleUnfollowEvent(body);
        break;
      case 'message':
        await handleMessageEvent(body);
        break;
      case 'view':
        await handleViewEvent(body);
        break;
      default:
        logger.warn('Unknown Zalo event type', { event: body.event });
    }

    res.json({ success: true });
  } catch (error) {
    return handleError(error, req, res, { endpoint: '/api/zalo/webhook' });
  }
};

const handleFollowEvent = async (event) => {
  const { user_id: zaloUserId, name, avatar } = event;

  logger.info('User followed OA', { zalo_user_id: zaloUserId });

  // Check if user exists
  let user = await db('users')
    .where('zalo_user_id', zaloUserId)
    .first();

  if (!user) {
    // Create new user (assign to default team if exists, or skip for now)
    logger.info('New follower detected', { zalo_user_id: zaloUserId });

    // In production, you might:
    // 1. Create invite link and wait for user to accept
    // 2. Create temporary user until they verify
    // 3. Auto-assign to default team
  }
};

const handleUnfollowEvent = async (event) => {
  const { user_id: zaloUserId } = event;

  logger.info('User unfollowed OA', { zalo_user_id: zaloUserId });

  // Optionally deactivate user
  // await db('users')
  //   .where('zalo_user_id', zaloUserId)
  //   .update({ status: 'inactive', deactivated_at: new Date() });
};

const handleMessageEvent = async (event) => {
  const { user_id: zaloUserId, message } = event;

  logger.info('Message received from user', {
    zalo_user_id: zaloUserId,
    message_length: message?.text?.length
  });

  // Handle text commands or form submissions
  // Could trigger actions like "pay", "status", etc.
};

const handleViewEvent = async (event) => {
  const { user_id: zaloUserId } = event;

  logger.info('User viewed OA', { zalo_user_id: zaloUserId });

  // Track engagement metrics
};

module.exports = zaloWebhookHandler;
```

- [ ] **Step 4: Update app.js to handle Zalo webhook before auth middleware**

Modify `backend/src/app.js` middleware order:
```javascript
// BEFORE authMiddleware (no auth required for webhook verification)
app.post('/api/zalo/webhook', require('./handlers/zaloWebhookHandler'));

// AFTER health check
app.post('/auth/zalo/callback', require('./handlers/authHandler'));

// AFTER those public routes
app.use(authMiddleware);
app.use(tenancyMiddleware);

// Inngest webhook (after tenancy)
app.use('/api/inngest', require('./handlers/inngestHandler'));
```

- [ ] **Step 5: Run webhook tests**

Run:
```bash
npm test -- tests/handlers/zaloWebhookHandler.test.js
```

Expected: 2 tests pass.

- [ ] **Step 6: Commit**

```bash
git add backend/src/utils/deepLinks.js backend/src/handlers/zaloWebhookHandler.js
git add backend/tests/handlers/zaloWebhookHandler.test.js
git add backend/src/app.js
git commit -m "feat: Zalo webhook signature verification and event handling"
```

---

## Task 10: Integration Test & Smoke Test

**Files:**
- Create: `backend/tests/integration/fullFlow.test.js`

- [ ] **Step 1: Write integration test for full authentication flow**

Create `backend/tests/integration/fullFlow.test.js`:
```javascript
const db = require('../../src/config/database');
const authService = require('../../src/services/authService');
const inngest = require('../../src/config/inngest');

describe('Integration: Full Authentication Flow', () => {
  beforeAll(async () => {
    // Setup database
    await db.migrate.latest();
  });

  afterAll(async () => {
    // Cleanup
    await db.destroy();
  });

  test('should create team and user on first Zalo login', async () => {
    // Simulate first-time user login
    const mockZaloUser = {
      zalo_user_id: 'zuid-test-001',
      email: 'testuser@example.com',
      full_name: 'Test User'
    };

    // Create team
    const [teamId] = await db('teams').insert({
      name: `Team of ${mockZaloUser.full_name}`,
      created_at: new Date()
    });

    expect(teamId).toBeGreaterThan(0);

    // Create user
    const [userId] = await db('users').insert({
      team_id: teamId,
      email: mockZaloUser.email,
      full_name: mockZaloUser.full_name,
      zalo_user_id: mockZaloUser.zalo_user_id,
      role: 'owner',
      status: 'active',
      created_at: new Date()
    });

    expect(userId).toBeGreaterThan(0);

    // Verify user exists
    const user = await db('users').where('id', userId).first();
    expect(user.role).toBe('owner');
    expect(user.team_id).toBe(teamId);
  });

  test('should generate valid JWT for user', async () => {
    const user = {
      id: 1,
      team_id: 1,
      email: 'test@example.com',
      role: 'member',
      zalo_user_id: 'zuid-001'
    };

    const token = authService.generateJWT(user);
    const decoded = authService.verifyJWT(token);

    expect(decoded.user_id).toBe(user.id);
    expect(decoded.team_id).toBe(user.team_id);
    expect(decoded.role).toBe('member');
  });

  test('should reject invalid JWT', async () => {
    expect(() => {
      authService.verifyJWT('invalid-token');
    }).toThrow();
  });
});
```

- [ ] **Step 2: Run integration tests**

Run:
```bash
npm test -- tests/integration/fullFlow.test.js
```

Expected: 4 tests pass.

- [ ] **Step 3: Run all tests**

Run:
```bash
npm test
```

Expected: All tests pass (or list any failures for debugging).

- [ ] **Step 4: Test server startup**

Run:
```bash
npm run dev &
sleep 3
curl http://localhost:3001/health
```

Expected output:
```json
{"status":"ok","timestamp":"2026-06-22T..."}
```

- [ ] **Step 5: Commit**

```bash
git add backend/tests/integration/fullFlow.test.js
git commit -m "test: integration tests for authentication flow"
```

---

## Task 11: Database Seeds & Sample Data

**Files:**
- Create: `backend/src/database/seeds/01_sample_teams_and_users.js`

- [ ] **Step 1: Create seed file for development**

Create `backend/src/database/seeds/01_sample_teams_and_users.js`:
```javascript
exports.seed = async (knex) => {
  // Delete existing data
  await knex('users').del();
  await knex('teams').del();

  // Create sample teams
  const teamIds = await knex('teams').insert([
    {
      name: 'AFC Phoenix',
      description: 'Development team for testing',
      created_at: new Date()
    },
    {
      name: 'United FC',
      description: 'Another test team',
      created_at: new Date()
    }
  ]);

  // Create sample users for each team
  await knex('users').insert([
    // Team 1 users
    {
      team_id: teamIds[0],
      email: 'owner@afc.test',
      full_name: 'Team Owner',
      zalo_user_id: 'zuid-owner-001',
      role: 'owner',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'manager@afc.test',
      full_name: 'Team Manager',
      zalo_user_id: 'zuid-manager-001',
      role: 'co_manager',
      status: 'active',
      created_at: new Date()
    },
    {
      team_id: teamIds[0],
      email: 'player1@afc.test',
      full_name: 'Player One',
      zalo_user_id: 'zuid-player-001',
      role: 'member',
      status: 'active',
      created_at: new Date()
    },
    // Team 2 users
    {
      team_id: teamIds[1],
      email: 'owner@united.test',
      full_name: 'United Owner',
      zalo_user_id: 'zuid-owner-002',
      role: 'owner',
      status: 'active',
      created_at: new Date()
    }
  ]);
};
```

- [ ] **Step 2: Run seeds**

Run:
```bash
npx knex seed:run --knexfile src/config/database.js
```

Expected: Seeds run without errors.

- [ ] **Step 3: Verify sample data**

Run:
```bash
node -e "const db = require('./src/config/database'); db('users').select().then(users => console.table(users)).then(() => process.exit());"
```

Expected: Sample users displayed in table.

- [ ] **Step 4: Commit**

```bash
git add backend/src/database/seeds/01_sample_teams_and_users.js
git commit -m "feat: sample data seeds for development testing"
```

---

## Task 12: Environment Setup & Documentation

**Files:**
- Create: `backend/LOCAL_SETUP.md`
- Modify: `backend/README.md`
- Modify: root `.env.example` (if exists)

- [ ] **Step 1: Create local setup guide**

Create `backend/LOCAL_SETUP.md`:
```markdown
# Local Development Setup

## Prerequisites
- Node.js 18+
- PostgreSQL 14+
- Supabase account (or local PostgreSQL)

## Installation Steps

1. **Install dependencies:**
   ```bash
   cd backend
   npm install
   ```

2. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit .env with your local PostgreSQL credentials
   ```

3. **Run database migrations:**
   ```bash
   npm run migrate
   ```

4. **Load sample data:**
   ```bash
   npx knex seed:run --knexfile src/config/database.js
   ```

5. **Start development server:**
   ```bash
   npm run dev
   ```

   Server will run on `http://localhost:3001`

6. **Verify health check:**
   ```bash
   curl http://localhost:3001/health
   ```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/middleware/authMiddleware.test.js

# Watch mode
npm test:watch
```

## Database Commands

```bash
# Run latest migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Run seeds
npx knex seed:run --knexfile src/config/database.js
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running
- Check DB_HOST, DB_USER, DB_PASSWORD in `.env`
- Verify database exists: `createdb football_team_db`

### Migration Error
- Ensure migrations are idempotent (safe to run multiple times)
- Check logs for SQL errors
- Verify all foreign key references exist

### Test Failures
- Clear node_modules: `rm -rf node_modules && npm install`
- Check DATABASE_URL is set correctly for test database
```

- [ ] **Step 2: Update backend README**

Create or modify `backend/README.md`:
```markdown
# Football Team Management Backend

SaaS platform backend for team finance management, ad-hoc campaigns, and attendance tracking.

## Quick Start

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for development setup.

## Architecture

- **Database:** Supabase PostgreSQL with Row-Level Security (multi-tenant)
- **Authentication:** JWT + Zalo OAuth
- **Async Processing:** Inngest event bus with cron scheduling
- **Messaging:** Zalo OA integration for notifications
- **Logging:** Winston

## Project Structure

```
src/
├── config/          # Configuration files (DB, auth, inngest, zalo)
├── middleware/      # Express middleware (auth, tenancy, RBAC)
├── services/        # Business logic (auth, zalo, errors)
├── handlers/        # HTTP route handlers
├── inngest/         # Event definitions and handlers
├── utils/           # Utilities (logger, validation, deep links)
└── database/        # Migrations and seeds
```

## API Endpoints

### Public
- `GET /health` — Health check
- `POST /auth/zalo/callback` — Zalo OAuth callback

### Protected (require JWT)
- `POST /api/zalo/webhook` — Zalo OA webhooks
- `POST /api/inngest` — Inngest event processing

## Environment Variables

See `.env.example` for all required variables.

## Deployment

The backend is deployed on Vercel. See `vercel.json` for configuration.

Deploy: `git push origin main` (CI/CD automatically deploys to production)
```

- [ ] **Step 3: Create ARCHITECTURE.md**

Create `backend/ARCHITECTURE.md`:
```markdown
# Phase 1 Backend Architecture

## Authentication Flow

```
Client → POST /auth/zalo/callback
├─ Exchange code for Zalo access token
├─ Fetch user info from Zalo API
├─ Check: user exists in DB?
│   ├─ YES → Issue JWT
│   └─ NO → Create user + team → Issue JWT
└─ Return JWT + user data
```

## Middleware Chain

1. **authMiddleware** — Verify JWT, extract user context
2. **tenancyMiddleware** — Inject team_id filter, enforce isolation
3. **rbacMiddleware** — Check role-based permissions (per route)

## Row-Level Security

All queries automatically filtered by `team_id` via Supabase RLS policies.

No manual `WHERE team_id = $X` needed — Supabase enforces it.

## Inngest Event Processing

Events are processed asynchronously:

1. **Cron jobs** trigger at scheduled times
2. **Business events** (transaction approved, etc.) trigger handlers
3. **Retry logic** auto-retries failed events (exponential backoff)
4. **Logging** stored in `inngest_logs` table

## Error Handling

All errors return structured responses:

```json
{
  "error": "Human-readable message",
  "code": "MACHINE_READABLE_CODE",
  "details": { ... }  // Optional, for validation errors
}
```

Status codes:
- 400 — Validation error
- 401 — Authentication failed
- 403 — Authorization denied
- 404 — Resource not found
- 409 — Conflict (race condition)
- 500 — Server error

## Testing

- **Unit tests** — Middleware, services, error classes
- **Integration tests** — Full flows (auth, webhooks)
- **Mocking** — External services (Zalo API, Inngest)

Run: `npm test`
```

- [ ] **Step 4: Commit**

```bash
git add backend/LOCAL_SETUP.md backend/README.md backend/ARCHITECTURE.md
git commit -m "docs: local setup guide and architecture documentation"
```

---

## Summary Checklist

**Phase 1 Infrastructure Complete:**

- [x] Database schema with RLS policies
- [x] JWT authentication middleware
- [x] Tenancy isolation (team_id scoping)
- [x] RBAC middleware for permissions
- [x] Zalo OAuth integration
- [x] Inngest event bus setup
- [x] Monthly reminder cron job
- [x] Zalo webhook handler
- [x] Error handling system with custom error classes
- [x] Winston logging
- [x] Integration tests
- [x] Sample seed data
- [x] Local setup documentation

**Ready for Phase 2:**

The backend infrastructure is now ready to implement:
1. Finance & Fund Transactions module
2. Ad-hoc Campaigns module
3. Attendance & Gamification module

Each module can be implemented independently using the Phase 1 infrastructure.

---

**Plan prepared for implementation using superpowers:subagent-driven-development or superpowers:executing-plans.**

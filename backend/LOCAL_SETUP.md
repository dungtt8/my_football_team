# Local Development Setup

## Prerequisites
- Node.js 18+
- PostgreSQL 14+ OR Supabase account
- Git

## Installation Steps

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env with your database credentials (Supabase or local PostgreSQL)
```

**For Supabase:**
- Go to https://supabase.com and create a new project
- Get connection details from Settings → Database
- Update .env with Supabase credentials
- Set DB_SSL=true for Supabase

**For Local PostgreSQL:**
- Start PostgreSQL service
- Create database: `createdb football_team`
- Update .env with local credentials

### 3. Run database migrations

```bash
npm run migrate
```

Expected: All migrations run without errors, tables created in PostgreSQL.

### 4. Load sample data (optional)

```bash
npm run seed
```

This creates 2 sample teams and 7 test users for development.

### 5. Start development server

```bash
npm run dev
```

Server will run on `http://localhost:3001`

### 6. Verify health check

```bash
curl http://localhost:3001/health
```

Expected response:
```json
{"status":"ok","timestamp":"2026-06-22T..."}
```

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- tests/middleware/authMiddleware.test.js

# Watch mode for development
npm test:watch
```

## Database Commands

```bash
# Run latest migrations
npm run migrate

# Rollback last migration
npm run migrate:rollback

# Run seeds
npm run seed
```

## Environment Variables

See `.env.example` for all required variables:
- Database credentials (host, port, user, password, name)
- JWT secret
- Zalo OAuth credentials
- Zalo OA credentials
- Inngest credentials

## Project Structure

```
backend/
├── src/
│   ├── config/           # Configuration (database, auth, inngest, zalo)
│   ├── middleware/       # Express middleware (auth, tenancy, RBAC)
│   ├── services/         # Business logic (auth, zalo, errors)
│   ├── handlers/         # HTTP route handlers
│   ├── inngest/          # Async event definitions and handlers
│   ├── utils/            # Utilities (logger, validation, deep links)
│   ├── database/         # Migrations and seeds
│   ├── app.js            # Express app setup
│   └── index.js          # Server entry point
├── tests/                # Test files (unit, integration)
├── package.json          # Dependencies
├── .env.example          # Environment template
├── LOCAL_SETUP.md        # This file
├── README.md             # Project overview
└── ARCHITECTURE.md       # Architecture documentation
```

## Troubleshooting

### Database Connection Error
- Ensure PostgreSQL is running (or Supabase is accessible)
- Check DB_HOST, DB_USER, DB_PASSWORD in .env
- Verify database exists: `psql -U postgres -l | grep football`

### Migration Failed
- Ensure migrations are idempotent (safe to run multiple times)
- Check SQL error in terminal output
- Verify all foreign key references exist
- Run: `npm run migrate:rollback` and investigate

### Test Failures
- Clear node_modules: `rm -rf node_modules && npm install`
- Check NODE_ENV is not 'production'
- Ensure .env.example has all required variables

## Next Steps

Once local setup is complete and tests pass:
1. Deploy to Vercel with Supabase connected
2. Run migrations on production database
3. Load seeds if needed for testing
4. Implement Phase 2 business modules

See ARCHITECTURE.md for technical details.

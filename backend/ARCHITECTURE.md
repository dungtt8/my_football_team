# Phase 1 Backend Architecture

## Overview

The Phase 1 infrastructure establishes a solid, scalable foundation for a multi-tenant SaaS platform:

- **Multi-tenancy** via Supabase RLS (Row-Level Security)
- **Authentication** with JWT + Zalo OAuth
- **Event-driven** with Inngest for async processing
- **Webhooks** from Zalo OA for messaging
- **Error handling** & structured logging

## Authentication Flow

```
Client → POST /auth/zalo/callback
├─ Exchange authorization code for Zalo access token
├─ Fetch user info from Zalo API
├─ Database lookup: does user exist?
│   ├─ YES → Fetch user record
│   └─ NO → Create team + user (as owner)
├─ Generate JWT token (24h expiration)
└─ Return token + user data
```

**JWT Payload:**
```json
{
  "user_id": 123,
  "team_id": 456,
  "email": "player@example.com",
  "role": "co_manager",
  "zalo_user_id": "abcd1234efgh5678",
  "iat": 1719043200,
  "exp": 1719129600
}
```

## Middleware Chain

Request processing order (in src/app.js):

1. **CORS & JSON parsing** - Enable cross-origin requests
2. **Public routes** - Health check, no auth required
3. **Auth routes** - Zalo OAuth callback
4. **Zalo webhook** - Signature verification (no JWT required)
5. **Auth middleware** - Verify JWT token
6. **Tenancy middleware** - Inject team_id context
7. **Protected routes** - Finance, campaigns, attendance endpoints (RBAC per route)
8. **Error handler** - Final catch-all for unhandled errors

## Multi-Tenancy via Row-Level Security

**Model:** Shared Database, Shared Schema, Row-Level Isolation

Every business table has a `team_id` column:
```sql
CREATE TABLE fund_transactions (
  id BIGSERIAL PRIMARY KEY,
  team_id BIGINT NOT NULL,  -- Tenancy key
  ...
);
```

**RLS Policies (automatic filtering):**
```sql
CREATE POLICY "Users can view their team's transactions"
ON fund_transactions
FOR SELECT
USING (team_id = current_setting('app.current_team_id')::bigint);
```

**Result:** No manual WHERE clauses needed - Supabase filters automatically.

## Inngest Event Processing

**Event Bus for async workflows:**

| Event | Trigger | Handler | Retry |
|-------|---------|---------|-------|
| fund.monthly-reminder | Cron: 1st of month | Send Zalo reminders | 3x |
| fund.campaign-deadline-24h | Daily check | Notify unpaid | 3x |
| fund.transaction-approved | User action | Log + notify | 5x |
| attendance.session-closed | Manager action | Calculate stats | 3x |

**Cron Expression Examples:**
- Monthly: `0 1 1 * *` (1st of month, 01:00 UTC)
- Daily: `0 23 * * *` (23:00 UTC = 06:00 UTC+7)

## Error Handling

**Error Classes:**
- `ValidationError` (400) - Input validation failed
- `AuthenticationError` (401) - Token invalid/expired
- `AuthorizationError` (403) - RBAC denied
- `NotFoundError` (404) - Resource not found
- `ConflictError` (409) - Race condition/duplicate
- `BusinessError` (400-500) - Custom errors

**Response Format:**
```json
{
  "error": "Human-readable message",
  "code": "MACHINE_CODE",
  "details": { ... }  // Optional validation details
}
```

## Logging

**Winston Logger:**
- **File output** - logs/error.log (errors only), logs/combined.log (all)
- **Console output** - Dev environment only
- **JSON format** - Structured for parsing

**Log Fields:**
```json
{
  "timestamp": "2026-06-22T10:30:00Z",
  "level": "info",
  "service": "football-backend",
  "team_id": 456,
  "user_id": 123,
  "action": "transaction_approved",
  "message": "Fund transaction approved"
}
```

## Database Schema

**Core Tables:**
- `teams` - Tenant isolation root
- `users` - Team members with roles
- `fund_campaigns` - Monthly/ad-hoc fundraising
- `fund_transactions` - Individual donations
- `campaign_assignments` - User-campaign mapping
- `attendance_records` - Session check-ins
- `inngest_logs` - Event processing history

**Constraints:**
- Foreign keys enforce referential integrity
- Unique constraints prevent duplicates
- Indexes optimize query performance

## Testing Strategy

**Unit Tests (per component):**
- Services (auth, zalo, errors)
- Middleware (auth, tenancy, RBAC)
- Handlers (auth callback, webhooks)

**Integration Tests (end-to-end flows):**
- Full authentication flow
- JWT generation & verification
- Security scenarios (tampering, team isolation)

**Mocking:**
- Database calls (Knex mocked)
- External APIs (Zalo, Inngest mocked)
- Allows tests without live services

**Coverage:**
- 28+ tests across 8 test suites
- All critical paths tested
- Run: `npm test`

## Deployment

**Environment:** Vercel (serverless)

**Database:** Supabase PostgreSQL

**Environment Variables:**
- DB_HOST, DB_USER, DB_PASSWORD (Supabase)
- JWT_SECRET (generate unique per environment)
- ZALO_* credentials (from Zalo app dashboard)
- INNGEST_* keys (from Inngest dashboard)

**Deployment Process:**
1. Push to main branch
2. GitHub Actions runs tests
3. Tests pass → Auto-deploy to Vercel
4. Vercel connects to Supabase
5. Migrations run on deploy

## Next Steps (Phase 2)

Phase 2 will implement 3 business modules using Phase 1 infrastructure:

### Module 1: Finance & Fund Transactions
- Create/approve fund campaigns
- Submit/approve transactions
- Maker-checker approval flow
- Fund balance tracking

### Module 2: Ad-hoc Campaigns
- Quick fundraising for events
- Flexible member selection
- Auto-notification via Zalo
- Payment tracking

### Module 3: Attendance & Gamification
- Session check-in system
- Attendance tracking
- Gamification scoring
- Leaderboards

Each module will:
1. Define API endpoints
2. Implement business logic (using Phase 1 middleware/services)
3. Add database tables (following RLS pattern)
4. Write integration tests
5. Submit PR for review

---

**Document prepared for developer reference.**

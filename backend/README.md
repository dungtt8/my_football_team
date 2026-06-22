# Football Team Management Backend

🎯 SaaS platform backend for team finance management, ad-hoc campaigns, and attendance tracking.

## Quick Start

See [LOCAL_SETUP.md](./LOCAL_SETUP.md) for complete development setup.

## Features

- **Multi-tenant Architecture** - Supabase PostgreSQL with Row-Level Security
- **Authentication** - JWT + Zalo OAuth integration
- **Async Processing** - Inngest event bus with cron scheduling
- **Zalo Integration** - OA messaging for team notifications
- **Error Handling** - Structured error responses and logging with Winston
- **RBAC** - Role-based access control (owner, co_manager, member)

## Architecture

**Tech Stack:**
- Express.js - Web framework
- Supabase PostgreSQL - Database with RLS
- JWT - Token-based authentication
- Inngest - Event processing & scheduling
- Winston - Logging
- Jest - Testing

**Key Components:**
1. **Auth Flow** - Zalo OAuth → JWT token generation
2. **Tenancy** - team_id scoping for multi-tenant isolation
3. **Events** - Inngest cron jobs and event handlers
4. **Webhooks** - Zalo OA event processing with signature verification
5. **Logging** - Structured logging for debugging and monitoring

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture.

## Development

```bash
# Install dependencies
npm install

# Setup environment (copy .env.example → .env)
cp .env.example .env

# Run migrations
npm run migrate

# Run seeds (optional)
npm run seed

# Start dev server
npm run dev

# Run tests
npm test
```

## Testing

All infrastructure components have comprehensive test coverage:
- 28+ tests across 8 test suites
- Unit tests for services, middleware, handlers
- Integration tests for authentication flow
- Mocked external services (Zalo, Inngest, Database)

Run: `npm test`

## Deployment

The backend is deployed on Vercel as a serverless function.

**Deploy:** `git push origin main` (CI/CD automatically deploys)

## API Endpoints

### Public
- `GET /health` - Health check
- `POST /auth/zalo/callback` - Zalo OAuth callback

### Protected (require JWT)
- `POST /api/zalo/webhook` - Zalo OA webhooks
- `POST /api/inngest` - Inngest event processing

## Project Status

**Phase 1: ✅ Infrastructure Complete**
- Database schema & RLS policies
- Authentication & authorization
- Event bus setup
- Zalo integration
- Error handling & logging

**Phase 2: In Planning** (Finance, Campaigns, Attendance modules)

## Contributing

1. Create feature branch: `git checkout -b feature/my-feature`
2. Make changes and write tests
3. Run: `npm test` (all tests must pass)
4. Commit: `git commit -m "feat: description"`
5. Push: `git push origin feature/my-feature`
6. Create PR for review

## Support

For issues or questions, see [LOCAL_SETUP.md](./LOCAL_SETUP.md) troubleshooting section.

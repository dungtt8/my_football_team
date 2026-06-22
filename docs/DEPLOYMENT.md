# GitHub Actions Supabase Deployment Guide

## Setup Instructions

### 1. Create GitHub Secrets

Go to **Settings → Secrets and variables → Actions** and add these secrets:

**Staging Environment:**
```
SUPABASE_PROJECT_ID_STAGING        # Your Supabase project ID
DATABASE_URL_STAGING               # postgresql://user:pass@db.xxx.supabase.co:5432/postgres
SUPABASE_URL_STAGING               # https://xxx.supabase.co
SUPABASE_KEY_STAGING               # Your public API key
SUPABASE_SERVICE_ROLE_STAGING      # Your service role secret key
SUPABASE_ACCESS_TOKEN_STAGING      # Personal access token for CLI
```

**Production Environment:**
```
SUPABASE_PROJECT_ID                # Your Supabase project ID
DATABASE_URL                       # postgresql://user:pass@db.xxx.supabase.co:5432/postgres
SUPABASE_URL                       # https://xxx.supabase.co
SUPABASE_KEY                       # Your public API key
SUPABASE_SERVICE_ROLE              # Your service role secret key
SUPABASE_ACCESS_TOKEN              # Personal access token for CLI
```

**Optional (for Slack notifications):**
```
SLACK_WEBHOOK                      # Your Slack webhook URL
```

### 2. How to Get Supabase Credentials

1. **Project ID**: Go to Supabase Dashboard → Settings → General → Project Reference ID
2. **DATABASE_URL**: Settings → Database → Connection string (URI)
3. **SUPABASE_URL**: Settings → API → URL
4. **SUPABASE_KEY**: Settings → API → anon public
5. **SUPABASE_SERVICE_ROLE**: Settings → API → service_role secret
6. **SUPABASE_ACCESS_TOKEN**: Create at https://supabase.com/dashboard/account/tokens

### 3. Update Environment Names in GitHub

Go to **Settings → Environments** and create:
- `staging` environment
- `production` environment

Add secrets to each environment accordingly.

---

## Workflow Triggers

This workflow runs when:

1. **Push to main** (with backend changes)
   ```bash
   git push origin main
   ```

2. **Manual trigger** (workflow_dispatch)
   - Go to Actions → Deploy to Supabase → Run workflow
   - Select environment: staging or production

---

## Database Migration Setup

Ensure backend has migration scripts:

```json
// backend/package.json
{
  "scripts": {
    "migrate:latest": "knex migrate:latest --env production",
    "migrate:rollback": "knex migrate:rollback --env production",
    "migrate:status": "knex migrate:status --env production"
  }
}
```

---

## What the Workflow Does

1. ✅ Checks out code
2. ✅ Installs dependencies
3. ✅ Runs linting (if available)
4. ✅ Runs tests (if available)
5. ✅ Runs database migrations
6. ✅ Deploys Edge Functions to Supabase
7. ✅ Sends Slack notification on success/failure

---

## Troubleshooting

### Migration fails
- Check DATABASE_URL format
- Ensure service role key has enough permissions
- Check migration files in `backend/src/database/migrations/`

### Edge Functions deployment fails
- Verify SUPABASE_ACCESS_TOKEN is valid
- Check project ID is correct
- Ensure functions exist in project

### Tests timeout
- Increase timeout in workflow if needed
- Use `continue-on-error: true` to not block deployment

---

## Manual Deployment (if needed)

```bash
# From backend directory
export DATABASE_URL="postgresql://..."
export SUPABASE_URL="https://..."
export SUPABASE_SERVICE_ROLE="..."

# Run migrations
npm run migrate:latest

# Deploy Edge Functions
npx supabase functions deploy --project-id <PROJECT_ID>
```

---

## Monitoring Deployments

- Go to **Actions** tab in GitHub
- Click on deployment run
- View logs for each step
- Check Slack for notifications

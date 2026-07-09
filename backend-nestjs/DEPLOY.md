# Deploying the NestJS backend to Alibaba Cloud ECS (Docker)

This is the from-scratch NestJS port of the Express backend. It runs as a normal
long-lived Node process (NOT serverless) and includes its own in-process
scheduled jobs (`@nestjs/schedule`) — so it must run as a single always-on
instance (do not scale to N replicas, or the cron jobs will run N times).

## 1. Prerequisites on the ECS VM (Ubuntu 22.04)

```bash
# Install Docker
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo tee /etc/apt/keyrings/docker.asc > /dev/null
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt-get update && sudo apt-get install -y docker-ce docker-ce-cli containerd.io
```

## 2. Environment file

Create `/opt/football/.env` on the VM (copy from `.env.example` and fill in the
real Supabase / JWT / Zalo values). The same variable names as the Express
backend are used, so it is a drop-in. The Prisma `DATABASE_URL` is built
automatically from `DB_HOST/DB_PORT/DB_USER/DB_PASSWORD/DB_NAME/DB_SSL`
(set `DB_SSL=true` for Supabase). You may instead set `DATABASE_URL` directly.

Minimum required:

```
DB_HOST=db.xxxxx.supabase.co
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=...
DB_NAME=postgres
DB_SSL=true
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_SERVICE_KEY=...
JWT_SECRET=...
ALLOWED_ORIGINS=https://myteam.revonexus.net
FRONTEND_URL=https://myteam.revonexus.net
ZALO_APP_ID=...
ZALO_APP_SECRET=...
ZALO_OA_ACCESS_TOKEN=...
ZALO_OA_WEBHOOK_VERIFY_TOKEN=...
PORT=3001
NODE_ENV=production
```

## 3. Build the image

From the `backend-nestjs/` directory (or after `git pull` on the VM):

```bash
docker build -t football-backend:latest .
```

## 4. Run the container

```bash
docker run -d \
  --name football-backend \
  --restart unless-stopped \
  --env-file /opt/football/.env \
  -p 127.0.0.1:3001:3001 \
  football-backend:latest
```

- `-p 127.0.0.1:3001:3001` binds only to localhost; Nginx (below) terminates
  TLS and reverse-proxies to it. Use `-p 3001:3001` if you want it public.
- `--restart unless-stopped` acts as the process supervisor (equivalent role to
  PM2/systemd). If you prefer systemd to manage the container lifecycle, see the
  optional unit below.

Check logs / health:

```bash
docker logs -f football-backend
curl http://127.0.0.1:3001/health   # -> {"status":"ok",...}
```

### Optional: manage the container with systemd

`/etc/systemd/system/football-backend.service`:

```ini
[Unit]
Description=Football backend (NestJS) container
Requires=docker.service
After=docker.service

[Service]
Restart=always
ExecStartPre=-/usr/bin/docker rm -f football-backend
ExecStart=/usr/bin/docker run --rm --name football-backend \
  --env-file /opt/football/.env -p 127.0.0.1:3001:3001 football-backend:latest
ExecStop=/usr/bin/docker stop football-backend

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now football-backend
```

## 5. Database migrations

The database schema is owned by the existing knex migrations in the old
`backend/` project — **do not run `prisma migrate` against the live Supabase
database.** Prisma here is used only as a client against the already-migrated
schema (`prisma generate` runs at image build time). `prisma/schema.prisma` was
reconstructed from those knex migrations for typing/generation purposes.

## 6. Nginx in front (TLS + reverse proxy)

Install Nginx + certbot and use a server block like this (TLS via Let's Encrypt):

```nginx
server {
    listen 80;
    server_name api.myteam.revonexus.net;
    # certbot will add the 443 server block + redirect
    location / {
        proxy_pass         http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 60s;
        client_max_body_size 3m;   # allow the 2MB image uploads (+overhead)
    }
}
```

```bash
sudo certbot --nginx -d api.myteam.revonexus.net
```

Point the frontend's `NEXT_PUBLIC_API_URL` at `https://api.myteam.revonexus.net/api`.

## 7. Local build/run (no Docker)

```bash
npm install
npx prisma generate          # requires internet to fetch the Prisma engine
npm run build                # nest build -> dist/
node dist/main.js            # or: npm start
```

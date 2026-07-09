# syntax=docker/dockerfile:1

###############################################################################
# Stage 1 — builder: install all deps, generate Prisma client, compile TS
###############################################################################
FROM node:22-bookworm-slim AS builder

# Prisma needs openssl for its engines.
RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (cache-friendly: copy manifests first)
COPY package.json package-lock.json* ./
RUN npm ci

# Generate the Prisma client (needs the schema)
COPY prisma ./prisma
RUN npx prisma generate

# Build the Nest app
COPY tsconfig*.json nest-cli.json ./
COPY src ./src
RUN npm run build

###############################################################################
# Stage 2 — runner: production-only deps + compiled output
###############################################################################
FROM node:22-bookworm-slim AS runner

RUN apt-get update -y && apt-get install -y --no-install-recommends openssl \
    && rm -rf /var/lib/apt/lists/*

ENV NODE_ENV=production
# Cron schedules in TasksService are written in UTC; keep the container in UTC.
ENV TZ=UTC

WORKDIR /app

# Production dependencies only
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev

# Bring over the generated Prisma client and compiled JS from the builder
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma

EXPOSE 3001

# Basic container healthcheck against the public /health endpoint
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "require('http').get('http://127.0.0.1:'+(process.env.PORT||3001)+'/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

CMD ["node", "dist/main.js"]

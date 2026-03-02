# Deployment Guide

This document outlines steps to deploy Leidy Cleaner in production.

## Prerequisites
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+
- Nginx (or another reverse proxy)
- SSL certificates (Let's Encrypt or similar)

## 1. Build images
```bash
docker build -f backend/Dockerfile -t leidy-backend:latest ./backend
docker build -f frontend/Dockerfile -t leidy-frontend:latest ./frontend
```

## 2. Prepare environment
Copy .env.example to `.env`, and populate with production values.

Important variables:
```env
NODE_ENV=production
DB_HOST=postgres-server
DB_PORT=5432
DB_NAME=leidy_cleaner_prod
DB_USER=produser
DB_PASSWORD=prodpass
JWT_SECRET=secure_random_string
REDIS_HOST=redis-server
REDIS_PORT=6379
STRIPE_SECRET_KEY=sk_live_xxx
STRIPE_PUBLIC_KEY=pk_live_xxx
SENTRY_DSN=https://...@oXXXXX.ingest.sentry.io/YYYYY
```

## 3. Database migrations
docker run --rm --env-file .env leidy-backend:latest npm run migrate

## 4. SSL / Nginx

A valid TLS certificate is **required** for production. You can obtain one via Let's Encrypt
(using `setup-ssl.sh`) or bring your own certificate/key pair. A simple self-signed
certificate can also be used for staging or testing.

- Place your certificate and key in `/etc/nginx/ssl/leidy/` (or mount `./certs` from the
  project root).
- The repo includes `setup-ssl.sh` which automates certbot installation and renewal.

Config sample (nginx.prod.conf):
```nginx
server {
    listen 80;
    server_name example.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name example.com;

    ssl_certificate /etc/nginx/ssl/leidy/fullchain.pem;
    ssl_certificate_key /etc/nginx/ssl/leidy/privkey.pem;
    include /etc/nginx/ssl/leidy/options-ssl-nginx.conf;
    ssl_dhparam /etc/nginx/ssl/leidy/ssl-dhparams.pem;

    # security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    location / {
        proxy_pass http://backend:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    location /api/ {
        proxy_pass http://backend:3001/api/;
    }

    location /_next/ {
        proxy_pass http://frontend:3000/_next/;
    }
}
```

Then run:
```bash
# build and start the stack
docker-compose -f docker-compose.prod.yml up -d
```

Run `./validate-production.sh` after startup to ensure all pieces are in place; the
script now also performs a security audit (npm vulnerabilities) and checks for
misconfigured secrets.


## 5. Health & Monitoring
- Health endpoints: `/health`, `/api/v1/health`
- Sentry reports errors automatically
- Add APM (New Relic/DataDog) by setting env variables

## 6. Backup & Restore
- Use existing `backup.sh`/`restore.sh` scripts (Postgres dump + s3)
- Schedule via cron or CI

## 7. CI/CD
- The repo already contains GitHub Actions workflows that run on every push/PR to `main` (and `develop` for staging).

### Pipeline overview
1. **test** – installs dependencies in both `backend` and `frontend`, runs unit & integration tests, and uploads coverage results.
2. **lint** – runs ESLint plus a moderate‑level `npm audit` for each package.
3. **e2e** – Playwright tests execute on pull requests, spinning up the backend with an in‑memory SQLite database.
4. **security** – runs `npm audit` and scans for secrets using TruffleHog.
5. **build** – compiles both apps and uploads artifacts for later jobs.
6. **publish-docker** – triggered on pushes to `main`; builds and pushes `backend`/`frontend` images to GitHub Container Registry (GHCR).
7. **deploy-staging** – runs when `develop` is updated; pushes frontend to Vercel and backend to Railway (placeholders, adapt to your infra).
8. **deploy-production** – runs on `main` pushes, validates configuration (`./validate-production.sh`), then creates a GitHub deployment and invokes the same Vercel/Railway steps.

Secrets used by the pipeline include:

```text
VERCEL_TOKEN, VERCEL_ORG_ID, VERCEL_PROJECT_ID
RAILWAY_TOKEN, RAILWAY_PROJECT_ID
SLACK_WEBHOOK
GITHUB_TOKEN (for GHCR, deployments, release creation)
```

You can edit these workflows or replace the deploy steps with your own orchestration (SSH, kubectl, etc.).

---

Feel free to adapt to your infrastructure (Kubernetes, ECS, etc.).

# BrewPlan — Deployment Guide

Deploy to Fly.io with SQLite + Litestream backups to Tigris.

## Prerequisites

- [Fly CLI](https://fly.io/docs/flyctl/install/) installed and authenticated
- Fly.io account with billing enabled

## 1. Create Fly App

```bash
fly apps create brewplan
```

## 2. Create Persistent Volume

```bash
fly volumes create brewplan_data --region syd --size 1
```

## 3. Create Tigris Bucket (for Litestream backups)

```bash
fly storage create --name brewplan-backups --region syd
```

This outputs `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` — save these.

## 4. Set Secrets

```bash
fly secrets set \
  SESSION_SECRET=$(openssl rand -hex 32) \
  AWS_ACCESS_KEY_ID=<from step 3> \
  AWS_SECRET_ACCESS_KEY=<from step 3> \
  LITESTREAM_ENDPOINT=https://fly.storage.tigris.dev \
  LITESTREAM_BUCKET=brewplan-backups \
  SEED_USER_EMAIL=admin@brewplan.local \
  SEED_USER_PASSWORD=<choose a password> \
  SEED_USER_NAME=Admin
```

## 5. Deploy

```bash
fly deploy
```

First deploy will:
1. Build the Docker image (multi-stage)
2. Run Drizzle migrations (creates tables)
3. Start Litestream replication
4. Start the app on port 3000

## 6. Seed Initial Data (first deploy only)

SSH into the machine and run the seed script:

```bash
fly ssh console
cd /app && DATABASE_URL=/data/brewplan.db npx tsx packages/db/src/seed.ts
exit
```

## 7. Verify

```bash
fly open
```

Login with the credentials from step 4.

## Restore from Backup

If the volume is lost, Litestream automatically restores from the Tigris replica on startup (handled by `scripts/start.sh`).

To manually restore:

```bash
fly ssh console
litestream restore -config /app/litestream.yml /data/brewplan.db
exit
fly apps restart brewplan
```

## Logs

```bash
fly logs
```

## Configuration

| Env Var | Description |
|---|---|
| `DATABASE_URL` | Path to SQLite DB (set in fly.toml: `/data/brewplan.db`) |
| `SESSION_SECRET` | Cookie session signing key |
| `LITESTREAM_ENDPOINT` | Tigris S3 endpoint |
| `LITESTREAM_BUCKET` | Tigris bucket name |
| `AWS_ACCESS_KEY_ID` | Tigris access key |
| `AWS_SECRET_ACCESS_KEY` | Tigris secret key |
| `PORT` | Server port (default: 3000) |

#!/bin/bash
set -e

DB_PATH="${DATABASE_URL:-/data/brewplan.db}"
LITESTREAM_CONFIG="/app/litestream.yml"

# 1. Restore SQLite from Litestream replica if DB doesn't exist
if [ ! -f "$DB_PATH" ]; then
  echo "Database not found at $DB_PATH — attempting restore from replica..."
  if [ -n "$LITESTREAM_ENDPOINT" ] && [ -n "$LITESTREAM_BUCKET" ]; then
    litestream restore -config "$LITESTREAM_CONFIG" "$DB_PATH" || echo "No replica found, starting fresh."
  else
    echo "No Litestream config — starting fresh."
  fi
fi

# 2. Run Drizzle migrations
echo "Running migrations..."
cd /app/packages/db && npx tsx src/migrate.ts
echo "Migrations complete."

# 3. Start Litestream wrapping react-router-serve
cd /app
if [ -n "$LITESTREAM_ENDPOINT" ] && [ -n "$LITESTREAM_BUCKET" ]; then
  echo "Starting with Litestream replication..."
  exec litestream replicate -config "$LITESTREAM_CONFIG" -exec "npx react-router-serve ./apps/web/build/server/index.js"
else
  echo "Starting without Litestream (no replica config)..."
  exec npx react-router-serve ./apps/web/build/server/index.js
fi

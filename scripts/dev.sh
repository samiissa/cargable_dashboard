#!/usr/bin/env bash
# Launches the local DEV environment: backend (Node dev server, :4000) and
# frontend (`next dev`, :3000) together, both pointed at Supabase DEV via
# each package's own .env.local. Production never uses this script — it
# only runs on Vercel, configured with the production Supabase project.
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$repo_root"

if [[ ! -f backend/.env.local ]]; then
  echo "Missing backend/.env.local — backend/src/config.ts requires SUPABASE_URL and SUPABASE_ANON_KEY to start." >&2
  echo "Create it with the Supabase DEV project's URL and anon key (see frontend/.env.local for the same values)." >&2
  exit 1
fi

if [[ ! -f frontend/.env.local ]]; then
  echo "Missing frontend/.env.local — needs NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, DASHBOARD_BACKEND_URL." >&2
  exit 1
fi

exec pnpm --parallel --filter @cargable/backend --filter @cargable/frontend run dev

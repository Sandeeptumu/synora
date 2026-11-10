#!/bin/zsh
set -euo pipefail

project_dir="${0:A:h}"
backend_env="$project_dir/backend/.env.local"

if [[ -f "$backend_env" ]]; then
  set -a
  source "$backend_env"
  set +a
fi

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "Missing DATABASE_URL. Add it to backend/.env.local."
  exit 1
fi

# Start local Postgres only for the default local connection. Hosted databases
# such as Neon are used directly and must not start an unused Docker service.
if [[ "$DATABASE_URL" == *"localhost:5432/synora"* ]] && ! docker compose -f "$project_dir/docker-compose.yml" ps --status running postgres | grep -q postgres; then
  docker compose -f "$project_dir/docker-compose.yml" up -d postgres
fi

if ! lsof -nP -iTCP:8080 -sTCP:LISTEN >/dev/null 2>&1; then
  (
    cd "$project_dir/backend"
    nohup ./mvnw spring-boot:run </dev/null > backend_live.log 2>&1 &
    echo $! > backend.pid
  )
fi

if ! lsof -nP -iTCP:5173 -sTCP:LISTEN >/dev/null 2>&1; then
  (
    cd "$project_dir/frontend"
    nohup npm run dev </dev/null > frontend_live.log 2>&1 &
    echo $! > frontend.pid
  )
fi

echo "Starting Synora…"
echo "Open http://localhost:5173 after the backend reports healthy."

#!/usr/bin/env bash
# Sync deploy/auth to the Pi and (optionally) start compose.
#
# Preview:  ./scripts/deploy-auth.sh
# Run:      HARNESS_CONFIRM=1 ./scripts/deploy-auth.sh
# Apps:     HARNESS_CONFIRM=1 COMPOSE_PROFILES=apps ./scripts/deploy-auth.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
AUTH_SRC="$ROOT/deploy/auth"
PI_SSH=""
PI_AUTH="/mnt/mmcblk0p2/auth"

load_env() {
  local f="$ROOT/deploy/pi.env"
  if [[ ! -f "$f" ]]; then
    echo "missing deploy/pi.env — copy deploy/pi.env.example" >&2
    exit 1
  fi
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    export "$line"
  done <"$f"
  set +a
  PI_SSH="$(printf '%s' "${PI_SSH:-}" | tr -d '[:space:]')"
  PI_AUTH="$(printf '%s' "${PI_AUTH:-/mnt/mmcblk0p2/auth}" | tr -d '[:space:]')"
  if [[ -z "$PI_SSH" ]]; then
    echo "PI_SSH empty" >&2
    exit 1
  fi
}

ssh_pi() {
  ssh -o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new \
    "$PI_SSH" "$@"
}

print_plan() {
  echo "deploy-auth plan (set HARNESS_CONFIRM=1 to run):" >&2
  echo "  ssh:     $PI_SSH" >&2
  echo "  remote:  $PI_AUTH" >&2
  echo "  profiles:${COMPOSE_PROFILES:-"(none — pocket-id + dashboard proxy)"}" >&2
  echo "  after:   open https://auth.myalabor.ch/setup once; create OIDC client; fill .env" >&2
}

sync_and_up() {
  ssh_pi "mkdir -p '$PI_AUTH/pocket-id-data'"
  rsync -az --delete \
    --exclude '.env' \
    --exclude 'pocket-id-data/' \
    "$AUTH_SRC/" "$PI_SSH:$PI_AUTH/"
  if ! ssh_pi "test -f '$PI_AUTH/.env'"; then
    ssh_pi "cp '$PI_AUTH/.env.example' '$PI_AUTH/.env'"
    echo "created $PI_AUTH/.env from example — fill ENCRYPTION_KEY + OIDC secrets, then re-run" >&2
    exit 2
  fi
  local profiles_arg=()
  if [[ -n "${COMPOSE_PROFILES:-}" ]]; then
    profiles_arg=(--profile "$COMPOSE_PROFILES")
  fi
  ssh_pi "cd '$PI_AUTH' && docker compose ${profiles_arg[*]+"${profiles_arg[@]}"} up -d"
  echo "auth stack up. Smoke: curl -fsS http://127.0.0.1:1411/ >/dev/null on Pi" >&2
  echo "Bootstrap: https://auth.myalabor.ch/setup  then OIDC client for oauth2-proxy" >&2
}

load_env
print_plan
if [[ "${HARNESS_CONFIRM:-}" != "1" ]]; then
  exit 0
fi
sync_and_up

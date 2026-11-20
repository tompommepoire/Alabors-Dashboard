#!/usr/bin/env bash
# Build Next.js standalone on this host and ship to the Raspberry Pi.
#
# Preview:  ./scripts/deploy-pi.sh
# Run:      HARNESS_CONFIRM=1 ./scripts/deploy-pi.sh
# Smoke:    ./scripts/deploy-pi.sh smoke
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WEB="$ROOT/apps/web"
CACHE="$ROOT/deploy/.cache"
PI_SSH=""
PI_REMOTE="/mnt/mmcblk0p2/dashboard"
PI_DATA="/mnt/mmcblk0p2/dashboard-data"
PI_HEALTH="http://127.0.0.1:8790/api/health"
NODE_VERSION="22.14.0"

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
  PI_REMOTE="$(printf '%s' "${PI_REMOTE:-/mnt/mmcblk0p2/dashboard}" | tr -d '[:space:]')"
  PI_DATA="$(printf '%s' "${PI_DATA:-/mnt/mmcblk0p2/dashboard-data}" | tr -d '[:space:]')"
  PI_HEALTH="$(printf '%s' "${PI_HEALTH:-http://127.0.0.1:8790/api/health}" | tr -d '[:space:]')"
  NODE_VERSION="$(printf '%s' "${NODE_VERSION:-22.14.0}" | tr -d '[:space:]')"
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
  echo "deploy-pi plan (set HARNESS_CONFIRM=1 to run):" >&2
  echo "  ssh:     $PI_SSH" >&2
  echo "  remote:  $PI_REMOTE" >&2
  echo "  data:    $PI_DATA" >&2
  echo "  health:  $PI_HEALTH" >&2
  echo "  node:    $NODE_VERSION (linux-arm64)" >&2
}

ensure_node_runtime() {
  local arch="linux-arm64"
  local name="node-v${NODE_VERSION}-${arch}"
  local tarball="${name}.tar.xz"
  local url="https://nodejs.org/dist/v${NODE_VERSION}/${tarball}"
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/$name/bin/node" ]]; then
    echo "downloading Node $NODE_VERSION $arch …" >&2
    curl -fsSL "$url" -o "$CACHE/$tarball"
    tar -xJf "$CACHE/$tarball" -C "$CACHE"
  fi
  # arm64 binary — do not execute on x86_64 build host
  ls -l "$CACHE/$name/bin/node" >&2
}

build_web() {
  echo "building apps/web (standalone) …" >&2
  if [[ ! -f "$WEB/.env.local" && ! -f "$WEB/.env.production.local" ]]; then
    echo "note: no .env.local — build uses process env / Pi env at runtime" >&2
  fi
  (cd "$WEB" && npm run build)
  if [[ ! -f "$WEB/.next/standalone/server.js" ]]; then
    echo "standalone server.js missing" >&2
    exit 1
  fi
}

stage_bundle() {
  local stage
  stage="$(mktemp -d)"
  local stand="$WEB/.next/standalone"
  if [[ ! -f "$stand/server.js" ]]; then
    echo "expected $stand/server.js" >&2
    exit 1
  fi
  cp -a "$stand/." "$stage/"
  mkdir -p "$stage/.next"
  cp -a "$WEB/.next/static" "$stage/.next/static"
  if [[ -d "$WEB/public" ]]; then
    cp -a "$WEB/public" "$stage/public"
  fi

  mkdir -p "$stage/runtime"
  local name="node-v${NODE_VERSION}-linux-arm64"
  rm -rf "$stage/runtime/node"
  cp -a "$CACHE/$name" "$stage/runtime/node"

  mkdir -p "$stage/bin"
  cp "$ROOT/deploy/bin/dashboard-pi-run.sh" "$stage/bin/dashboard-pi-run.sh"
  chmod +x "$stage/bin/dashboard-pi-run.sh" "$stage/runtime/node/bin/node"

  echo "$stage"
}

ensure_remote_layout() {
  ssh_pi "sudo mkdir -p '$PI_REMOTE' '$PI_DATA' && sudo chown -R tc:staff '$PI_REMOTE' '$PI_DATA'"
  if ! ssh_pi "test -f '$PI_DATA/env'"; then
    echo "creating $PI_DATA/env skeleton" >&2
    ssh_pi "cat > '$PI_DATA/env' <<EOF
AUTH_MODE=proxy
ALLOW_DEV_SESSION=0
ADMIN_SUBJECTS=
POCKET_ID_URL=https://auth.myalabor.ch
OAUTH2_SIGN_OUT_URL=https://dashboard.myalabor.ch/oauth2/sign_out
# APP_GRANTS=einkaufsliste:*;lumito:*;alabors-drive:*;apple-anki:you@example.com
HOST=127.0.0.1
PORT=8790
HOSTNAME=127.0.0.1
LUMITO_URL=http://192.168.1.172:8080/
ALABORS_DRIVE_URL=https://auto.myalabor.ch/web/drive.html
ANKI_LERN_URL=https://anki-lern.myalabor.ch/
NOTES_URL=https://notes.myalabor.ch/
SERVER_MANAGER_URL=https://server.myalabor.ch/
# EINKAUF_URL=https://einkaufen.myalabor.ch/
EOF"
    echo "Fill ADMIN_SUBJECTS + APP_GRANTS in $PI_DATA/env after Pocket ID bootstrap" >&2
  fi
}

rsync_bundle() {
  local stage="$1"
  echo "rsync → $PI_SSH:$PI_REMOTE" >&2
  ssh_pi "mkdir -p '$PI_REMOTE'"
  rsync -az --delete \
    --exclude 'server.log' \
    -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$stage"/ "$PI_SSH:$PI_REMOTE/"
}

restart_remote() {
  echo "restart dashboard on Pi …" >&2
  ssh_pi "pidfile='$PI_DATA/dashboard.pid'; if [ -f \"\$pidfile\" ]; then old=\$(cat \"\$pidfile\"); kill \"\$old\" 2>/dev/null || true; rm -f \"\$pidfile\"; fi" || true
  sleep 1
  ssh_pi "DASHBOARD_ROOT='$PI_REMOTE' DASHBOARD_DATA='$PI_DATA' sh '$PI_REMOTE/bin/dashboard-pi-run.sh'"
  sleep 2
}

smoke() {
  echo "smoke $PI_HEALTH" >&2
  local i out=""
  for i in 1 2 3 4 5; do
    if out="$(ssh_pi "wget -qO- '$PI_HEALTH' 2>/dev/null || curl -fsS '$PI_HEALTH' 2>/dev/null")"; then
      echo "$out"
      echo "$out" | grep -q '"ok":true'
      return 0
    fi
    sleep 1
  done
  echo "health check failed" >&2
  ssh_pi "tail -40 '$PI_DATA/server.log' 2>/dev/null || true" >&2 || true
  return 1
}

cmd="${1:-deploy}"
load_env

case "$cmd" in
  smoke)
    smoke
    ;;
  deploy|"")
    print_plan
    if [[ "${HARNESS_CONFIRM:-}" != "1" ]]; then
      exit 0
    fi
    ensure_node_runtime
    build_web
    stage="$(stage_bundle)"
    ensure_remote_layout
    rsync_bundle "$stage"
    rm -rf "$stage"
    restart_remote
    smoke
    echo "deploy ok" >&2
    ;;
  *)
    echo "usage: $0 [deploy|smoke]" >&2
    exit 2
    ;;
esac

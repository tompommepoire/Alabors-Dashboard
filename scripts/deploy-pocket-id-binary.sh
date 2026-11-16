#!/usr/bin/env bash
# Download Pocket ID linux-arm64 and install on the Pi (piCore — no Docker).
#
# Preview:  ./scripts/deploy-pocket-id-binary.sh
# Run:      HARNESS_CONFIRM=1 ./scripts/deploy-pocket-id-binary.sh
# Smoke:    ./scripts/deploy-pocket-id-binary.sh smoke
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/deploy/.cache"
PI_SSH=""
PI_AUTH="/mnt/mmcblk0p2/auth"
PI_AUTH_DATA="/mnt/mmcblk0p2/auth-data"
POCKET_ID_VERSION="${POCKET_ID_VERSION:-2.19.3}"
ASSET="pocket-id_linux_arm64"
URL="https://github.com/pocket-id/pocket-id/releases/download/v${POCKET_ID_VERSION}/${ASSET}"

load_env() {
  local f="$ROOT/deploy/pi.env"
  if [[ ! -f "$f" ]]; then
    echo "missing deploy/pi.env" >&2
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
  PI_AUTH_DATA="$(printf '%s' "${PI_AUTH_DATA:-/mnt/mmcblk0p2/auth-data}" | tr -d '[:space:]')"
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
  echo "deploy-pocket-id-binary plan (HARNESS_CONFIRM=1 to run):" >&2
  echo "  version: v$POCKET_ID_VERSION" >&2
  echo "  ssh:     $PI_SSH" >&2
  echo "  remote:  $PI_AUTH (+ data $PI_AUTH_DATA)" >&2
}

ensure_binary() {
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/$ASSET" ]]; then
    echo "downloading $URL …" >&2
    curl -fsSL -o "$CACHE/$ASSET" "$URL"
  fi
  chmod +x "$CACHE/$ASSET"
}

install_remote() {
  ssh_pi "sudo mkdir -p '$PI_AUTH/bin' '$PI_AUTH_DATA/data' && sudo chown -R tc:staff '$PI_AUTH' '$PI_AUTH_DATA'"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$CACHE/$ASSET" "$PI_SSH:$PI_AUTH/bin/pocket-id"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$ROOT/deploy/bin/pocket-id-pi-run.sh" "$PI_SSH:$PI_AUTH/bin/pocket-id-pi-run.sh"
  ssh_pi "chmod +x '$PI_AUTH/bin/pocket-id' '$PI_AUTH/bin/pocket-id-pi-run.sh'"

  if ! ssh_pi "test -f '$PI_AUTH/.env'"; then
    local key
    key="$(openssl rand -base64 32)"
    ssh_pi "cat > '$PI_AUTH/.env' <<EOF
APP_URL=https://auth.myalabor.ch
ENCRYPTION_KEY=$key
# Optional bind (default 0.0.0.0:1411 — tunnel uses 127.0.0.1:1411)
# HOST=127.0.0.1
# PORT=1411
EOF"
    echo "created $PI_AUTH/.env with fresh ENCRYPTION_KEY" >&2
  else
    echo "keeping existing $PI_AUTH/.env" >&2
  fi
}

restart_remote() {
  echo "restart pocket-id …" >&2
  ssh_pi "pidfile='$PI_AUTH_DATA/pocket-id.pid'; if [ -f \"\$pidfile\" ]; then old=\$(cat \"\$pidfile\"); kill \"\$old\" 2>/dev/null || true; rm -f \"\$pidfile\"; fi" || true
  sleep 1
  ssh_pi "AUTH_ROOT='$PI_AUTH' AUTH_DATA='$PI_AUTH_DATA' sh '$PI_AUTH/bin/pocket-id-pi-run.sh'"
  sleep 2
}

smoke() {
  echo "smoke http://127.0.0.1:1411/ on Pi" >&2
  local i out=""
  for i in 1 2 3 4 5 6 7 8; do
    if out="$(ssh_pi "wget -qO- -S http://127.0.0.1:1411/ 2>&1 | head -20" || true)"; then
      if echo "$out" | grep -qiE 'HTTP/|pocket|html|OK|302|200'; then
        echo "$out"
        return 0
      fi
    fi
    sleep 1
  done
  echo "local smoke failed — log:" >&2
  ssh_pi "tail -40 '$PI_AUTH_DATA/pocket-id.log' 2>/dev/null || true" >&2 || true
  return 1
}

load_env
cmd="${1:-deploy}"
case "$cmd" in
  smoke)
    smoke
    ;;
  deploy|"")
    print_plan
    if [[ "${HARNESS_CONFIRM:-}" != "1" ]]; then
      exit 0
    fi
    ensure_binary
    install_remote
    restart_remote
    smoke
    echo "" >&2
    echo "Next: open https://auth.myalabor.ch/setup  (admin + first passkey)" >&2
    ;;
  *)
    echo "usage: $0 [deploy|smoke]" >&2
    exit 1
    ;;
esac

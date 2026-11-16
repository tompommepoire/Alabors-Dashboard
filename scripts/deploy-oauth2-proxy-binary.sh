#!/usr/bin/env bash
# Install oauth2-proxy (linux-arm64) on the Pi in front of the dashboard.
#
# Preview:  ./scripts/deploy-oauth2-proxy-binary.sh
# Run:      HARNESS_CONFIRM=1 ./scripts/deploy-oauth2-proxy-binary.sh
# Smoke:    ./scripts/deploy-oauth2-proxy-binary.sh smoke
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CACHE="$ROOT/deploy/.cache"
PI_SSH=""
PI_AUTH="/mnt/mmcblk0p2/auth"
PI_AUTH_DATA="/mnt/mmcblk0p2/auth-data"
OAUTH2_PROXY_VERSION="${OAUTH2_PROXY_VERSION:-7.15.6}"
TGZ="oauth2-proxy-v${OAUTH2_PROXY_VERSION}.linux-arm64.tar.gz"
URL="https://github.com/oauth2-proxy/oauth2-proxy/releases/download/v${OAUTH2_PROXY_VERSION}/${TGZ}"

load_env() {
  local f="$ROOT/deploy/pi.env"
  set -a
  while IFS= read -r line || [[ -n "$line" ]]; do
    [[ -z "$line" || "$line" =~ ^[[:space:]]*# ]] && continue
    export "$line"
  done <"$f"
  set +a
  PI_SSH="$(printf '%s' "${PI_SSH:-}" | tr -d '[:space:]')"
  PI_AUTH="$(printf '%s' "${PI_AUTH:-/mnt/mmcblk0p2/auth}" | tr -d '[:space:]')"
  PI_AUTH_DATA="$(printf '%s' "${PI_AUTH_DATA:-/mnt/mmcblk0p2/auth-data}" | tr -d '[:space:]')"
}

ssh_pi() {
  ssh -o BatchMode=yes -o ConnectTimeout=12 -o StrictHostKeyChecking=accept-new \
    "$PI_SSH" "$@"
}

ensure_binary() {
  mkdir -p "$CACHE"
  if [[ ! -f "$CACHE/oauth2-proxy" ]]; then
    echo "downloading $URL …" >&2
    curl -fsSL -o "$CACHE/$TGZ" "$URL"
    tar -xzf "$CACHE/$TGZ" -C "$CACHE"
    # tarball contains a versioned dir
    local bin
    bin="$(find "$CACHE" -type f -name oauth2-proxy | head -1)"
    cp -f "$bin" "$CACHE/oauth2-proxy"
    chmod +x "$CACHE/oauth2-proxy"
  fi
}

install_remote() {
  ssh_pi "mkdir -p '$PI_AUTH/bin' '$PI_AUTH_DATA'"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$CACHE/oauth2-proxy" "$PI_SSH:$PI_AUTH/bin/oauth2-proxy"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$ROOT/deploy/bin/oauth2-proxy-dashboard-run.sh" \
    "$PI_SSH:$PI_AUTH/bin/oauth2-proxy-dashboard-run.sh"
  rsync -az -e "ssh -o BatchMode=yes -o ConnectTimeout=12" \
    "$ROOT/deploy/auth/oauth2-proxy-dashboard.cfg" \
    "$PI_SSH:$PI_AUTH/oauth2-proxy-dashboard.cfg"
  ssh_pi "chmod +x '$PI_AUTH/bin/oauth2-proxy' '$PI_AUTH/bin/oauth2-proxy-dashboard-run.sh'"

  if ! ssh_pi "test -f '$PI_AUTH/oauth2-proxy-dashboard.env'"; then
    local cookie
    cookie="$(openssl rand -base64 32 | tr -d '\n')"
    ssh_pi "cat > '$PI_AUTH/oauth2-proxy-dashboard.env' <<EOF
OIDC_CLIENT_ID=REPLACE_ME
OIDC_CLIENT_SECRET=REPLACE_ME
OIDC_COOKIE_SECRET=$cookie
EOF"
    echo "created env with placeholder client id/secret — fill before start" >&2
  fi
}

restart_remote() {
  ssh_pi "pidfile='$PI_AUTH_DATA/oauth2-proxy-dashboard.pid'; if [ -f \"\$pidfile\" ]; then old=\$(cat \"\$pidfile\"); kill \"\$old\" 2>/dev/null || true; rm -f \"\$pidfile\"; fi" || true
  sleep 1
  ssh_pi "AUTH_ROOT='$PI_AUTH' AUTH_DATA='$PI_AUTH_DATA' sh '$PI_AUTH/bin/oauth2-proxy-dashboard-run.sh'"
  sleep 2
}

smoke() {
  echo "smoke proxy http://127.0.0.1:4180/api/health (skip auth)" >&2
  local i
  for i in 1 2 3 4 5 6 7 8; do
    if ssh_pi "wget -qO- http://127.0.0.1:4180/api/health 2>/dev/null" | grep -q ok; then
      echo "health via proxy: ok"
      return 0
    fi
    sleep 1
  done
  echo "failed — log:" >&2
  ssh_pi "tail -40 '$PI_AUTH_DATA/oauth2-proxy-dashboard.log' 2>/dev/null || true" >&2
  return 1
}

load_env
cmd="${1:-deploy}"
case "$cmd" in
  smoke) smoke ;;
  deploy|"")
    echo "deploy-oauth2-proxy-binary (HARNESS_CONFIRM=1 to run)" >&2
    echo "  $PI_SSH → $PI_AUTH" >&2
    if [[ "${HARNESS_CONFIRM:-}" != "1" ]]; then exit 0; fi
    ensure_binary
    install_remote
    if ssh_pi "grep -q REPLACE_ME '$PI_AUTH/oauth2-proxy-dashboard.env'"; then
      echo "" >&2
      echo "STOP: set OIDC_CLIENT_ID and OIDC_CLIENT_SECRET in:" >&2
      echo "  $PI_AUTH/oauth2-proxy-dashboard.env" >&2
      echo "Then: HARNESS_CONFIRM=1 $0 start" >&2
      exit 2
    fi
    restart_remote
    smoke
    ;;
  start)
    if [[ "${HARNESS_CONFIRM:-}" != "1" ]]; then
      echo "set HARNESS_CONFIRM=1" >&2
      exit 1
    fi
    restart_remote
    smoke
    ;;
  *)
    echo "usage: $0 [deploy|start|smoke]" >&2
    exit 1
    ;;
esac

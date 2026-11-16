#!/bin/sh
# oauth2-proxy in front of dashboard (piCore, no Docker).
set -eu

ROOT="${AUTH_ROOT:-/mnt/mmcblk0p2/auth}"
DATA="${AUTH_DATA:-/mnt/mmcblk0p2/auth-data}"
PIDFILE="$DATA/oauth2-proxy-dashboard.pid"
LOG="$DATA/oauth2-proxy-dashboard.log"
BIN="$ROOT/bin/oauth2-proxy"
CFG="$ROOT/oauth2-proxy-dashboard.cfg"
ENVF="$ROOT/oauth2-proxy-dashboard.env"

mkdir -p "$DATA"

if [ -f "$PIDFILE" ]; then
  old="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    echo "oauth2-proxy-dashboard already running pid=$old"
    exit 0
  fi
  rm -f "$PIDFILE"
fi

if netstat -ltn 2>/dev/null | grep -q ':4180'; then
  echo "port 4180 already in use" >&2
  exit 1
fi

if [ ! -x "$BIN" ]; then
  echo "missing $BIN" >&2
  exit 1
fi
if [ ! -f "$CFG" ] || [ ! -f "$ENVF" ]; then
  echo "missing $CFG or $ENVF" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$ENVF"
set +a

# Expand ${VAR} in cfg via envsubst if available; else sed fallback
TMPCFG="$DATA/oauth2-proxy-dashboard.cfg.runtime"
if command -v envsubst >/dev/null 2>&1; then
  envsubst <"$CFG" >"$TMPCFG"
else
  # busybox-friendly: replace known keys
  sed -e "s|\${OIDC_CLIENT_ID}|${OIDC_CLIENT_ID}|g" \
      -e "s|\${OIDC_CLIENT_SECRET}|${OIDC_CLIENT_SECRET}|g" \
      -e "s|\${OIDC_COOKIE_SECRET}|${OIDC_COOKIE_SECRET}|g" \
      "$CFG" >"$TMPCFG"
fi

nohup "$BIN" --config="$TMPCFG" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "started oauth2-proxy-dashboard pid=$(cat "$PIDFILE") log=$LOG"

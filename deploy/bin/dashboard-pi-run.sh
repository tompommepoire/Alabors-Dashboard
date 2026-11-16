#!/bin/sh
# Start Alabor Dashboard on piCorePlayer (persistent SD card tree).
set -eu

ROOT="${DASHBOARD_ROOT:-/mnt/mmcblk0p2/dashboard}"
DATA="${DASHBOARD_DATA:-/mnt/mmcblk0p2/dashboard-data}"
PIDFILE="$DATA/dashboard.pid"
LOG="$DATA/server.log"
NODE="$ROOT/runtime/node/bin/node"

mkdir -p "$DATA"
cd "$ROOT" || exit 1

if [ -f "$PIDFILE" ]; then
  old="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    echo "dashboard already running pid=$old"
    exit 0
  fi
  rm -f "$PIDFILE"
fi

if netstat -ltn 2>/dev/null | grep -q ':8790'; then
  echo "port 8790 already in use" >&2
  exit 1
fi

set -a
# shellcheck disable=SC1090
. "$DATA/env"
set +a

export HOST="${HOST:-127.0.0.1}"
export HOSTNAME="${HOSTNAME:-127.0.0.1}"
export PORT="${PORT:-8790}"
export NODE_ENV=production

if [ ! -x "$NODE" ]; then
  echo "missing $NODE" >&2
  exit 1
fi

nohup "$NODE" "$ROOT/server.js" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "started dashboard pid=$(cat "$PIDFILE") log=$LOG"

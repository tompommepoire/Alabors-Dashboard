#!/bin/sh
# Start Pocket ID on piCorePlayer (no Docker).
set -eu

ROOT="${AUTH_ROOT:-/mnt/mmcblk0p2/auth}"
DATA="${AUTH_DATA:-/mnt/mmcblk0p2/auth-data}"
PIDFILE="$DATA/pocket-id.pid"
LOG="$DATA/pocket-id.log"
BIN="$ROOT/bin/pocket-id"

mkdir -p "$DATA/data"
cd "$ROOT" || exit 1

if [ -f "$PIDFILE" ]; then
  old="$(cat "$PIDFILE" 2>/dev/null || true)"
  if [ -n "$old" ] && kill -0 "$old" 2>/dev/null; then
    echo "pocket-id already running pid=$old"
    exit 0
  fi
  rm -f "$PIDFILE"
fi

if netstat -ltn 2>/dev/null | grep -q ':1411'; then
  echo "port 1411 already in use" >&2
  exit 1
fi

if [ ! -f "$ROOT/.env" ]; then
  echo "missing $ROOT/.env" >&2
  exit 1
fi

if [ ! -x "$BIN" ]; then
  echo "missing $BIN" >&2
  exit 1
fi

# Pocket ID reads .env from cwd; data under ./data by default — use AUTH_DATA/data
set -a
# shellcheck disable=SC1090
. "$ROOT/.env"
set +a

# Keep SQLite on persistent partition
export POCKET_ID_DATA_PATH="${POCKET_ID_DATA_PATH:-$DATA/data}"
# Some builds use working-dir data/; we chdir into DATA so ./data is persistent
cd "$DATA" || exit 1
# Symlink/copy env next to cwd if needed
ln -sf "$ROOT/.env" "$DATA/.env" 2>/dev/null || cp -f "$ROOT/.env" "$DATA/.env"

nohup "$BIN" >>"$LOG" 2>&1 &
echo $! >"$PIDFILE"
echo "started pocket-id pid=$(cat "$PIDFILE") log=$LOG"

#!/usr/bin/env bash
# Read-only Linux diagnostics. Does not source .env or change services/settings.
set -u
if [ "$(uname -s)" != Linux ]; then
  echo 'Run this script on the production Linux server.'
  exit 1
fi
section() { printf '\n%s\n' "$1"; }
section 'RAM and swap'
free -h
swapon --show
section 'Disk space and shared-memory filesystem'
df -h / /dev/shm
df -i / /dev/shm
section 'Largest resident processes (names only; no credentials/arguments)'
ps -eo pid,comm,rss,%mem --sort=-rss | head -n 16
section 'Recent kernel memory failures'
if command -v rg >/dev/null; then
  journalctl -k --since '24 hours ago' --no-pager 2>/dev/null | rg -i 'out of memory|oom-kill|killed process|memory cgroup' | tail -n 25
else
  journalctl -k --since '24 hours ago' --no-pager 2>/dev/null | grep -Ei 'out of memory|oom-kill|killed process|memory cgroup' | tail -n 25
fi
section 'PostgreSQL settings and lock usage (local default instance)'
if [ "$(id -u)" = 0 ] && command -v runuser >/dev/null && command -v psql >/dev/null; then
  runuser -u postgres -- psql -X -d postgres -v ON_ERROR_STOP=1 <<'SQL'
SELECT name, setting, unit, pending_restart FROM pg_settings
WHERE name IN ('max_connections','max_locks_per_transaction','shared_buffers','work_mem','maintenance_work_mem','max_parallel_workers_per_gather');
SELECT mode, count(*) FROM pg_locks GROUP BY mode ORDER BY count(*) DESC;
SELECT state, count(*) FROM pg_stat_activity GROUP BY state;
SQL
else
  echo 'For local PostgreSQL details, run this script with sudo. Remote/container databases need their own connection.'
fi
section 'Finished: no configuration or records changed'

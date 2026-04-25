# Follow-up: why did Apr 17 saves fail?

Key finding from section 2: the student's files are **not empty on disk** — `weather_api.py` is 6130 bytes, last modified **Apr 16 17:15 EDT**. Symlinks, container, mounts all fine.

Conclusion: something on **Apr 17** made `PUT /files/file/...` fail for her. Nothing she typed that day reached disk. The editor rendering "empty" is almost certainly a load-error state after the save errors.

Timezone confirmed: server is **EDT (-0400)**. Container was spawned **Apr 17 11:19 EDT**, so the incident window is probably **Apr 17 10:30 → 16:00 EDT**.

Run these and paste back.

---

## 1. Was there a service restart / crash / OOM on Apr 17?

```bash
# Service lifecycle events for the whole day (EDT)
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -E "Started|Stopping|Stopped|Reloaded|Main process exited|Killed|killed|SIGTERM|SIGKILL|uvicorn|Application startup|Shutting down|OOM"

# Kernel/dmesg for OOM-killer or disk errors that day
journalctl -k --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -iE "oom|killed|out of memory|ext4-fs|i/o error|read-only" | tail -100

# Deploy script runs (webhook or manual)
journalctl --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -iE "deploy\.sh|git reset|pnpm build|docker build -t 3compute" | tail -50
```

---

## 2. All tracebacks on Apr 17

The spammy socket.io/heartbeat lines don't trace — filtering those out.

```bash
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -vE "engineio|socketio\.(server|asyncio_server|asgi)|PING|PONG" \
  | grep -E "Traceback|ERROR|Error:|Exception|errno|500 Internal|OSError|IOError|PermissionError|FileNotFoundError|DatabaseError|sqlalchemy|OperationalError|Failed to|denied" \
  | head -400
```

If that returns nothing, cast a wider net:

```bash
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -vE "engineio|socketio\.(server|asyncio_server|asgi)" \
  | grep -iE "error|fail|traceback|denied|exception" \
  | head -400
```

---

## 3. Everything for this student on Apr 17

```bash
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -E "116413670418889020139|blh237" \
  | head -300
```

---

## 4. All PUT /files/file requests on Apr 17

```bash
# FastAPI/uvicorn access logs show "PUT /api/files/file/... HTTP/1.1" {status}. Pull all of them.
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -E "PUT /(api/)?files/file" \
  | head -300

# Just the non-200s, so we can see how many saves failed and with what status
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-18 00:00" --no-pager \
  | grep -E "PUT /(api/)?files/file" \
  | grep -vE "\" 200 " \
  | head -200
```

---

## 5. Focused window around the container spawn + incident (11:00 → 16:00 EDT)

```bash
journalctl -u 3compute --since "2026-04-17 11:00" --until "2026-04-17 16:00" --no-pager \
  | grep -vE "engineio|socketio\.(server|asyncio_server|asgi)|PING|PONG|heartbeat|\" 200 OK\"|GET /api/files/list" \
  > /tmp/3c-incident.log
wc -l /tmp/3c-incident.log
head -200 /tmp/3c-incident.log
echo '---'
tail -200 /tmp/3c-incident.log
```

---

## 6. Disk / inode pressure

```bash
df -h / /var /var/lib /var/lib/3compute /tmp
df -i / /var /var/lib /var/lib/3compute /tmp
free -h
```

---

## 7. Sanity: can www-data write to that exact file right now?

```bash
sudo -u www-data bash -c 'test -w "/var/lib/3compute/classrooms/db67a5b3-4800-42b3-9b4c-e4fabd22d934/participants/blh237@cornell.edu/Weather-App/weather_api.py" && echo WRITE-OK || echo WRITE-NO'

# And simulate the PUT path's open-for-write (don't actually change content)
sudo -u www-data python3 -c "
import os
p = '/var/lib/3compute/classrooms/db67a5b3-4800-42b3-9b4c-e4fabd22d934/participants/blh237@cornell.edu/Weather-App/weather_api.py'
try:
    # Mirror update_file: chown then open('w').  Skip chown if not root — just open RW.
    f = os.open(p, os.O_RDWR)
    os.close(f)
    print('O_RDWR OK')
except Exception as e:
    print('OPEN-FAIL:', e)
"
```

---

## What I want to know from this output

1. **Was the service restarting** during her edits? (section 1 — most likely culprit: she edited during/right after a deploy or crash)
2. **What status code** did her PUTs return? 401/403/500/502? (section 4)
3. **Any Python traceback** that day? (section 2)
4. **Disk/memory full?** (section 6)
5. **Permissions broken** right now? (section 7)

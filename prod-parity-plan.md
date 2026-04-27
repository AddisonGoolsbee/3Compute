# Prod-Parity Plan

Goal: make `docker compose up` reproduce the same permission model as production so that permission bugs are caught locally.

---

## Root Cause Summary

Production has a two-user permission model:

| Actor | UID | GID | Writes to |
|---|---|---|---|
| Backend (`www-data`) | 33 | 33 (primary) + **995** (supplementary) | uploads/, classrooms/ via API |
| Container user (`myuser`) | 999 | 995 | /app (= uploads/<uid>) via terminal |

Files flow between these two actors constantly (lesson import → container edits it, terminal creates file → backend reads/serves it). The cross-access works because **both actors share GID 995** (`3compute-container`) and files are created group-writable (mode `664`, umask `002`).

**Dev today breaks this in three ways:**

1. **`Dockerfile.dev` never creates GID 995.** The backend container has no `3compute-container` group and `www-data` (UID 33) has no supplementary GID 995. Cross-access silently works only because directories are `0o777`, masking the real problem.

2. **`data-init` chowns everything `33:33`.** In prod the group should be `995` (`3compute-container`), not `33` (`www-data`). Backend-created files should have `33:995` ownership so containers can write them.

3. **`ExecStartPre=+chown -R www-data:www-data /var/lib/3compute` in the systemd unit** recursively re-chowns all upload files to `33:33` on every service restart, stripping GID 995. Container users (999:995) then hit read-only "others" bits on their own previously-created files after a backend restart. This is likely a real prod bug.

4. **IPTables rules are skipped in dev** (`DOCKER_HOST` is set → condition short-circuits). Container-to-host network isolation is never tested locally.

5. **`docker.py prepare_user_directory` uses `os.getgid()` (returns 33) instead of `CONTAINER_USER_GID` (995)** for the directory group. In prod this should be `33:995` so the setgid pattern can work.

---

## Proposed Changes

### Change 1 — `Dockerfile.dev`: create GID 995 and add www-data to it

```dockerfile
FROM docker:27-cli AS docker-cli

FROM python:3.12-slim

# Mirror the prod host: create 3compute-container group (GID 995)
# and add www-data to it, exactly as CLAUDE.md one-time setup requires.
RUN groupadd -g 995 3compute-container \
 && usermod -a -G 3compute-container www-data

COPY --from=docker-cli /usr/local/bin/docker /usr/local/bin/docker

WORKDIR /var/www/3compute
COPY backend/requirements.txt backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt
```

**Effect:** `www-data` inside the dev container has the same supplementary group as in prod. Files owned `999:995` with mode `664` are now writable by the backend — same as prod.

---

### Change 2 — `docker-compose.yml` `data-init`: use GID 995 for group ownership

Change:
```yaml
command: sh -c "mkdir -p /data/uploads /data/classrooms && chown -R 33:33 /data"
```
To:
```yaml
command: >-
  sh -c "
    addgroup -g 995 3compute-container 2>/dev/null || true &&
    mkdir -p /data/uploads /data/classrooms &&
    chown 33:995 /data/uploads &&
    chown 33:995 /data/classrooms &&
    chmod 775 /data/uploads /data/classrooms
  "
```

**Effect:** Upload and classroom directories are now group-owned by `3compute-container` (GID 995) with mode `775`, matching prod intent. New files created in these dirs can be written by any process with GID 995.

---

### Change 3 — `docker-compose.yml` `backend`: set supplementary group

The `user: "33:33"` in docker-compose only sets UID:GID. To also grant the supplementary group inside the container we need to pass `--group-add 995` via the `group_add` key:

```yaml
backend:
  user: "33:33"
  group_add:
    - "995"   # 3compute-container — mirrors prod `usermod -a -G 3compute-container www-data`
```

**Effect:** The backend process has effective groups `[33, 995]` just like `www-data` does in prod.

---

### Change 4 — `production/etc/systemd/system/3compute.service`: fix recursive chown

The current `ExecStartPre`:
```ini
ExecStartPre=+/bin/chown -R www-data:www-data /var/lib/3compute
```
…recursively re-chowns all user upload files to `33:33` on every restart. Container users then can't write their own files (they're `999:995`, files become `33:33:664` → others get `r--`).

Change to:
```ini
ExecStartPre=+/bin/mkdir -p /var/lib/3compute/uploads /var/lib/3compute/classrooms
ExecStartPre=+/bin/chown www-data:3compute-container /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
ExecStartPre=+/bin/chmod 775 /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
ExecStartPre=+/bin/find /var/lib/3compute/classrooms -type d -exec /bin/chmod 775 {} +
```

Key differences:
- **No `-R`** on chown — only the three top-level dirs get touched, not user files inside.
- Group is `3compute-container` (GID 995), not `www-data` (GID 33).
- Mode `775` instead of `777` — group write is enough, world-write is overly permissive.

---

### Change 5 — `docker.py` `prepare_user_directory`: use `CONTAINER_USER_GID` for group

Current:
```python
os.chown(user_dir, os.getuid(), os.getgid())
os.chmod(user_dir, 0o777)
```

Change to:
```python
os.chown(user_dir, os.getuid(), CONTAINER_USER_GID)  # 33:995
os.chmod(user_dir, 0o775)   # group write is sufficient; drop world-write
# Setgid bit: new files/dirs inside inherit GID 995 automatically
current_mode = os.stat(user_dir).st_mode
os.chmod(user_dir, current_mode | stat.S_ISGID)
```

Also do the same for classroom participant directories created by the backend.

**Effect:** The setgid bit (`chmod g+s`) on a directory causes all new files created inside to inherit the directory's group (995) regardless of the creator's primary group. This removes the need to explicitly chown every file.

Requires adding `import stat` at the top of `docker.py`.

---

### Change 6 — `production/opt/deploy.sh`: fix chown to use correct group

```bash
chown www-data:3compute-container /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
chmod 775 /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
```

(Shallow chown only — no `-R` — same reasoning as Change 4.)

---

### Change 7 — IPTables in DinD (network isolation testing)

Currently `docker.py` skips iptables when `DOCKER_HOST` is set:
```python
if platform.system() != "Linux" or os.getenv("DOCKER_HOST") or os.getenv("CI"):
    return
```

To test isolation in dev, add a DinD-aware iptables setup. The cleanest approach: add a one-shot service in `docker-compose.yml` that runs inside DinD after startup and applies the same iptables rules:

```yaml
iptables-setup:
  image: docker:27-dind
  privileged: true
  network_mode: "service:dind"
  depends_on:
    dind:
      condition: service_healthy
  entrypoint: sh -c |
    # Wait for isolated_net to exist (created by first container spawn)
    # This service is informational — real rule injection happens in docker.py
    echo "IPTables test setup — rules applied by backend on first spawn"
```

Alternatively (simpler): remove the `os.getenv("DOCKER_HOST")` short-circuit and instead gate only on whether iptables is actually available:

```python
import shutil
if platform.system() != "Linux" or os.getenv("CI"):
    return
if not shutil.which("iptables"):
    logger.info("iptables not found, skipping network isolation (likely macOS or DinD)")
    return
```

Then in `docker-compose.yml`, give the `dind` container a health-check that also verifies iptables:
```yaml
dind:
  privileged: true
  cap_add:
    - NET_ADMIN
```

The DinD container already runs privileged so iptables inside DinD should work. The backend would need to exec iptables commands via the DinD container rather than running them locally — this is a bigger change and lower priority.

---

## Priority Order

| # | Change | Effort | Impact |
|---|--------|--------|--------|
| 1 | `Dockerfile.dev`: add GID 995 + add www-data to it | Tiny | High — fixes root of permission masking |
| 2 | `data-init`: chown to `33:995` | Tiny | High |
| 3 | `docker-compose.yml`: `group_add: ["995"]` on backend | Tiny | High |
| 4 | `systemd service`: remove `-R` chown, use `3compute-container` group | Small | High — likely fixes real prod bug |
| 5 | `deploy.sh`: shallow chown with correct group | Tiny | Medium |
| 6 | `docker.py`: use `CONTAINER_USER_GID`, add setgid bit | Small | Medium — makes new dirs auto-inherit group |
| 7 | IPTables in DinD | Large | Low (security feature, not a permission bug) |

Changes 1–3 can be done together in one commit and immediately make dev reproduce the prod permission model. Changes 4–5 fix the actual prod service restart bug. Change 6 makes the permission model self-healing. Change 7 is optional.

---

## What This Does NOT Cover

- **macOS host**: Even with DinD, iptables rules run inside the DinD VM, not the macOS kernel. Network isolation testing is fundamentally different. Only achievable with a Linux VM or CI runner.
- **Caddy/TLS**: Not reproducible locally (requires real DNS + Cloudflare). Use `http://localhost` for dev.
- **Port range**: `PORT_BASE=10000` applies in both envs; no difference needed.
- **Webhook deploy flow**: Not testable locally without a tunnel.

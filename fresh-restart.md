# Fresh Restart Guide

This guide covers wiping all state (containers, databases, user files, subdomains) and starting fresh on both local and production.

## Local (Docker Compose)

```bash
# 1. Stop everything and remove containers + volumes
docker compose down -v

# 2. Remove any orphan containers from DinD (just in case)
docker ps -a --filter "name=3compute" -q | xargs -r docker rm -f

# 3. Delete the local SQLite database
rm -f backend/3compute.db

# 4. Start fresh
docker compose up --build
```

That's it. The `-v` flag removes all named volumes (uploads, classrooms, DinD storage, etc.), and removing the `.db` file wipes the database. The backend recreates the schema on startup.

## Production

Production uses a systemd service, host Docker (not DinD), Caddy for subdomain routing, and Nginx as the reverse proxy. There's more state to clean up.

### One-time host setup (skip if already done)

The backend (www-data) and the container user (999:995) share files via GID 995 (`3compute-container`). If this is a fresh host, create the group and add www-data to it:

```bash
getent group 3compute-container >/dev/null || sudo groupadd -g 995 3compute-container
sudo usermod -a -G 3compute-container www-data
```

### Fresh-restart steps

```bash
# 1. Stop the backend service
sudo systemctl stop 3compute

# 2. Kill and remove all user containers
docker ps -a --filter "name=3compute-" -q | xargs -r docker rm -f

# 3. Remove the 3compute Docker image (will be rebuilt on deploy)
docker rmi 3compute:latest || true

# 4. Wipe user uploads and classroom data
sudo rm -rf /var/lib/3compute/uploads/*
sudo rm -rf /var/lib/3compute/classrooms/*

# 5. Wipe the database
rm -f /var/www/3compute/backend/3compute.db

# 6. Reset Caddy's dynamic subdomain routes
#    This removes all user-claimed subdomain routes from Caddy's config.
#    The backend re-registers the catchall route on startup.
curl -s localhost:2019/config/apps/http/servers/srv0/routes \
  | python3 -c "
import json, sys, urllib.request
routes = json.load(sys.stdin)
# Keep only routes that are NOT app-* subdomain routes
kept = [r for r in routes if not (r.get('@id', '') or '').startswith('app-')]
req = urllib.request.Request(
    'http://localhost:2019/config/apps/http/servers/srv0/routes',
    data=json.dumps(kept).encode(),
    headers={'Content-Type': 'application/json'},
    method='PATCH'
)
urllib.request.urlopen(req)
print(f'Cleared {len(routes) - len(kept)} subdomain routes')
"

# 7. Fix ownership on the three top-level dirs.
#    IMPORTANT: no -R here. User files inside are owned by the container user
#    (999:995) and must stay that way so the terminal can write them. The
#    three dirs are group-owned 3compute-container (GID 995) with setgid so
#    new entries inherit the group automatically.
sudo chown www-data:3compute-container /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
sudo chmod 2775 /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms

# 8. Rebuild and restart via the deploy script
sudo /var/www/3compute/production/opt/deploy.sh
```

### What each step does

| Step | What it removes |
|------|----------------|
| Stop service | Stops the FastAPI backend |
| Kill containers | Removes all running user terminal containers |
| Remove image | Forces a fresh Docker image build for user containers |
| Wipe uploads | Deletes all user files, workspace content, READMEs |
| Wipe classrooms | Deletes all classroom data: assignments, drafts, participant copies |
| Wipe database | Deletes all users, classrooms, memberships, test results, port allocations, subdomain records |
| Reset Caddy | Removes all `*.app.3compute.org` reverse proxy routes so no stale subdomains remain |
| Deploy | Rebuilds frontend, installs deps, rebuilds Docker image, restarts the service |

### After restart

- All users will need to log in again (sessions are gone with the DB)
- The allowlist (`users.json`) is separate and preserved unless you delete it
- Caddy's TLS certs are managed by Caddy itself and are not affected
- Nginx config is not affected

# 3Compute Runbook

## Local Development

### Prerequisites
- Docker Desktop running
- `backend/.env` populated (copy from `backend/.env.example` and fill in Google OAuth credentials)

### Start the dev environment

```bash
docker compose up --build
```

On first run this builds two images and pulls DinD — takes a few minutes.
On subsequent runs `--build` is only needed if you change `backend/requirements.txt` or `Dockerfile.dev`.

| Service  | URL                        |
|----------|----------------------------|
| Frontend | http://localhost:5173       |
| Backend  | http://localhost:5555       |

The backend hot-reloads on Python file changes. The frontend hot-reloads via Vite.

### Stop

```bash
docker compose down
```

### Wipe all data and start fresh

```bash
docker compose down -v   # -v removes named volumes (uploads, classrooms, db)
docker compose up --build
```

### View logs

```bash
docker compose logs -f backend
docker compose logs -f frontend
docker compose logs -f dind
```

### Run backend tests

```bash
docker compose exec backend python -m pytest backend/ -v
```

Or outside of compose (native):
```bash
cd /path/to/3compute
python -m pytest backend/ -v
```

### Open a shell in the backend container

```bash
docker compose exec backend bash
```

### Inspect user terminal containers (spawned inside DinD)

```bash
# List running user containers
docker compose exec dind docker ps

# Exec into a user container
docker compose exec dind docker exec -it <container_name> bash
```

---

## Production Deployment

### Server: 3compute.org
- App lives at `/var/www/3compute`
- Service: `systemd` unit `3compute.service` running as `www-data`
- Data persists in `/var/lib/3compute/`

### Deploy latest main

```bash
sudo /opt/deploy.sh
```

This will:
1. `git reset --hard origin/main`
2. Build frontend (`pnpm build`)
3. Recreate Python venv and install requirements
4. Rebuild Docker terminal image (`docker build -t 3compute:latest backend/`)
5. Copy updated systemd service file and reload daemon
6. Ensure `/var/lib/3compute/{uploads,classrooms}` exist and are owned by `www-data`
7. `systemctl restart 3compute`

### Check service status

```bash
sudo systemctl status 3compute
sudo journalctl -u 3compute -f
```

### Wipe all production data and restart fresh

```bash
sudo systemctl stop 3compute

# Kill any running user containers
sudo docker ps -q --filter "name=3compute" | xargs -r sudo docker kill

# Wipe persistent data
sudo rm -rf /var/lib/3compute/uploads /var/lib/3compute/classrooms /var/lib/3compute/users.json

# Wipe the database
sudo rm -f /var/www/3compute/backend/3compute.db

# Redeploy (recreates dirs, restarts service, DB recreated on startup)
sudo /opt/deploy.sh
```

### Manually restart the service

```bash
sudo systemctl restart 3compute
```

### Inspect user terminal containers on prod

```bash
sudo docker ps
sudo docker exec -it <container_name> bash
```

---

## Architecture Notes

### How terminal containers work
1. User logs in → backend calls `spawn_container(user_id)` on first terminal open
2. A Docker container (`3compute:latest` image) is started with:
   - `/var/lib/3compute/uploads/{user_id}` bind-mounted as `/app` inside the container
   - Each enrolled classroom bind-mounted as `/classrooms/{id}`
   - Symlinks created inside the container at `/app/{slug}` → `/classrooms/{id}` (or participant subdir)
   - Symlinks also created on the host filesystem for the file list API to detect them
3. Terminal connects via socket.io → tmux session inside the container

### Two principals need write access to the same dirs
- `www-data` (API process) writes files, creates symlinks on host
- Container user `999:995` writes files inside the container (same dirs via bind mount)
- Solution: `chmod 777` on user upload dirs and classroom dirs

### Local dev vs prod path difference
| Path              | Dev (docker compose)           | Prod                            |
|-------------------|--------------------------------|---------------------------------|
| Uploads root      | named volume → `/var/lib/3compute/uploads` | `/var/lib/3compute/uploads` |
| Classrooms root   | named volume → `/var/lib/3compute/classrooms` | `/var/lib/3compute/classrooms` |
| Database          | `backend/3compute.db`          | `backend/3compute.db`           |
| users.json        | `/var/lib/3compute/users.json` | `/var/lib/3compute/users.json`  |
| Docker host       | `tcp://dind:2375` (DinD)       | host Docker socket              |

In dev, user containers are spawned inside a DinD container. Both DinD and the backend container mount the same named volumes at identical paths, so volume specs passed to `docker run` resolve correctly inside DinD.

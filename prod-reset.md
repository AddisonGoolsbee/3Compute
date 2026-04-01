# Production Reset: Wipe All Data and Start Fresh

Run all commands as root (or with `sudo`) on the production server.

---

## 1. Stop the backend service

```bash
sudo systemctl stop 3compute
```

---

## 2. Stop and remove all user Docker containers

```bash
# List all user containers
sudo docker ps -a --filter "name=user-container-" --format "{{.Names}}"

# Stop and remove them all
sudo docker ps -a --filter "name=user-container-" -q | xargs -r sudo docker stop
sudo docker ps -a --filter "name=user-container-" -q | xargs -r sudo docker rm
```

---

## 3. Remove the SQLite database

```bash
sudo rm -f /var/www/3compute/backend/3compute.db
```

---

## 4. Wipe user uploads

```bash
sudo rm -rf /var/lib/3compute/uploads/*
```

---

## 5. Wipe classroom data

```bash
sudo rm -rf /var/lib/3compute/classrooms/*
```

---

## 6. Remove the users JSON file (if it exists)

```bash
sudo rm -f /var/lib/3compute/users.json
```

---

## 7. Remove any leftover Caddy subdomain routes

Each user's subdomain routes are registered dynamically in Caddy. You can wipe them all at once via the Caddy Admin API:

```bash
# List all current route IDs
curl -s http://localhost:2019/config/apps/http/servers/srv0/routes \
  | python3 -c "import sys,json; routes=json.load(sys.stdin); [print(r.get('@id','(no id)')) for r in routes]"

# Remove all app-* routes (user subdomain routes)
# This removes them one by one — run the loop:
for id in $(curl -s http://localhost:2019/config/apps/http/servers/srv0/routes \
  | python3 -c "import sys,json; routes=json.load(sys.stdin); [print(r['@id']) for r in routes if r.get('@id','').startswith('app-')]"); do
  curl -s -X DELETE "http://localhost:2019/id/$id"
  echo "Removed $id"
done
```

---

## 8. Restart the backend service

The service will recreate the database schema on startup automatically.

```bash
sudo systemctl start 3compute
sudo systemctl status 3compute
```

---

## 9. Verify clean state

```bash
# No user containers should be running
sudo docker ps --filter "name=user-container-"

# Database should exist and be freshly created
ls -lh /var/www/3compute/backend/3compute.db

# Uploads and classrooms should be empty
ls /var/lib/3compute/uploads/
ls /var/lib/3compute/classrooms/
```

---

## Notes

- The backend Docker image (`3compute-user-env`) is **not** removed by this process — it does not contain user data.
- After reset, the first Google OAuth login will create a fresh user account and a new Docker container.
- If you also want to remove the Docker image (to force a rebuild on next deploy), run:
  ```bash
  sudo docker rmi 3compute-user-env
  ```
  The next deploy or user login will rebuild it automatically.

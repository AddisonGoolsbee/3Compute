# Prod Info Gathering

Run these on the production server and paste the output back. Used to diagnose permission parity between dev and prod.

---

## 1. Users & Groups

```bash
# www-data's full group membership
id www-data

# Does 3compute-container group exist and what GID is it?
getent group 3compute-container

# All groups on the system (looking for 3compute-container)
cat /etc/group | grep -E "3compute|www-data|999|995|33"

# Confirm UIDs
getent passwd www-data
getent passwd 999 2>/dev/null || echo "(no user at UID 999 on host)"
```

---

## 2. Upload & Classroom Directory Permissions

```bash
# Top-level ownership and mode
stat /var/lib/3compute
stat /var/lib/3compute/uploads
stat /var/lib/3compute/classrooms

# Sample: one user's upload dir (replace <uid> with a real user ID from the DB)
ls -la /var/lib/3compute/uploads/ | head -20

# Inside one user dir: what does ownership/mode look like for files the
# container created vs files the backend created?
# (replace <uid> with a real user ID)
ls -la /var/lib/3compute/uploads/<uid>/ 2>/dev/null | head -20

# Same for classrooms
ls -la /var/lib/3compute/classrooms/ 2>/dev/null | head -20
ls -la /var/lib/3compute/classrooms/<cid>/ 2>/dev/null | head -10
ls -la /var/lib/3compute/classrooms/<cid>/participants/ 2>/dev/null | head -10
```

---

## 3. Symlink Structure

```bash
# Show symlinks inside a user's upload dir (these point into classrooms/)
find /var/lib/3compute/uploads/<uid> -maxdepth 1 -type l -ls 2>/dev/null | head -20

# Show what a participant's classroom folder looks like
find /var/lib/3compute/classrooms/<cid>/participants -maxdepth 2 -ls 2>/dev/null | head -20
```

---

## 4. Backend Process & Effective Permissions

```bash
# What user/group the backend process is actually running as
ps aux | grep "[p]ython.*backend"

# Can www-data write to a user's upload dir right now?
sudo -u www-data touch /var/lib/3compute/uploads/<uid>/test_write && \
  echo "WRITE OK" && \
  sudo -u www-data rm /var/lib/3compute/uploads/<uid>/test_write || \
  echo "WRITE FAILED"

# Can www-data write to a classroom participant dir?
# (find a real participant path first)
ls /var/lib/3compute/classrooms/<cid>/participants/
```

---

## 5. Container Permissions (while one is running)

```bash
# List running user containers
docker ps --filter "name=3compute-user-" --format "table {{.Names}}\t{{.Status}}"

# Exec into one and check effective user + file ownership
# (replace <container_name> with one from above)
docker exec <container_name> id
docker exec <container_name> ls -la /app | head -20
docker exec <container_name> stat /app

# Can the container user (999:995) write to a file owned by www-data (33:33)?
docker exec <container_name> sh -c 'touch /app/__perm_test && stat /app/__perm_test && rm /app/__perm_test' 2>&1
```

---

## 6. IPTables State

```bash
# Show DOCKER-USER chain (where our isolation rules live)
iptables -L DOCKER-USER -n -v 2>/dev/null || echo "No DOCKER-USER chain"

# Show all relevant chains
iptables -L FORWARD -n -v --line-numbers 2>/dev/null | head -30

# List all bridge interfaces (one per Docker network)
ip link show type bridge | grep -E "br-|docker"

# Show which bridge corresponds to isolated_net
docker network ls
docker network inspect isolated_net 2>/dev/null | grep -E "Subnet|Gateway|Id|bridge"
```

---

## 7. Docker Socket Permissions

```bash
# Who owns the Docker socket and what mode is it?
stat /var/run/docker.sock
ls -la /var/run/docker.sock

# Is www-data in the docker group?
getent group docker
```

---

## 8. Systemd Service State

```bash
# Current service status
systemctl status 3compute --no-pager -l

# Last 50 lines of journal (permission errors show up here)
journalctl -u 3compute -n 50 --no-pager

# ExecStartPre output (what the pre-start hooks actually did)
journalctl -u 3compute -n 100 --no-pager | grep -E "chown|chmod|mkdir|permission|denied|error" -i
```

---

## 9. Recent Permission Errors in Logs

```bash
# Backend log file if it exists
tail -100 /var/www/3compute/logs/backend.log 2>/dev/null | grep -iE "permission|denied|error|errno" | tail -30

# Systemd journal for the service
journalctl -u 3compute --since "1 week ago" --no-pager | grep -iE "permiss|denied|errno|OperationError" | tail -40
```

---

## 10. Umask & Shell Environment for www-data

```bash
# What umask does the service process use?
# (This affects group-writability of files the backend creates)
sudo -u www-data bash -c 'umask; id'

# Does www-data's shell inherit 3compute-container group?
sudo -u www-data bash -c 'groups'
```

---

## 11. File Mode of Backend-Created vs Container-Created Files

```bash
# Find a file recently written by the backend (e.g. a lesson import)
find /var/lib/3compute -name "*.md" -newer /var/lib/3compute/classrooms -ls 2>/dev/null | head -10

# Find a file recently written inside a container (e.g. code edited in terminal)
find /var/lib/3compute/uploads -name "*.py" -ls 2>/dev/null | head -10
```

---

## 12. Directory Setgid Bits

```bash
# Check if any upload/classroom dirs have setgid set (s in group execute bit)
# This would auto-inherit group ownership — we might want to add this
find /var/lib/3compute -maxdepth 3 -perm /2000 -ls 2>/dev/null
```

#!/bin/bash
set -e

# Prevent concurrent deploys
exec 200>/var/lock/3compute-deploy.lock
if ! flock -n 200; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') Deploy already running, skipping" >> /var/log/3compute-deploy.log
  exit 0
fi

# Log all output to file AND stdout (so manual runs still show output)
exec > >(tee -a /var/log/3compute-deploy.log) 2>&1
echo ""
echo "=========================================="
echo "Deploy started at $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

cd /var/www/3compute

echo "Fetching latest main"
git fetch origin main
git reset --hard origin/main

echo "Building frontend"
cd frontend
pnpm install
pnpm build

echo "Backend setup"
cd ..
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r backend/requirements.txt

echo "Rebuilding backend image"
docker build -t 3compute:latest backend

echo "Updating systemd service"
cp /var/www/3compute/production/etc/systemd/system/3compute.service /etc/systemd/system/3compute.service
systemctl daemon-reload

echo "Ensuring runtime directories"
mkdir -p /var/lib/3compute/uploads /var/lib/3compute/classrooms
# Shallow chown (no -R): the three top-level dirs are www-data:3compute-container.
# Anything inside is owned by the container user (999:995) and must stay so the
# terminal can write. Setgid (2775) makes new items inherit GID 995.
chown www-data:3compute-container /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms
chmod 2775 /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms

echo "Updating /opt/deploy.sh from repo"
cp /var/www/3compute/production/opt/deploy.sh /opt/deploy.sh
chmod +x /opt/deploy.sh

echo "Restarting backend service"
systemctl restart 3compute

echo "Deploy finished at $(date '+%Y-%m-%d %H:%M:%S')"

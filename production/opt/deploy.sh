#!/bin/bash
set -e

# Prevent concurrent deploys
exec 200>/var/lock/csroom-deploy.lock
if ! flock -n 200; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') Deploy already running, skipping" >> /var/log/csroom-deploy.log
  exit 0
fi

# Log all output to file AND stdout (so manual runs still show output)
exec > >(tee -a /var/log/csroom-deploy.log) 2>&1
echo ""
echo "=========================================="
echo "Deploy started at $(date '+%Y-%m-%d %H:%M:%S')"
echo "=========================================="

cd /var/www/csroom

echo "Fetching latest main"
git fetch origin main
git reset --hard origin/main

echo "Building frontend"
cd frontend
# Pin pnpm 9: lockfile is v9.0, and pnpm 10 aborts the install with
# ERR_PNPM_IGNORED_BUILDS on esbuild without an interactive approve-builds
# step. Reinstalling on every deploy is cheap and keeps the host version
# from silently breaking us.
npm install -g pnpm@9 --silent
pnpm install
pnpm build

echo "Backend setup"
cd ..
python3 -m venv .venv
source .venv/bin/activate
pip3 install -r backend/requirements.txt

echo "Rebuilding backend image"
docker build -t csroom:latest backend

echo "Updating systemd service"
cp /var/www/csroom/production/etc/systemd/system/csroom.service /etc/systemd/system/csroom.service
systemctl daemon-reload

echo "Ensuring runtime directories"
mkdir -p /var/lib/csroom/uploads /var/lib/csroom/classrooms
# Shallow chown (no -R): the three top-level dirs are www-data:csroom-container.
# Anything inside is owned by the container user (999:995) and must stay so the
# terminal can write. Setgid (2775) makes new items inherit GID 995.
chown www-data:csroom-container /var/lib/csroom /var/lib/csroom/uploads /var/lib/csroom/classrooms
chmod 2775 /var/lib/csroom /var/lib/csroom/uploads /var/lib/csroom/classrooms

echo "Updating /opt/deploy.sh from repo"
cp /var/www/csroom/production/opt/deploy.sh /opt/deploy.sh
chmod +x /opt/deploy.sh

echo "Restarting backend service"
systemctl restart csroom

echo "Deploy finished at $(date '+%Y-%m-%d %H:%M:%S')"

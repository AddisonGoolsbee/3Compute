#!/bin/bash
set -e

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

echo "Restarting backend service"
systemctl restart 3compute

echo "All done"

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
chown www-data:www-data /var/lib/3compute /var/lib/3compute/uploads /var/lib/3compute/classrooms

echo "Restarting backend service"
systemctl restart 3compute

echo "All done"

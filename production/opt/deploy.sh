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

echo "Restarting backend service"
systemctl restart 3compute

echo "All done"

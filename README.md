# CS Room

Birdflop service for free educational server usage, with templates such as discord bot and personal website.

## Development

- Make sure you have a `.env` file in the `backend` and `frontend` folders

### Frontend

- `cd frontend`
- `pnpm i` to install dependencies
- `pnpm dev`
- Go to `http://127.0.0.1:5173`, NOT localhost

### Backend

- Make sure you have `Docker` installed and running.
- `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt` to setup and install dependencies
- `docker build -t csroom:latest backend` to build the docker image
- `python -m backend` to run the backend

### Testing

CS Room includes some testing for both frontend and backend:

```bash
# Run all tests
./run-tests.sh

# Backend tests only
cd backend && pytest --cov=. --cov-report=term-missing

# Frontend tests only
cd frontend && pnpm lint && pnpm test:coverage
```

If you want to identically test the github action workflows, use act (brew install act)
```bash
act -W .github/workflows/test.yml -j test-backend
act -W .github/workflows/test.yml -j test-frontend
```

## Troubleshooting

- TypeError: Failed to fetch at Module.clientLoader (http://localhost:5173/src/util/UserData.ts:5:25)
  - go to 127.0.0.1 instead of localhost
- Failed to set ownership for /tmp/uploads
  - run the backend with sudo: `sudo python -m backend`

## Productionization (Debian 12)

See `MIGRATION_TO_CSROOM.md` for a detailed step-by-step production setup guide.

Quick reference:

- github/csroom deploy key in /root/.ssh/id_rsa
- mkdir /var/www && cd /var/www
- apt install git
- git clone git@github.com:birdflop/csroom.git csroom && cd csroom

# Add Docker's official GPG key:

```
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
```

# Add the repository to Apt sources:

```
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/debian \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
```

```
sudo apt-get install docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo docker run hello-world
```

`docker build -t csroom:latest backend`

```
apt install python3.11-venv
python3 -m venv .venv && source .venv/bin/activate && pip3 install -r backend/requirements.txt
nano backend/.env
```

paste .env in

Move the production/ files in

- chmod +x /opt/deploy.sh

```
sudo systemctl daemon-reexec
sudo systemctl daemon-reload
sudo systemctl enable csroom
sudo systemctl start csroom
```

```curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
apt install -y nodejs
npm install -g pnpm
```

````cd frontend
pnpm i
pnpm build```

````

apt install -y nginx certbot python3-certbot-nginx
sudo certbot certonly --nginx -d www.csroom.org
sudo certbot certonly --nginx -d api.csroom.org```

`rm /etc/nginx/sites-enabled/default`

- symlink /etc/nginx/sites-available/csroom.org

- sudo chown -R www-data:www-data /var/www/csroom

service nginx restart

# 3Compute

Birdflop service for free educational server usage, with templates such as discord bot and personal website.

## Development

- Make sure you have a `.env` file in the `backend` folder

### Frontend

- `cd frontend`
- `pnpm i` to install dependencies
- `pnpm dev`

### Backend

- Make sure you have `Docker` installed and running.
- `python -m venv .venv && source .venv/bin/activate && pip install -r backend/requirements.txt` to setup and install dependencies
- `docker build -t 3compute:latest backend` to build the docker image
- `python -m backend` to run the backend


#### Productionization (Debian 12)
- github/paas deploy key in /root/.ssh/id_rsa
- mkdir /var/www && cd /var/www
- git clone git@github.com:birdflop/paas.git

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

`docker build -t paas:latest backend`

```
sudo apt install tmux
tmux new -s backend
python3 -m venv .venv && source .venv/bin/activate && pip3 install -r backend/requirements.txt
python3 -m backend
```

ctrl+b, d

```curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs```

```cd frontend
pnpm i
pnpm build```

```sudo certbot certonly --nginx -d www.3compute.org
sudo certbot certonly --nginx -d api.3compute.org```


`rm /etc/nginx/sites-enabled/default`

- copy production/etc/nginx/conf.d/3compute.org --> /etc/nginx/conf.d/3compute.org

service nginx restart



# Migration: 3Compute → CS Room (in-place)

This document is the complete, ordered checklist for taking your existing `3compute.org` production host and converting it to **CS Room** (`csroom.org`) **in place**. You keep the same Debian host, the same installed packages (Docker, Caddy, Node, nginx, certbot), the same GitHub repo (`birdflop/3compute`), the same deploy SSH key. Only the *data* is wiped (per your "reset 3compute data as necessary" direction) and the *names* are changed.

> **Prerequisite:** the codebase you're deploying must already be on the rename branch (the one this file lives on). The new code references `csroom`, `csroom-container`, `/var/lib/csroom`, `csroom.service`, `backend/csroom.db`, etc. exclusively — there is no compat shim.

---

## 0. Things only you can do (off-server)

These are the bits that aren't in this repo and aren't on your prod server.

### 0a. Domain registration & DNS

You need `csroom.org` registered. Configure these DNS records (Cloudflare strongly recommended — Caddy's wildcard cert depends on a Cloudflare API token):

| Type   | Name              | Value (your prod IP)        | Proxy/Cloud |
|--------|-------------------|-----------------------------|-------------|
| A      | `@`               | `<prod-ip>` (or skip)       | DNS only    |
| A      | `www`             | `<prod-ip>`                 | DNS only    |
| A      | `api`             | `<prod-ip>`                 | DNS only    |
| A      | `*.app`           | `<prod-ip>`                 | DNS only    |

**Important:** the `*.app` wildcard powers user-claimed subdomains like `myapp.app.csroom.org`. Caddy obtains its TLS cert via the **DNS-01** challenge against Cloudflare — keep these records DNS-only (orange-cloud OFF).

If you want the apex `csroom.org` to redirect to `www.csroom.org`, set up an apex `A` record + nginx server block, or use your registrar's domain forwarding.

You can keep the old `3compute.org` DNS records pointing at the same host during the transition; nothing on the new install will respond to those names anyway, so they'll just 404/525. Take them down whenever you like.

### 0b. Cloudflare API token (for Caddy DNS-01)

You may already have a Cloudflare API token from the 3compute install. **You can reuse it** — just give it permission on the new zone:

1. **My Profile → API Tokens →** find your existing CS Room/3Compute token (or create a new one with `Zone:DNS:Edit` + `Zone:Zone:Read`)
2. Edit zone resources: `Include → Specific zone → csroom.org` (you can keep `3compute.org` listed too while in transition, or replace it)
3. Save. The token value doesn't change unless you regenerate it.

If you'd rather make a clean break and create a fresh token: token must begin with `cfat_` (the codebase already uses the patched `ogerman/cloudflare` Caddy plugin that supports this format — see `RUNBOOK.md`).

### 0c. Google OAuth client

The existing `3compute.org` OAuth client is tied to the old origins; redirect URIs cannot include `csroom.org` without re-listing them. Easiest path is to **create a new OAuth client** for CS Room — that way the old one keeps working as long as 3compute.org is up, and you can flip cleanly.

(Alternative: edit the existing client and *add* the new origins/redirects alongside the old ones. Works fine; just keeps stale entries around.)

In the Google Cloud Console:

1. Pick (or create) a project for CS Room.
2. **APIs & Services → OAuth consent screen** — fill out app name "CS Room", support email, etc. Add the scopes `openid`, `email`, `profile`.
3. **APIs & Services → Credentials → Create Credentials → OAuth client ID → Web application**
4. Authorized JavaScript origins:
   - `https://www.csroom.org`
   - `http://127.0.0.1:5173` (for local dev — optional)
5. Authorized redirect URIs:
   - `https://api.csroom.org/api/auth/callback`
   - `http://127.0.0.1:5555/api/auth/callback` (for local dev — optional)
6. Save the client ID and client secret. They go into `backend/.env` later.

### 0d. GitHub repo & webhook

You're keeping the repo at `birdflop/3compute` — no rename. The local checkout directory will be moved on the prod host (next section), but `git remote -v` keeps pointing at `git@github.com:birdflop/3compute.git`.

**One thing does need to change: the deploy webhook.** The existing webhook on the GitHub repo posts to `https://api.3compute.org/api/webhook` (or whatever path `webhook.py` exposes). Once `api.3compute.org` stops responding, deploys will silently fail.

1. GitHub → **Settings → Webhooks →** edit the existing webhook
2. Payload URL: change to `https://api.csroom.org/api/webhook` (verify the exact path against `backend/api/routers/webhook.py`)
3. Save. Test by editing a file and pushing — should fire.

### 0e. .env files

These you own. For reference, the keys the new code expects:

`backend/.env`:

```env
# Required — the backend won't start without these:
GOOGLE_CLIENT_ID=...                                          # from 0c
GOOGLE_CLIENT_SECRET=...                                      # from 0c
REDIRECT_URI_PROD=https://api.csroom.org/api/auth/callback
FRONTEND_ORIGIN_PROD=https://www.csroom.org
FLASK_ENV=production
FLASK_SECRET=...                                              # OK to keep the existing one, or rotate
CF_API_TOKEN=...                                              # from 0b (existing token works if scoped to csroom.org)

# Optional — only set these if you want to override the built-in defaults:
# CADDY_ADMIN_URL=http://localhost:2019                       # default already fine
# APP_DOMAIN=app.csroom.org                                   # default already fine
# USERS_JSON_FILE=/var/lib/csroom/users.json                  # systemd unit sets this in the process env regardless
```

`frontend/.env` (used at build time):

```env
VITE_ENVIRONMENT=production
VITE_PROD_BACKEND_URL=https://api.csroom.org
VITE_BACKEND_URL=https://api.csroom.org
```

> Vite bakes the `VITE_*` values into the static bundle at build time — if you build before fixing this file, the frontend will hit the wrong API URL. Always update this **before** running `pnpm build`.

### 0f. Push the rename commit to GitHub

Step 1e on the server runs `git fetch origin && git reset --hard origin/main`, so the rename code needs to already be on GitHub's `main` branch by then.

**Order matters.** Do this only **after** step 0d (webhook URL update). Otherwise:

- Webhook still points at `api.3compute.org` → your `git push` fires the *old* `/opt/deploy.sh` against the still-running 3compute backend, which `git reset --hard`s your rename commit into the live service mid-flight. Bad.
- Webhook already points at `api.csroom.org` (which doesn't exist yet) → the delivery harmlessly 404s. Safe.

From your **local** machine (not the server):

```bash
# Make sure you're on the rename branch and it's clean
git status
git log --oneline -5

# Push to main
git push origin main
```

If you'd rather not move the webhook before the new stack is up, the alternative is to **disable the webhook** (GitHub → repo → Settings → Webhooks → Edit → uncheck "Active") before pushing, then re-enable it (with the new URL) after the smoke test in step 1n passes.

> If you're deploying from a branch other than `main`, change `main` everywhere in this doc (here, in step 1e's `git checkout` line, and in any deploy script branches). The included `production/opt/deploy.sh` is hardcoded to `origin/main` — edit it locally first if you need a different branch.

---

## 1. On the production server (in-place upgrade)

You are SSH'd in as root (or with `sudo`).

> **Backup-first policy.** Every destructive step in this section moves files into a single backup directory **before** removing them. Nothing gets `rm`'d outright — it gets `mv`'d (or `cp`'d) into the backup, so if something goes wrong you can restore by hand (instructions in section 2). When everything is verified working (after the smoke test in step 1n), section 2 wipes all backups in one command.

### 1a. Create the backup directory and stop the old stack

Pick a fixed backup root and create it. The shell variable `$BACKUP_DIR` is referenced by every later step in this section, so keep this terminal open (or re-export it if you reconnect):

```bash
export BACKUP_DIR=/var/backups/csroom-migration
sudo mkdir -p "$BACKUP_DIR"
sudo chmod 700 "$BACKUP_DIR"      # contains backend/.env with secrets — keep root-only
echo "Backups will go to $BACKUP_DIR"
```

Stop the old service and any running user terminal containers (no backup needed for these — the service stops cleanly, and user containers are ephemeral by design):

```bash
sudo systemctl stop 3compute
sudo systemctl disable 3compute

# Kill any user terminal containers that were running
sudo docker ps -q --filter "name=3compute" | xargs -r sudo docker kill
sudo docker ps -aq --filter "name=3compute" | xargs -r sudo docker rm -f
```

> **Note about the `3compute:latest` Docker image:** we leave it tagged. The new image will be built as `csroom:latest` alongside it, so both coexist until cleanup. This means rollback is just "start the old systemd unit again" — the image is still there.

### 1b. Back up and wipe runtime data

```bash
# Data dirs (uploads, classrooms, users.json) — large; mv (not cp) so it's instant
# regardless of size. If you ever need this back, mv it back from $BACKUP_DIR.
sudo mv /var/lib/3compute "$BACKUP_DIR/var-lib-3compute"

# SQLite database — small; cp before rm so the file lives in the backup tree.
sudo cp /var/www/3compute/backend/3compute.db "$BACKUP_DIR/3compute.db" 2>/dev/null || true
sudo rm -f /var/www/3compute/backend/3compute.db

# Deploy log (lock file is just a flock target — no need to back up)
sudo cp /var/log/3compute-deploy.log "$BACKUP_DIR/3compute-deploy.log" 2>/dev/null || true
sudo rm -f /var/log/3compute-deploy.log /var/lock/3compute-deploy.lock
```

### 1c. Back up and remove the old systemd unit, nginx site, letsencrypt certs

> If your host uses **Caddy for everything** (frontend + API + wildcard), the nginx and letsencrypt blocks below will no-op silently — there's nothing in `/etc/nginx/sites-*/3compute.org` or `/etc/letsencrypt/live/{www,api}.3compute.org` to back up because Caddy handled all of it. The commands include `2>/dev/null || true`, so they'll just skip those files. Only the systemd-unit block actually does work in that case.

```bash
# Systemd unit
sudo mv /etc/systemd/system/3compute.service "$BACKUP_DIR/3compute.service"
sudo systemctl daemon-reload

# Nginx site (both the symlink in sites-enabled and the file in sites-available)
sudo mkdir -p "$BACKUP_DIR/nginx"
sudo mv /etc/nginx/sites-enabled/3compute.org "$BACKUP_DIR/nginx/sites-enabled-3compute.org" 2>/dev/null || true
sudo mv /etc/nginx/sites-available/3compute.org "$BACKUP_DIR/nginx/sites-available-3compute.org" 2>/dev/null || true

# Letsencrypt certs for the old domains. Keep the originals (live/, archive/, renewal/)
# in the backup; certbot won't touch them once they're moved out of /etc/letsencrypt.
sudo mkdir -p "$BACKUP_DIR/letsencrypt"
for d in live/www.3compute.org live/api.3compute.org \
         archive/www.3compute.org archive/api.3compute.org; do
  sudo mv "/etc/letsencrypt/$d" "$BACKUP_DIR/letsencrypt/$(echo "$d" | tr '/' '-')" 2>/dev/null || true
done
sudo mv /etc/letsencrypt/renewal/www.3compute.org.conf "$BACKUP_DIR/letsencrypt/renewal-www.3compute.org.conf" 2>/dev/null || true
sudo mv /etc/letsencrypt/renewal/api.3compute.org.conf "$BACKUP_DIR/letsencrypt/renewal-api.3compute.org.conf" 2>/dev/null || true
```

### 1d. Back up and reset Caddy state

The Caddy admin API has the old `*.app.3compute.org` TLS automation policy and any per-subdomain routes (`@id: app-{subdomain}`) claimed under the old install. Move its runtime state into the backup so the new install starts clean:

```bash
sudo systemctl stop caddy

# Back up the Caddyfile before we overwrite it in step 1j
sudo mkdir -p "$BACKUP_DIR/caddy"
sudo cp /etc/caddy/Caddyfile "$BACKUP_DIR/caddy/Caddyfile" 2>/dev/null || true

# Caddy stores compiled config & cert state under /var/lib/caddy. Move both common
# subdirs into the backup. (If only one exists, the other mv just no-ops.)
sudo mv /var/lib/caddy/.config "$BACKUP_DIR/caddy/var-lib-caddy-.config" 2>/dev/null || true
sudo mv /var/lib/caddy/.local "$BACKUP_DIR/caddy/var-lib-caddy-.local" 2>/dev/null || true
```

> **Don't `apt remove caddy`** — your Caddy binary has the patched `caddy-dns/cloudflare` plugin from the `ogerman/cloudflare` fork. Removing the package would force you to re-build it from source. Backing up `/var/lib/caddy` only moves runtime state; the binary stays.

### 1e. Move the code directory

The new code expects to live at `/var/www/csroom`. The repo URL stays the same (`git@github.com:birdflop/3compute.git`), but the local checkout dir is renamed. This is a `mv`, not a delete — your code (and the `.env` files) are preserved at the new path. To roll back, you'd just `mv /var/www/csroom /var/www/3compute`.

Before the move, copy the two `.env` files into the backup as a safety net (in case you mangle them when editing in step 1g):

```bash
sudo mkdir -p "$BACKUP_DIR/env"
sudo cp /var/www/3compute/backend/.env "$BACKUP_DIR/env/backend.env" 2>/dev/null || true
sudo cp /var/www/3compute/frontend/.env "$BACKUP_DIR/env/frontend.env" 2>/dev/null || true

sudo mv /var/www/3compute /var/www/csroom
cd /var/www/csroom
```

Tell Git the new path is safe to operate on (Git refuses to run in a repo owned by a different user — your existing config had `/var/www/3compute` in the safe-directory list; the renamed path needs adding):

```bash
sudo git config --global --add safe.directory /var/www/csroom
```

> The stale `/var/www/3compute` entry in `/root/.gitconfig` is harmless (it points at a path that no longer exists), so you don't need to remove it. If you want to clean it up: `sudo nano /root/.gitconfig` and delete the line manually.

Verify the remote is unchanged:

```bash
sudo git remote -v
# Should show: origin  git@github.com:birdflop/3compute.git (fetch)
#              origin  git@github.com:birdflop/3compute.git (push)
```

Pull the rename branch (or whatever branch contains this MIGRATION_TO_CSROOM.md):

```bash
sudo git fetch origin
sudo git checkout main          # or the rename branch name
sudo git reset --hard origin/main
```

### 1f. Rename the Unix group

The container peer group changes name (`3compute-container` → `csroom-container`) but **keeps GID 995** — that GID is hardcoded throughout the codebase (Dockerfile, docker-compose, systemd unit) and corresponds to the group that owns files inside user containers. Don't change the GID. `groupmod -n` is reversible — to roll back, run the same command with the names flipped (`sudo groupmod -n 3compute-container csroom-container`).

```bash
# Capture the pre-change state so you can confirm rollback if needed
getent group 3compute-container | sudo tee "$BACKUP_DIR/group-3compute-container-pre.txt"

# Rename the group in place (preserves GID and all existing memberships)
sudo groupmod -n csroom-container 3compute-container

# Sanity check: should show GID 995 and www-data as a member
getent group csroom-container

# If for any reason the rename failed (e.g. the old group didn't exist), create fresh:
# sudo groupadd -g 995 csroom-container
# sudo usermod -a -G csroom-container www-data
```

> The old `3compute-container` name is now gone. www-data's supplementary group membership carries over automatically because `groupmod -n` only changes the *name*, not the membership list.

### 1g. Update environment files in place

You already backed these up in step 1e (`$BACKUP_DIR/env/backend.env` and `frontend.env`). Edit them:

```bash
sudo nano /var/www/csroom/backend/.env
```

**Change** the following lines (they exist already — just edit them in place):
- `REDIRECT_URI_PROD=https://api.csroom.org/api/auth/callback`
- `FRONTEND_ORIGIN_PROD=https://www.csroom.org`
- `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` — paste in the values from the new OAuth client (section 0c)
- `CF_API_TOKEN` — only if you regenerated it (section 0b); reused tokens stay as-is

**Leave alone** (these stay exactly as they are):
- `FLASK_ENV=production` — must stay `production` on the prod host (this is what makes the backend pick the `_PROD` redirect URI / origin variants)
- `FLASK_SECRET=...` — keep the existing value unless you specifically want to invalidate all live sessions
- `REDIRECT_URI_DEV` / `FRONTEND_ORIGIN_DEV` if present — only used in local dev, irrelevant on prod
- `PORT_BASE`, `MAX_USERS`, `MEMORY_MB`, or any other tuning knobs you'd previously set

**Don't add** anything that isn't already in your file — in particular:
- `APP_DOMAIN` has a default of `app.csroom.org` baked into `backend/api/config.py`, so it doesn't need to be in `.env`.
- `USERS_JSON_FILE` is set by the systemd unit (`csroom.service`'s `Environment=` line), so it's in the process env regardless of `.env`.

> The simplest way to do this without missing anything: open `backend/.env`, change the two `_PROD` URLs plus `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`, save, done. Don't rewrite the whole file from section 0e's template — that template lists all keys the backend *can* read; you only edit what's listed in the "**Change**" list above.

```bash
sudo nano /var/www/csroom/frontend/.env
```

Set:
```
VITE_ENVIRONMENT=production
VITE_PROD_BACKEND_URL=https://api.csroom.org
VITE_BACKEND_URL=https://api.csroom.org
```

Make sure ownership is right after editing:

```bash
sudo chown www-data:www-data /var/www/csroom/backend/.env /var/www/csroom/frontend/.env
sudo chmod 640 /var/www/csroom/backend/.env
```

> If you mangle either file, restore from `$BACKUP_DIR/env/` and re-edit:
> `sudo cp "$BACKUP_DIR/env/backend.env" /var/www/csroom/backend/.env`

### 1h. Build the new user-container Docker image

The image tag changed (`3compute:latest` → `csroom:latest`). The codebase passes `csroom` to `docker run`, so the new tag is mandatory. The old `3compute:latest` image is still on disk (we didn't remove it in 1a) — it stays as part of the rollback safety net until cleanup in section 2.

```bash
cd /var/www/csroom
sudo docker build -t csroom:latest backend
sudo docker images | grep -E '3compute|csroom'    # both tags should appear
```

### 1i. Refresh the Python venv & frontend build

The Python venv at `/var/www/csroom/.venv` should have come along with the directory rename — but if it was missing, broken, or never created on this host, the next command will fix it. `python3 -m venv .venv` is idempotent: creates it if absent, no-op if already healthy.

```bash
cd /var/www/csroom
sudo python3 -m venv .venv
sudo .venv/bin/python -m pip install --upgrade pip
sudo .venv/bin/python -m pip install -r backend/requirements.txt
```

> Why `.venv/bin/python -m pip` instead of `.venv/bin/pip`? The `pip` standalone script can break if the venv was rebuilt (the script's shebang line ends up pointing at a python that isn't where pip expects). Calling python directly and asking it to run the `pip` module sidesteps that entirely.

> If `python3 -m venv` complains that the `venv` module is missing, install it: `sudo apt-get install -y python3-venv`. Then re-run the three commands above.

Rebuild the frontend (Vite bakes the new domain into the static bundle):

```bash
cd /var/www/csroom/frontend
sudo pnpm install
sudo pnpm build
```

Fix ownership on the renamed tree (the old name was already `www-data:www-data`, but be defensive after the directory move and rebuilds):

```bash
sudo chown -R www-data:www-data /var/www/csroom
```

### 1j. Update Caddy

> **This server uses Caddy for everything** — frontend, API reverse-proxy, AND user-claimed `*.app.csroom.org` subdomains. The repo also ships an nginx config under `production/etc/nginx/`, but it's only relevant if you're running a hybrid nginx-front + Caddy-wildcard setup. Skip it on this host.

The Caddyfile needs three blocks: frontend (static files), API (reverse proxy to the backend on :5555), and the `:80` HTTP→HTTPS redirect. The `*.app.csroom.org` wildcard does **not** need a Caddyfile block — the backend's `ensure_app_server()` adds the wildcard route + TLS automation policy at runtime via Caddy's admin API.

Your previous Caddyfile was backed up to `$BACKUP_DIR/caddy/Caddyfile` in step 1d. Overwrite with the new one (mirrors the previous structure, swaps the domain and code path):

```bash
sudo tee /etc/caddy/Caddyfile > /dev/null <<'EOF'
{
    admin localhost:2019
    email {$CADDY_EMAIL}
}

www.csroom.org {
    root * /var/www/csroom/frontend/build/client
    encode gzip
    try_files {path} {path}/ /index.html
    file_server
}

api.csroom.org {
    request_body {
        max_size 256MB
    }
    reverse_proxy localhost:5555 {
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}
        flush_interval -1
        transport http {
            read_timeout 600s
            write_timeout 600s
        }
    }
}

:80 {
    redir https://{host}{uri} permanent
}
EOF

# Confirm the CF token + ACME email env vars are still being supplied to Caddy's
# process (likely via /etc/default/caddy or a systemd override drop-in). These were
# already set up under your 3compute install and don't need to change.
sudo systemctl cat caddy | grep -iE 'CF_API_TOKEN|CADDY_EMAIL'

sudo systemctl start caddy
sudo systemctl status caddy        # should be active (running)
sudo journalctl -u caddy -n 50     # watch for cert issuance for www/api.csroom.org
```

Caddy will obtain TLS certs for `www.csroom.org` and `api.csroom.org` automatically on first request via standard HTTP-01 (no certbot needed). The wildcard `*.app.csroom.org` cert uses DNS-01 against Cloudflare and is set up by the backend at startup — you'll see it issued shortly after the new service starts in step 1m.

### 1k. ~~nginx site & TLS certs~~ — **skip**

This step is for hybrid nginx-front + Caddy-wildcard setups. Your host uses Caddy for everything (handled in 1j), so there's nothing to do here. Move on to 1l.

### 1l. Install the new systemd unit and deploy script

The old `/opt/deploy.sh` will be overwritten — back it up first:

```bash
sudo cp /opt/deploy.sh "$BACKUP_DIR/opt-deploy.sh" 2>/dev/null || true
```

Install the new files (the old systemd unit was already moved to `$BACKUP_DIR/3compute.service` in step 1c):

```bash
sudo cp /var/www/csroom/production/etc/systemd/system/csroom.service /etc/systemd/system/csroom.service
sudo cp /var/www/csroom/production/opt/deploy.sh /opt/deploy.sh
sudo chmod +x /opt/deploy.sh

sudo systemctl daemon-reload
sudo systemctl enable csroom

# www-data should already be in systemd-journal from the 3compute setup, but verify:
groups www-data | grep -q systemd-journal || sudo usermod -aG systemd-journal www-data
```

> The unit's `ExecStartPre=` lines create `/var/lib/csroom/{uploads,classrooms}` with the correct ownership (`www-data:csroom-container`, mode `2775`) on every start, so you don't need to mkdir them manually.

### 1m. Start the new service

```bash
sudo systemctl start csroom
sudo systemctl status csroom         # should be active (running)
sudo journalctl -u csroom -f -n 100  # tail logs; look for "CS Room API started"
```

### 1n. Smoke test

1. Visit `https://www.csroom.org` — landing page should render with the new CS Room logo and tomato-red wordmark.
2. Click **Sign in** → Google OAuth → on success you land in the IDE.
3. Open a terminal tab — drops into a shell at `/app` with hostname `csroom`.
4. Claim a subdomain (e.g. `test.app.csroom.org`) bound to a port in your range, run a tiny Flask app there, hit the URL — wildcard cert issues in ~10s and the page loads.
5. As an `@birdflop.com` admin user, open `/admin/logs` — shows the systemd journal of the `csroom` service.

If any step fails, useful diagnostics:

```bash
sudo systemctl status csroom
sudo journalctl -u csroom -n 200 --no-pager
sudo journalctl -u caddy -n 200 --no-pager
sudo nginx -t && sudo journalctl -u nginx -n 50 --no-pager
sudo docker ps                        # is csroom:latest present? are user containers spawning?
ls -la /var/lib/csroom                # ownership 33:995, mode drwxrwsr-x
getent group csroom-container         # GID 995, www-data member
```

---

## 2. Cleanup (only after the smoke test passes)

**Don't run any of this until step 1n's smoke test passes end-to-end.** Once it does, all the on-host backups become dead weight and can be removed in one shot:

```bash
# Sanity check: confirm the backup dir is the one you expect, and you're not
# about to nuke something else by mistake.
ls -lh "$BACKUP_DIR"
du -sh "$BACKUP_DIR"

# One command wipes everything backed up during the migration.
sudo rm -rf "$BACKUP_DIR"
```

Then drop the old Docker image (it's been sitting alongside `csroom:latest` since step 1h):

```bash
sudo docker image rm 3compute:latest
```

Off-host cleanup (do these whenever you're ready):

```text
- DNS records for 3compute.org — take down at your registrar/Cloudflare once nobody points at them.
- Google OAuth client for 3compute.org — delete or disable in the Google Cloud console.
- Cloudflare API token — if you regenerated, revoke the old one. If you reused, remove the 3compute.org zone scope.
```

### How to roll back if the smoke test failed

The whole point of section 1's backup-first approach is that nothing is gone — everything destructive went into `$BACKUP_DIR`, and the old Docker image is still tagged. To revert (in reverse order of the steps that touched each thing):

```bash
# Stop the new stack
sudo systemctl stop csroom
sudo systemctl disable csroom
sudo rm -f /etc/systemd/system/csroom.service
sudo systemctl daemon-reload
sudo rm -f /etc/nginx/sites-enabled/csroom.org /etc/nginx/sites-available/csroom.org
sudo systemctl reload nginx
sudo systemctl stop caddy

# Move the code dir back
sudo mv /var/www/csroom /var/www/3compute

# Restore the Unix group name
sudo groupmod -n 3compute-container csroom-container

# Restore the deploy script
sudo cp "$BACKUP_DIR/opt-deploy.sh" /opt/deploy.sh && sudo chmod +x /opt/deploy.sh

# Restore data dir
sudo mv "$BACKUP_DIR/var-lib-3compute" /var/lib/3compute

# Restore SQLite db, deploy log
sudo cp "$BACKUP_DIR/3compute.db" /var/www/3compute/backend/3compute.db 2>/dev/null || true
sudo cp "$BACKUP_DIR/3compute-deploy.log" /var/log/3compute-deploy.log 2>/dev/null || true

# Restore systemd unit
sudo cp "$BACKUP_DIR/3compute.service" /etc/systemd/system/3compute.service
sudo systemctl daemon-reload
sudo systemctl enable 3compute

# Restore nginx site
sudo cp "$BACKUP_DIR/nginx/sites-available-3compute.org" /etc/nginx/sites-available/3compute.org
sudo ln -sf /etc/nginx/sites-available/3compute.org /etc/nginx/sites-enabled/3compute.org

# Restore letsencrypt (move dirs back into /etc/letsencrypt with their original layout)
for d in live-www.3compute.org live-api.3compute.org \
         archive-www.3compute.org archive-api.3compute.org; do
  orig=$(echo "$d" | sed 's/^live-/live\//; s/^archive-/archive\//')
  sudo mv "$BACKUP_DIR/letsencrypt/$d" "/etc/letsencrypt/$orig" 2>/dev/null || true
done
sudo mv "$BACKUP_DIR/letsencrypt/renewal-www.3compute.org.conf" /etc/letsencrypt/renewal/www.3compute.org.conf 2>/dev/null || true
sudo mv "$BACKUP_DIR/letsencrypt/renewal-api.3compute.org.conf" /etc/letsencrypt/renewal/api.3compute.org.conf 2>/dev/null || true

# Restore Caddy
sudo cp "$BACKUP_DIR/caddy/Caddyfile" /etc/caddy/Caddyfile
sudo mv "$BACKUP_DIR/caddy/var-lib-caddy-.config" /var/lib/caddy/.config 2>/dev/null || true
sudo mv "$BACKUP_DIR/caddy/var-lib-caddy-.local" /var/lib/caddy/.local 2>/dev/null || true
sudo systemctl start caddy

# Bring the old service back up
sudo systemctl start 3compute
sudo systemctl status 3compute
```

The old `3compute:latest` Docker image is still on disk (you didn't delete it), so the spawn-container code finds it. After this the old stack should be back to where it was at the start of section 1.

---

## 3. Things you do NOT need to do

- ❌ **Reinstall Docker, Node, pnpm, nginx, certbot, Caddy.** All carry over.
- ❌ **Re-clone the repo.** `git remote` keeps pointing at `birdflop/3compute`; only the local *directory* is renamed (`/var/www/3compute` → `/var/www/csroom`).
- ❌ **Rotate the deploy SSH key.** It's still authorized on the same repo.
- ❌ **Create a new Unix user.** The backend still runs as `www-data`. Container processes still run as UID 999. Only the *group name* changed (`3compute-container` → `csroom-container`, GID 995 unchanged).
- ❌ **Migrate user data.** Per your direction, all 3compute data is wiped in step 1b — but it's first moved into `$BACKUP_DIR`, not deleted, so it's still recoverable until you run section 2.
- ❌ **Generate a fresh Cloudflare API token.** The existing one works as long as you give it permission on the `csroom.org` zone (section 0b).

---

## 4. Old → new identifier map

| Concept                     | Old                                       | New                                       |
|-----------------------------|-------------------------------------------|-------------------------------------------|
| Display name                | `3Compute`                                | `CS Room`                                 |
| Slug / ident                | `3compute`                                | `csroom`                                  |
| Domain                      | `3compute.org` (`www`/`api`/`*.app`)      | `csroom.org` (`www`/`api`/`*.app`)        |
| Systemd unit                | `3compute.service`                        | `csroom.service`                          |
| Backend log group           | `journalctl -u 3compute`                  | `journalctl -u csroom`                    |
| Code dir (local)            | `/var/www/3compute`                       | `/var/www/csroom`                         |
| GitHub repo (remote)        | `birdflop/3compute`                       | `birdflop/3compute` *(unchanged)*         |
| Data dir                    | `/var/lib/3compute/{uploads,classrooms}`  | `/var/lib/csroom/{uploads,classrooms}`    |
| User listing file           | `/var/lib/3compute/users.json`            | `/var/lib/csroom/users.json`              |
| Deploy lock / log           | `/var/lock/3compute-deploy.lock`, `/var/log/3compute-deploy.log` | `/var/lock/csroom-deploy.lock`, `/var/log/csroom-deploy.log` |
| Docker image                | `3compute:latest`                         | `csroom:latest`                           |
| Unix group (container peer) | `3compute-container` (GID 995)            | `csroom-container` (GID 995)              |
| Container hostname          | `3compute`                                | `csroom`                                  |
| Database file               | `backend/3compute.db`                     | `backend/csroom.db`                       |
| dtach session prefix        | `3compute-tab{N}`                         | `csroom-tab{N}`                           |
| dtach socket prefix         | `/tmp/3compute-tab{N}.sock`               | `/tmp/csroom-tab{N}.sock`                 |
| Nginx site file             | `/etc/nginx/sites-available/3compute.org` | `/etc/nginx/sites-available/csroom.org`   |
| Letsencrypt certs           | `live/{www,api}.3compute.org/`            | `live/{www,api}.csroom.org/`              |
| Caddy wildcard              | `*.app.3compute.org`                      | `*.app.csroom.org`                        |
| OAuth redirect URI          | `https://api.3compute.org/api/auth/callback` | `https://api.csroom.org/api/auth/callback` |
| Webhook URL                 | `https://api.3compute.org/api/webhook`    | `https://api.csroom.org/api/webhook`      |
| Contact email               | `3compute@birdflop.com`                   | `csroom@birdflop.com`                     |
| Admin allowlist             | `@birdflop.com` *(unchanged)*             | `@birdflop.com` *(unchanged)*             |
| Birdflop nonprofit refs     | unchanged                                 | unchanged                                 |

---

## 5. If something goes sideways

- **`systemctl status csroom` fails on `/var/lib/csroom`** — the `csroom-container` group probably wasn't created (or `groupmod` fell through). Run `getent group csroom-container` — if missing, `sudo groupadd -g 995 csroom-container && sudo usermod -a -G csroom-container www-data`, then `systemctl restart csroom`.
- **OAuth callback errors with `redirect_uri_mismatch`** — the redirect URI in Google Cloud doesn't *exactly* match `REDIRECT_URI_PROD` in `backend/.env`. Compare character-for-character including the trailing path.
- **Wildcard cert won't issue** — most common cause: CF API token lacks `Zone:Zone:Read` (DNS:Edit alone isn't enough). Tail `journalctl -u caddy -f` while Caddy retries; the error names the missing permission.
- **User containers spawn but the IDE says "no terminal"** — confirm the docker image was tagged correctly: `docker images | grep csroom`. If only the old `3compute:latest` is present (or nothing), re-run `docker build -t csroom:latest backend` from `/var/www/csroom`.
- **Frontend loads but everything 404s on the API** — `frontend/.env` was wrong at build time. Fix the env file and re-run `pnpm build` (Vite bakes envs into the static bundle).
- **Deploy webhook silently does nothing** — check the GitHub webhook URL is `api.csroom.org/api/webhook`, not `api.3compute.org/...`. GitHub → repo → Settings → Webhooks shows recent deliveries; a 404 or DNS error explains a silent failure.
- **`groupmod: cannot rename` because group is in use** — only happens if a process owned by the old group is still running. Stop the 3compute service first (`systemctl stop 3compute`), then retry.

---

You should be able to follow this top-to-bottom and end up with a working CS Room install on the same host. Good luck!

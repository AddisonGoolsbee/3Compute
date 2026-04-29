# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Design system

This site uses the **CS Room Daylight** visual language — a warm, paper-toned, scholastic aesthetic. All design assets live in `.design-system/`.

## Before making any visual change

1. Read `.design-system/README.md` end-to-end. It covers voice, color, type, motion, and iconography rules.
2. Read `.design-system/colors_and_type.css`. **Use these tokens directly** — do not invent colors, fonts, radii, or shadows. Import the file once at the app root.
3. Reference `.design-system/ui_kit/` for component patterns. Open `ui_kit/index.html` in a browser to see the live kit. The `.jsx` files (Buttons, Nav, Landing, etc.) are the canonical implementations to mirror.

## Hard rules (do not break)

- **Light only.** Cream paper (`--paper` `#fdfaf2`) is the page color. Pure white is for elevated cards only.
- **Serif headlines.** `Newsreader` for h1/h2 only. `DM Sans` for body and h3+. `DM Mono` for code.
- **One accent per section.** Pick navy / tomato / ochre / forest / plum and pair only with its `-soft` variant. Never stack multiple saturated colors in one card.
- **No emoji. No gradient backgrounds. No backdrop-blur. No drop shadows on text. No bouncy/spring animations** — fades only.
- **Iconography is lucide.** Don't hand-draw SVG icons. Brand glyphs come from `@icons-pack/react-simple-icons`.
- **Sentence case** for headings and buttons. Title Case only for proper nouns and `CS Room` / `Birdflop`.
- **Voice is verb-first, declarative, generous.** Never gushing. No "revolutionize", "unleash", "supercharge".

## Workflow expectation

Before rewriting files, show a short plan: which files you intend to touch, which kit components map to which existing components, and any open questions about the existing structure. Wait for confirmation before doing the rewrite.

## Commands

### Development
```bash
./dev.sh                    # Recommended: backend in Docker, frontend native (fast HMR)
docker compose up --build   # Alternative: full stack in Docker (slower frontend HMR on macOS)
```

### Frontend (in `frontend/`)
```bash
pnpm dev          # Dev server
pnpm build        # Production build
pnpm lint         # ESLint
pnpm test         # Vitest (watch)
pnpm test:coverage
```

### Backend
```bash
# Use .venv/bin/ directly — `source .venv/bin/activate` doesn't persist across shell invocations
.venv/bin/python -m backend.api               # Run FastAPI (uvicorn on :5555)
.venv/bin/python -m backend.api --reload      # With hot reload
.venv/bin/pytest backend/                     # All backend tests
.venv/bin/pytest backend/test_docker.py::test_name  # Single test
```

### Full test suite
```bash
./run-tests.sh
```

## Architecture

**CS Room** is a free educational server platform. Users get isolated Docker containers (terminals) and can expose services via subdomains.

### Stack
- **Frontend**: React 19 + React Router 7 + TypeScript + Tailwind CSS (Vite)
- **Backend**: FastAPI + SQLModel (SQLite) + Socket.IO for terminal WebSockets
- **Infra**: Docker-in-Docker (dev) / host Docker (prod), Caddy reverse proxy

### Request flow
1. Frontend authenticates via Google OAuth → session cookie
2. Terminal: Socket.IO connection → `backend/api/terminal.py` → Docker container PTY via tmux
3. Subdomains: User claims `name.app.csroom.org` → backend calls Caddy Admin API (`localhost:2019`) to add a reverse_proxy route to the user's allocated port

### Key backend files
- `backend/api/app.py` — FastAPI app factory, lifespan (DB init, network setup, Caddy server init), middleware
- `backend/api/database.py` — SQLModel tables: `User`, `Classroom`, `ClassroomMember`, `Template`, `PortSubdomain`
- `backend/api/dependencies.py` — FastAPI dependency injection (`get_db`, `get_current_user`, `get_optional_user`)
- `backend/api/terminal.py` — Socket.IO handlers for PTY (connect/disconnect/input/output/resize), idle container cleanup
- `backend/api/subdomain_caddy.py` — Caddy Admin API integration for `*.app.csroom.org` routing and wildcard TLS (DNS-01 via Cloudflare)
- `backend/api/config.py` — All settings via pydantic-settings (Google OAuth, DB path, port ranges, Caddy URL, CF token)
- `backend/docker.py` — `spawn_container()`, `attach_to_container()`, container lifecycle, isolated network + iptables rules, classroom symlink creation

### Backend routers (`backend/api/routers/`)
- `auth.py` — Google OAuth login/callback/logout/me
- `users.py` — Role assignment + allowlist validation
- `files.py` — File list/upload/download/delete/mkdir/move
- `classrooms.py` — Classroom CRUD, join by access code, archive/restore, member management (~940 lines)
- `lessons.py` — Solution file downloads (teachers only)
- `tabs.py` — Terminal tab state persistence (JSON file)
- `terminal.py` — HTTP endpoint for closing terminal tabs (kills tmux session)
- `subdomains.py` — Subdomain CRUD, availability check, Caddy route management
- `templates.py` — Template listing (stub)
- `webhook.py` — GitHub webhook triggers deploy script

### Key frontend files
- `frontend/src/Layout.tsx` — Main IDE layout: resizable 3-panel grid (explorer + editor + terminal/ports)
- `frontend/src/components/Terminal.tsx` — Terminal tab manager
- `frontend/src/components/TerminalSession.tsx` — Individual xterm.js terminal instance + Socket.IO connection
- `frontend/src/components/TerminalTabBar.tsx` — Tab creation/selection/close UI
- `frontend/src/components/Editor.tsx` — Monaco editor with markdown preview, image preview, run button
- `frontend/src/components/Explorer.tsx` — File tree with drag-and-drop, rename, context menus
- `frontend/src/components/PortsPanel.tsx` — Subdomain/port management UI
- `frontend/src/components/Nav.tsx` — Top navigation bar (role-aware: teacher vs student)
- `frontend/src/pages/` — `landing.tsx`, `classrooms.tsx` (teacher), `lessons.tsx` (teacher), `terms.tsx`, `admin*.tsx` (birdflop admins)
- `frontend/src/util/` — `UserData.ts` (auth context + clientLoader), `Files.ts` (file tree parsing), `uploadLocalFiles.ts`, `languageMap.ts`, `printMarkdown.ts`

### Frontend gotchas
- **Table cell left padding**: `@luminescent/ui-react` globally zeroes `th`/`td` left padding, so plain Tailwind utilities like `px-3` or `pl-3` silently drop. Use the Tailwind 4 `!important` modifier (`pl-3!`, `pl-8!`, etc.) on every `th` and `td` — see `pages/classroom-detail.tsx` gradebook and `pages/admin-*.tsx` for the pattern. Right padding works without `!`.

### User isolation
- Each user gets 10 ports (base 10000, allocated sequentially)
- Containers run as UID 999 / GID 995, mount `/var/lib/csroom/uploads/{user_id}` as `/app`
- Container security: all capabilities dropped, no-new-privileges, read-only root filesystem (only `/tmp`, `/run`, `/app` writable)
- Docker network has inter-container and container→host traffic blocked via iptables
- Classrooms: shared directories symlinked into user containers; participants see only their own folder, instructors see all
- Idle cleanup: containers auto-removed when no user processes remain (polled every 4s after last session disconnects)

### Database
SQLite via SQLModel, no migrations framework — schema auto-created at startup from models. To add a column, add it to the model class; tables are created but existing columns won't be added automatically (manual `ALTER TABLE` needed on existing DBs).

### Caddy integration
Dynamic subdomain routes live in `srv0` — the Caddyfile-managed `:443` server. Do NOT create a separate API server for `:443`; two servers cannot share the same port.

`ensure_app_server()` (called at backend startup) adds a catchall route and ensures the wildcard TLS automation policy for `*.app.csroom.org` exists via the Caddy Admin API. Routes use `@id: "app-{subdomain}"` for stable addressing. The Caddy Admin API requires `PATCH` (not `PUT`) to update an existing `routes` array.

### CI/CD
- `.github/workflows/test.yml` — Frontend lint+test and backend pytest on push to main and PRs
- `.github/workflows/build.yml` — Verifies frontend build, Docker image build, and backend startup
- `.github/workflows/lesson-reference-tests.yml` — Validates lesson solutions when template files change

## Production
- Backend runs as systemd service `csroom` (user `www-data`) with `CAP_CHOWN` capability
- Caddy fronts everything: `www.csroom.org` serves the frontend static files (with the React Router SPA fallback at `/__spa-fallback.html`), `api.csroom.org` reverse-proxies to backend (:5555), and `*.app.csroom.org` routes user subdomains via the Admin API. The Caddyfile lives at `/etc/caddy/Caddyfile` on the host and is **not tracked in this repo**.
- Caddy manages TLS, including the wildcard cert `*.app.csroom.org` via Cloudflare DNS-01 challenge
- Requires `caddy-dns/cloudflare` plugin built into Caddy binary (see the patched build using `ogerman/cloudflare` fork that supports `cfat_` tokens)
- Uploads: `/var/lib/csroom/uploads/`, classrooms: `/var/lib/csroom/classrooms/`
- Deploy: GitHub webhook triggers `/opt/deploy.sh` (copied from `production/opt/deploy.sh` in the repo). The script runs outside the repo so `git reset --hard` doesn't corrupt it mid-execution; it self-updates `/opt/deploy.sh` from the repo at the end of each run.
- Deploy logs: `/var/log/csroom-deploy.log` (appended each run, includes timestamps)
- Config files: `production/etc/systemd/system/csroom.service`

### One-time server setup (run once on a fresh host, not part of deploy script)
```bash
# Allow www-data (backend) to write files owned by the container group
usermod -a -G csroom-container www-data

# Fix permissions on any existing uploads (new files get correct perms from the code)
find /var/lib/csroom/uploads -type f -exec chmod g+w {} \;
```

### File permission model
- Container user: UID 999 / GID 995 (`csroom-container`)
- Backend service: `www-data`, added to `csroom-container` group
- Files written by the backend are created with mode `0o664` (group-writable) so both can write
- Files created inside the container via terminal inherit the container's umask (`002`, set in `backend/Dockerfile`) so they are also group-writable

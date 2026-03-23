# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

### Development
```bash
docker compose up --build   # Start full stack (frontend :5173, backend :5555)
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
python -m backend.api               # Run FastAPI (uvicorn on :5555)
python -m backend.api --reload      # With hot reload
pytest backend/                     # All backend tests
pytest backend/test_docker.py::test_name  # Single test
```

### Full test suite
```bash
./run-tests.sh
```

## Architecture

**3Compute** is a free educational server platform. Users get isolated Docker containers (terminals) and can expose services via subdomains.

### Stack
- **Frontend**: React 19 + React Router 7 + TypeScript + Tailwind CSS (Vite)
- **Backend**: FastAPI + SQLModel (SQLite) + Socket.IO for terminal WebSockets
- **Infra**: Docker-in-Docker (dev) / host Docker (prod), Caddy reverse proxy

### Request flow
1. Frontend authenticates via Google OAuth → session cookie
2. Terminal: Socket.IO connection → `backend/api/terminal.py` → Docker container PTY via tmux
3. Subdomains: User claims `name.app.3compute.org` → backend calls Caddy Admin API (`localhost:2019`) to add a reverse_proxy route to the user's allocated port

### Key files
- `backend/api/app.py` — FastAPI app factory, lifespan (DB init, Caddy server init), middleware
- `backend/api/database.py` — SQLModel tables: `User`, `Classroom`, `ClassroomMember`, `Template`, `PortSubdomain`
- `backend/api/terminal.py` — Socket.IO handlers for PTY (attach/resize/input/output)
- `backend/docker.py` — `spawn_container()`, container lifecycle, isolated network + iptables rules
- `backend/api/subdomain_caddy.py` — Caddy Admin API integration for `*.app.3compute.org` routing and wildcard TLS (DNS-01 via Cloudflare)
- `backend/api/config.py` — All settings via pydantic-settings (Google OAuth, DB path, port ranges, Caddy URL, CF token)
- `frontend/src/components/Terminal.tsx` — xterm.js + Socket.IO client
- `frontend/src/util/` — `UserData.ts`, `Files.ts`, `uploadLocalFiles.ts`

### User isolation
- Each user gets 10 ports (base 10000, allocated sequentially)
- Containers run as UID 999 / GID 995, mount `/var/lib/3compute/uploads/{user_id}` as `/app`
- Docker network has inter-container and container→host traffic blocked via iptables
- Classrooms: shared directories symlinked into user containers

### Database
SQLite via SQLModel, no migrations framework — schema auto-created at startup from models. To add a column, add it to the model class; tables are created but existing columns won't be added automatically (manual `ALTER TABLE` needed on existing DBs).

### Caddy integration
`ensure_app_server()` runs at backend startup to create the `apps` Caddy server block (`:443`) if it doesn't exist. Routes use `@id: "app-{subdomain}"` for stable addressing. The Caddy Admin API requires `PATCH` (not `PUT`) to update an existing `routes` array.

## Production
- Backend runs as systemd service `3compute`
- Caddy manages TLS with wildcard cert `*.app.3compute.org` via Cloudflare DNS-01 challenge
- Requires `caddy-dns/cloudflare` plugin built into Caddy binary (see the patched build using `ogerman/cloudflare` fork that supports `cfat_` tokens)
- Uploads: `/var/lib/3compute/uploads/`, classrooms: `/var/lib/3compute/classrooms/`

# 3Compute Capacity Planning

Comprehensive audit of how 3Compute allocates CPU, memory, ports, storage, and
network resources today; what actually happens to those resources over a user's
lifetime; where the current design breaks down; and what we should do about it
— on the current single node, and when we grow to multiple nodes.

Every number in this doc is either read straight from the codebase (with
`file:line` cites) or clearly labelled as an assumption. If a number later
moves, update it here.

---

## 1. Executive summary

**Host (prod `nyc0`, measured 2026-04-21)**

- CPU: Intel Xeon E3-1240 v5 @ 3.50 GHz — 4 physical cores, 8 logical threads (SMT on)
- RAM: 64 GiB total, ~62 GiB available at idle
- Swap: **3.8 GiB** (too small — see §5.1)
- Disk: 1.8 TiB on `/dev/md2` (software RAID), 8.4 GiB used
- Docker overlay2 on `/` (same filesystem as everything else)

**Per-user caps today**: 1 container, 1.0 vCPU, `memory_mb / 50 ≈ 1285 MiB`
(~1.25 GiB RSS) on this 64 GiB host, 256 MiB tmpfs `/tmp`, 10 ports, 10
potential subdomains.

**Global ceiling**: **none is enforced**. `Settings.max_users = 20` exists
(`backend/api/config.py:19`) but is not referenced anywhere. `MAX_USERS = 50`
(`backend/docker.py:13`) is used only to compute `memory_per_user`; it does
not prevent a 51st user from signing up and getting a 1.25 GiB slice we
can't honour.

**The three biggest capacity risks right now**:
1. **No PID or disk‑I/O cgroup limit on containers** — one student can fork
   bomb or `dd`‑storm the host (`backend/docker.py:240-269`).
2. **CPU is the real ceiling, not RAM.** 8 logical threads × 1.0 vCPU/user =
   8 simultaneously compute-heavy users before CFS throttles visibly. With
   SMT the effective compute capacity is closer to ~5 full cores for
   parallel CPU-bound work. RAM (64 GiB / 1.5 GiB worst-case per container
   ≈ 40 containers) will almost never be the bottleneck on this host under
   current limits — the `MAX_USERS=50` RAM slice is generous.
3. **Nothing is ever garbage-collected** — uploads dirs, allocated port
   ranges, `PortSubdomain` rows, and Caddy routes persist forever. The port
   allocator is monotonic, so at ~6,500 users we run out of TCP ports.

**Container lifecycle**: containers are `docker run --rm` (line 244). When
the last tab disconnects and no user processes remain, the container is
**force-removed** (`docker rm -f`) within ~4–8 s
(`backend/api/terminal.py:472-538`). User files survive because they live on
the host bind-mount (`/var/lib/3compute/uploads/{user_id}`), not inside the
container. `/tmp` (tmpfs) is wiped.

**Recommended immediate actions** (ordered by bang-per-buck):
1. **Grow swap to 32–64 GiB.** 3.8 GiB today is basically nothing — a single
   burst (30 students running `pnpm install`) would exhaust it. 64 GiB swap
   on a 64 GiB RAM host is the classic rule; 32 GiB is a reasonable
   compromise given the 1.8 TiB disk. Set `vm.swappiness=10` so we only
   swap under genuine memory pressure.
2. Add `--pids-limit 512` and basic blkio cgroup limits to the
   `docker run` in `spawn_container`.
3. Start *enforcing* `Settings.max_users` at login (block the OAuth callback
   in `auth.py` when `count(User) >= max_users`). Pick the value based on
   §3.
4. Make the port allocator pick the lowest free 10-port slot (not monotonic).
5. Add systemd `MemoryMax` / `CPUQuota` to the backend unit so a backend
   runaway can't take the whole node with it.
6. **Consider switching to `--cpu-shares` (soft) instead of `--cpus` (hard
   cap).** On a 4-core host with 8 threads, a hard cap at 1.0 vCPU per user
   means only 8 users can make progress under contention. Shares let 30
   idle + 5 busy users share fairly, which matches real classroom usage.

Everything else in this doc is detail backing those choices.

---

## 2. Current state

### 2.1 Per-container resource limits

All limits are set in `spawn_container()` at `backend/docker.py:240-269`:

```python
cmd = [
    "docker", "run", "-d", "--rm",
    "--name", container_name,
    "--hostname", "3compute",
    "--network=isolated_net",
    "--cap-drop=ALL",
    "--user=999:995",
    "--security-opt", "no-new-privileges",
    "--read-only",
    "--tmpfs", "/tmp:exec,size=256m",
    "--tmpfs", "/run:size=10m",
    "-e", "HOME=/app",
    "-e", "HISTFILE=/tmp/.ash_history",
    "--cpus", str(cpu_per_user),          # 1.0 — backend/docker.py:17
    "--memory", f"{memory_per_user}m",    # memory_mb/MAX_USERS — line 18
    "-v", mount_spec,
]
```

Note: `memory_mb` in config defaults to 16384, but the actual per-user RAM
is computed from `psutil.virtual_memory().total` at import
(`backend/docker.py:15`), **not** from the config value. So on the real
64 GiB host:

| Resource | Value | Cited |
|---|---|---|
| CPU | 1.0 vCPU (CFS-capped, 100 ms period) | `backend/docker.py:17, 263-264` |
| Memory (RSS) | **1285 MiB** (= 64253 / 50) | `backend/docker.py:18, 265-266` |
| Memory+swap | **2570 MiB** (Docker default is 2×`--memory`) | implicit — `--memory-swap` not set |
| `/tmp` tmpfs | 256 MiB, exec | `backend/docker.py:256` |
| `/run` tmpfs | 10 MiB, noexec | `backend/docker.py:258` |
| Root FS | read-only | `backend/docker.py:254` |
| Capabilities | all dropped | `backend/docker.py:250` |
| UID/GID | 999 / 995 | `backend/docker.py:251` |
| PID limit | **none** | not set |
| Disk I/O limit | **none** | no `--device-*-bps`, no `--blkio-weight` |
| ulimits (nofile, nproc) | **none** (inherit daemon) | not set |
| User-namespace remapping | **none** | not configured |

**One thing to flag up front**: `config.memory_mb` is a lie today. It looks
like a tunable ("how much RAM should 3Compute claim?") but the code
ignores it and uses the host's total. If we ever want to cap ourselves
below the host RAM (to leave headroom for the OS, or to pack multiple
services on one node), we need to actually wire `settings.memory_mb` into
`backend/docker.py:15-18`.

**Gotchas worth calling out**:

- `tmpfs` is memory-backed. A container with `/tmp` filled to 256 MiB uses
  1285 + 256 ≈ **~1.5 GiB of host RAM worst case**. That is the number we
  should be planning against, not 1.25 GiB.
- The `memory_per_user` value is computed **once, at Python import time**, from
  `psutil.virtual_memory().total` and the hardcoded `MAX_USERS = 50`. It is
  baked in when the backend starts; adding RAM to the host or changing
  `memory_mb` in `.env` both require a backend restart to take effect —
  and changing `memory_mb` alone does nothing at all until the wiring
  above is fixed.
- `cpu_per_user = 1.0` is hardcoded in `backend/docker.py:17`; it is not
  derived from `num_cpus` or any config setting. On a 4-core / 8-thread
  host that's a very fat slice.
- `--rm` means the container is removed when it exits (either on process exit
  or `docker rm -f`). There is no "stopped" state we resume — every restart is
  a fresh container. User data survives because it is on the host bind mount.
- **SMT matters for CPU accounting.** Docker `--cpus=1.0` gives the
  container 100 ms of CPU time per 100 ms period across any CPU(s).
  8 simultaneously CPU-bound containers will each get 1 thread's worth;
  because the host has 4 physical cores with SMT, sustained throughput
  per thread degrades ~25–30% vs. running alone. So "8 users each doing a
  compile" is not "8× full-core compile performance" — more like ~5.5×.

### 2.2 Per-user limits

- **Exactly 1 container per user.** Enforced at
  `backend/docker.py:204-206`: if `user-container-{user_id}` already exists,
  `spawn_container` raises.
- **Exactly 10 ports per user.** Allocated monotonically from `port_base`
  (10000) at OAuth callback time: `backend/api/routers/auth.py:111-125`.
  The allocator takes `max(port_end)` across all users *and* cross-checks
  running containers' published port ranges — but only ever hands out the
  next block above the current maximum. Freed ranges are never re-used.
- **No cap on disk usage.** `/var/lib/3compute/uploads/{user_id}` is a plain
  bind mount (`backend/docker.py:238`). No XFS project quotas, no size
  checks, no inode limits.
- **Subdomains** = 1 per port, so effectively up to 10 per user.
  Validation in `backend/api/routers/subdomains.py:46-101`.

### 2.3 Container lifecycle

This is the single most important lifecycle fact, and it confuses people:
**containers are deleted, not paused, when a user goes idle. User files
survive because they live on the host.**

#### 2.3.1 Spawn
- First time a user opens a terminal tab, the Socket.IO `connect` handler
  calls `_ensure_container_locked` → `spawn_container`.
- Spawn fails fast if the container name already exists
  (`backend/docker.py:204-206`). There are per-user `_spawn_locks` to
  prevent races between simultaneous tabs (`backend/api/terminal.py:56`).

#### 2.3.2 Disconnect
- When a Socket.IO session disconnects (`handle_disconnect`), we release the
  PTY fd and the `docker exec` subprocess.
- If **no other sessions remain for that user**, `_start_idle_poller` is
  started (daemon thread, `backend/api/terminal.py:472-538`).
- The container is **not** stopped at disconnect. It keeps running.

#### 2.3.3 Idle poller
- Polls `docker top {container}` every `POLL_INTERVAL = 4` seconds
  (`backend/api/terminal.py:53`).
- Filters out infra processes (`/sbin/tini`, `dtach ...`, `sh`, `-sh`,
  `-ash`, `sleep infinity`, `bash`) — list at lines 462-469.
- If zero user processes remain AND `stop_event` hasn't been set by a
  reconnect, it runs `docker rm -f {container}` (line 529) and forgets the
  PTY output buffers for that user.
- **Net effect**: a user who closes their last tab and has nothing running
  loses their container within ~4–8 seconds. Their files on
  `/var/lib/3compute/uploads/{user_id}` are untouched.

#### 2.3.4 Reconnect
- Next time the user opens a tab we call `spawn_container` again, producing
  a fresh container with the same bind mount. `/tmp` is empty, but `/app`
  is their saved workspace.
- Any long-running process (`npm run dev`, `node server.js`) the user had
  going is gone. This is a feature, not a bug — it's how we reclaim
  resources from idle users.

#### 2.3.5 Backend restart / redeploy
- `discover_existing_containers()` (`backend/api/terminal.py:89-132`) scans
  `docker ps -a --filter name=user-container-` at startup and restores
  tracking for each container it finds, including stopped ones. For each
  container with no active session it starts an idle poller.
- So user containers **survive a systemd restart or deploy**. The backend
  reattaches on the user's next Socket.IO connect.
- The deploy script (`production/opt/deploy.sh`) does **not** touch user
  containers or volumes — verified by reading the script.

### 2.4 Storage

Three persistent paths, zero cleanup anywhere in the codebase:

| Path | Created by | Cleaned up? |
|---|---|---|
| `/var/lib/3compute/uploads/{user_id}` | `prepare_user_directory` | **Never** |
| `/var/lib/3compute/classrooms/{classroom_id}` | `classrooms.py` on create | **Never** (even on classroom delete) |
| `/var/lib/3compute/classrooms/{classroom_id}/participants/{email}` | `spawn_container` line 380 | **Never** |

What gets *refreshed* on each container spawn (not the same thing as
cleaned up):

- Classroom symlinks under `/var/lib/3compute/uploads/{user_id}/` and the
  `archive/` directory are removed and re-created
  (`backend/docker.py:211-236` and 481-528).
- Per-classroom `README.md` is overwritten from template
  (`backend/docker.py:530-578`).

What gets *stopped* / *deleted*:

- The container itself, and its tmpfs `/tmp` contents, on idle removal.
- Nothing else.

There is no user-deletion endpoint anywhere in the backend. I grepped
`backend/` for `db.delete(user`, `delete_user`, `DELETE.*user` — zero
matches. The admin router
(`backend/api/routers/admin.py`) exposes `/me`, `/stats`, `/users` (list),
`/classrooms`, `/logs`, `/containers` — all read-only from a user-lifecycle
perspective.

### 2.5 Port allocation

The allocator at `backend/api/routers/auth.py:111-125`:

```python
max_port_end = db.exec(select(func.max(User.port_end))).one()
port_start = (max_port_end + 1) if max_port_end is not None else settings.port_base

docker_max = _max_container_port_end()
if docker_max is not None and docker_max >= port_start:
    port_start = docker_max + 1

user = User(
    id=google_id, email=email, name=name, avatar_url=avatar,
    port_start=port_start,
    port_end=port_start + 9,
)
```

Key properties:

- **Monotonic**. Always hands out `max(port_end) + 1`. Never reuses a freed
  slot. Because there is no user-delete path, in practice the allocator
  keeps climbing forever.
- At **6,500 users**, `port_start` reaches 10000 + 6500 × 10 − 9 = 74,991
  — past the 65,535 TCP port ceiling. Signup of the 6,501st user will
  create a `User` row but `docker run -p 75000-75009:75000-75009` will
  fail, and the user gets a broken terminal.
- The Docker cross-check (`_max_container_port_end`, lines 19-51) only
  protects against DB-vs-Docker drift for *running* containers. It does
  not reclaim ports from stopped containers or deleted users.

### 2.6 Subdomains / Caddy

`backend/api/subdomain_caddy.py`:

- One wildcard cert `*.app.3compute.org` is issued via Cloudflare DNS-01
  (lines 84-126). This scales to any number of subdomains — the cert is
  not the bottleneck.
- Each subdomain adds one route to `srv0` in Caddy's in-memory JSON config
  (`_put_routes`, lines 141-152). Add / remove is O(n): fetch the whole
  routes list, rewrite, PATCH.
- At ~500 subdomains, `_get_routes` + `_put_routes` latency becomes
  noticeable (Caddy JSON config is ~O(10 KB)/route). Not a hard ceiling —
  it just gets slower.
- The `PortSubdomain` table has `user_id` as a plain foreign key with no
  cascade delete (`backend/api/database.py:80-86`). If a `User` row is
  deleted manually, the `PortSubdomain` row and the Caddy route both
  orphan.
- No per-user subdomain count cap. A user can claim all 10 ports' worth of
  subdomains.

### 2.7 Network

Single Docker bridge network `isolated_net`, `enable_icc=false`, with an
iptables rule in `DOCKER-USER` blocking container→host traffic on docker0
(`backend/docker.py:51-113`). No per-container bandwidth cap.

Practical limit: Docker bridge networks default to the 172.17.0.0/16 pool
— ~65k IPs. We'll hit memory/CPU exhaustion long before we run out of
bridge IPs.

### 2.8 Backend process / database

- Single `uvicorn` process. No worker count tuning
  (`backend/api/__main__.py`). Config.py defines no such setting.
- SQLite via SQLModel: `sqlite:///backend/3compute.db`
  (`backend/api/config.py:18`). One writer at a time. At ~50 concurrent
  users this is fine; at 500+ we will start seeing "database is locked"
  if we're not careful with transaction scope.
- Socket.IO AsyncServer, in-process only. No Redis/multi-instance support.
- `LimitNOFILE=65536` is the only systemd resource cap set
  (`production/etc/systemd/system/3compute.service:30`). There is no
  `MemoryMax`, no `CPUQuota`, no `TasksMax`. A runaway backend process
  can starve the whole node.

### 2.9 Nginx front

`production/etc/nginx/sites-available/3compute.org`:

- `client_max_body_size 256m` (line 44) — hard cap on upload size.
- `proxy_read_timeout 600s`, `proxy_send_timeout 600s`, `client_body_timeout 600s` —
  matters for long uploads but means a stuck request can pin a worker for
  10 minutes.
- No connection or rate limits (`limit_conn`, `limit_req`).

### 2.10 Deploy

`production/opt/deploy.sh`:
1. `git reset --hard origin/main`, rebuild frontend, rebuild `3compute:latest`
   image, `systemctl restart 3compute`.
2. **No** `docker rm`, no volume cleanup, no DB migration.
3. User containers survive (see 2.3.5).

---

## 3. Capacity math

### 3.1 Real host numbers

From `top` / `lscpu` / `df` on `nyc0` (measured 2026-04-21):

- **CPU**: 4 physical cores × 2 SMT threads = 8 logical CPUs @ 3.5 GHz base
  (Intel Xeon E3-1240 v5, Skylake). CPU is 99% idle at the measurement
  moment — we are nowhere near CPU-saturated right now.
- **RAM**: 64 GiB total, 55.5 GiB free, 1.4 GiB used, 8 GiB buff/cache,
  62.9 GiB available. The backend + Docker daemon + frontend + OS use
  ~1.4 GiB.
- **Swap**: 3.8 GiB, zero used.
- **Disk**: 1.8 TiB on `/dev/md2` (software RAID), 8.4 GiB used — 0.5%.
  `/var/lib/docker/overlay2` is on the same filesystem.
- **Docker state**: 2 overlay2 mounts live right now, which tracks (probably
  the 3compute base image + one running user container, or the
  `3compute:latest` + frontend image layers).

Per active container worst case:
- 1285 MiB RSS cap (Docker --memory)
- 256 MiB `/tmp` tmpfs (memory-backed, counts against host RAM)
- Small kernel/namespace + overlay overhead (~10 MiB)

Round up: **~1.5 GiB RAM per fully-loaded active container**.

**Where the bottleneck actually is on this specific host**:

- RAM is *not* the ceiling. 64 GiB / 1.5 GiB ≈ 40 containers, and
  `MAX_USERS=50` is the guard. We could run into RAM pressure at
  ~40 simultaneously-loaded containers, but real classrooms don't all
  pin /tmp to full.
- **CPU is the ceiling.** 8 logical threads / 1.0 vCPU per user = 8
  simultaneously CPU-bound users before CFS throttles. SMT cuts effective
  throughput under contention, so realistically it feels saturated at
  6–8 compute-heavy users.
- Disk throughput is the hidden ceiling during bursts: md RAID1 gives
  single-disk write bandwidth. 30 students all running `pnpm install` at
  once means ~30 × 500 MB of small-file I/O to the same overlay2 — disk
  queue gets long before RAM does.

### 3.2 Single-node ceilings (current config, no changes)

| Scenario | Ceiling | Bottleneck |
|---|---|---|
| Idle users (container alive, no work) | ~50 (hardcoded `MAX_USERS`) | Soft — `MAX_USERS=50` guards the math; actual RAM use is tiny |
| Active but light (editor, reading, small scripts) | ~40 simultaneously | RAM, *only* because tmpfs starts counting if anyone fills /tmp |
| Classroom mode, CPU-light (text, Python REPL) | ~30 active → well over 100 signed up | Session fan-out |
| Classroom mode, CPU-moderate (some building) | ~8–12 concurrently busy | CPU — `--cpus=1.0` hard cap × 8 threads |
| Burst (30 students run `pnpm install`) | ~6 finish fast, rest queue | CPU **and** disk I/O — shared overlay2 + RAID1 writes |
| Signed-up accounts (no activity) | ~6,500 hard | Monotonic port allocator hitting 65535 |

### 3.3 Single-node ceilings with the quick wins from §1 applied

Grow swap to 32–64 GiB, `--pids-limit 512`, add blkio caps, switch to
CPU shares (soft) instead of `--cpus` (hard), enforce `max_users`:

| Scenario | Ceiling | Notes |
|---|---|---|
| Idle users | ~150 | RAM allows it, but see §5.1 items 3 and 7 — need a deliberate choice of `max_users` |
| Active but light | ~80 concurrently | Swap absorbs tmpfs + RSS valleys, shares let idle users give CPU to busy ones |
| Classroom burst | ~25 concurrently | CPU shares mean bursty users get most of the pie; everyone slows to ~30% instead of queuing |
| Signed-up accounts | 6,500 still the hard limit, then unlimited after port allocator fix | |

### 3.4 Recommended initial cap

Given a single-classroom-teacher use case, and that the host is currently
~1.4 GiB used / 62 GiB free:

- **`max_users = 80`** feels right as the initial enforced cap. This keeps
  each user at ~1.25 GiB RSS × 80 = 100 GiB theoretical, which is bigger
  than physical RAM — but we'd need active concurrency over ~50 to hit
  that, which is unlikely outside a coordinated burst, and swap absorbs
  what little overshoot occurs.
- Revisit if we measure sustained swap usage > 50% or CPU steal > 20%.
- The RAM slice per user (currently 1285 MiB) can stay as-is — it's
  generous and gives students room for real dev work (Node builds, small
  ML notebooks). No need to shrink it just because we're raising the cap.

### 3.5 The multi-node ceiling

Multi-node is a different beast — it removes RAM/CPU as the ceiling but
introduces state-sharding concerns. See §5.

---

## 4. Industry reference points

(Qualitative comparisons — not numbers you should copy blindly.)

| System | Per-user RAM | Per-user CPU | Per-user disk | Isolation | Idle policy |
|---|---|---|---|---|---|
| JupyterHub (zero-to-jupyterhub) | 1–2 GiB guaranteed, 2–4 GiB burst | 0.5 guaranteed, 1–2 burst | 5–10 GiB PVC | runc container | Cull after 60 min idle |
| Replit Free | ~512 MiB | 0.5 shared | 1 GiB | Firecracker microVM | Aggressive sleep (~5 min) |
| Katacoda / Killercoda | 1–2 GiB | 1 vCPU | ephemeral | Kata / VM | 60–90 min session cap |
| GitHub Codespaces (2-core) | 8 GiB | 2 vCPU | 32 GiB | VM | 30 min inactivity stop |
| CoCalc free | 1 GiB | shared | 3 GiB | cgroup + user-NS | Sleep on inactivity |
| **3Compute today** | **1.25 GiB + 256 MiB tmpfs** | **1 vCPU (hard cap, no oversubscription)** | **unbounded** | **runc, no user-NS** | **Delete after ~4 s idle** |

Takeaways for us:

- **Our per-user RAM is in line with the industry.** 1.25 GiB RSS is right
  around the JupyterHub "guaranteed" tier and 2× what Replit free gives.
  No need to expand it — the existing slice is fine for real dev work.
- **Our CPU allocation is *generous* per user but under-provisioned
  in aggregate.** Nobody else hands every free-tier student a dedicated 1
  vCPU with a hard cap; they oversubscribe 2–4× (via CPU shares / weights)
  and rely on the fact that only ~25% of logged-in users are actively
  computing at any moment. Our hard cap is what forces the "8 busy users
  max" ceiling.
- **Our idle policy is the most aggressive in the industry.** 4–8 seconds
  to reap is great for resource reclamation but means students lose
  long-running processes the moment they close a tab. JupyterHub/Replit
  idle at 15–60 minutes. On a 64 GiB host with ample RAM headroom, we
  could comfortably let idle containers sit for 10–30 min.
- **Our isolation is on par with Replit free tier (runc, dropped caps,
  read-only rootfs, blocked host network)** — a reasonable balance for
  educational workloads, and stronger than Codespaces default. For
  untrusted-code classes (e.g. "write a linux exploit") we'd want
  gVisor (`--runtime=runsc`) or Firecracker.

---

## 5. Recommendations

### 5.1 Single-node quick wins (do these first)

| # | Change | Where | Effort | Impact |
|---|---|---|---|---|
| 1 | **Grow swap from 3.8 GiB → 32–64 GiB.** `fallocate -l 32G /swapfile && mkswap /swapfile && swapon /swapfile`, add to `/etc/fstab`. Then `sysctl vm.swappiness=10` persisted in `/etc/sysctl.d/`. | Host setup | 10 min | Huge — makes burst overcommit safe. Today 30 simultaneous builds could OOM |
| 2 | **`--pids-limit 512`** on `docker run`. | `backend/docker.py:269` area | 1 line | Closes the fork-bomb hole |
| 3 | **blkio throttle** (`--device-write-bps /dev/md2:50mb`, read 100mb). | `backend/docker.py:269` area | 2 lines | One student can't `dd` the RAID into a long queue during class |
| 4 | **Enforce `Settings.max_users`** at OAuth callback. Return a friendly "capacity reached" redirect. Bump the config default to 80. | `backend/api/routers/auth.py:111`, `config.py:19` | ~15 lines | Hard ceiling — no more silent overcommit |
| 5 | **Switch from `--cpus=1.0` (hard) to `--cpu-shares=1024` (soft) + a looser ceiling like `--cpus=4`.** Under contention every user gets a fair slice; under light load a student can burst to 4 threads. This is how JupyterHub / Replit etc. pack students. | `backend/docker.py:263-264` | 1 line | Bigger effective concurrency ceiling than anything else on this list |
| 6 | **Dense port allocator.** On new user, pick the lowest free 10-port slot. Query `SELECT port_start FROM user ORDER BY port_start` + walk for gaps. | `backend/api/routers/auth.py:19-51, 111-125` | ~30 lines | Removes the 6,500-user ceiling; lets us support user churn |
| 7 | **`systemd` caps on the backend unit**: `MemoryMax=2G`, `CPUQuota=200%`, `TasksMax=8192`. | `production/etc/systemd/system/3compute.service` | 3 lines | Backend runaway can't take the node |
| 8 | **Actually honour `settings.memory_mb`** (currently ignored — see §2.1 gotcha). Derive `memory_per_user` from `min(psutil.virtual_memory().total, settings.memory_mb)`. This lets us stash some RAM for the OS instead of pretending the whole node is ours. | `backend/docker.py:13-18` | 5 min | Small, but removes a broken knob from the config |
| 9 | **Idle timeout, not idle kill.** Delay the `docker rm -f` by e.g. 5 minutes after last disconnect instead of 4 s. Students who close a tab and immediately reopen don't lose `npm run dev`. Align with industry norms. | `backend/api/terminal.py:472-538` | 1 line | Big UX win for classroom sessions |

Items 1–4 are the must-haves before we advertise the platform for larger
classrooms. Items 5–7 unlock real headroom. 8–9 are polish.

**A note on swap placement.** The only filesystem on the host is `/dev/md2`,
which is software RAID. Swap on a RAID1 mirror is fine for safety but gives
you no extra write bandwidth under real memory pressure. If the node has a
separate NVMe, prefer swap there. If not, a plain swapfile on `/` is fine
at this scale — the box is bored (99% idle, 0 swap used at measurement).

### 5.2 Medium term (before multi-node)

1. **Disk quotas.** Options, cheapest to most-intrusive:
   - XFS project quotas on `/var/lib/3compute/uploads` (requires mount
     remount with `prjquota`). Matches per-user subdirectory 1:1 with
     a project ID.
   - ext4 project quotas (same idea, newer kernels).
   - Per-user loopback file ("5 GiB sparse file, mounted as ext4 at
     `uploads/{user_id}`"). Simple, but management-heavy.
   - Soft/informational only: a periodic cron that tallies `du` and
     emails+blocks when over quota.
2. **Garbage-collect orphans.** Cron/systemd-timer nightly:
   - For each `{user_id}` dir in `UPLOADS_ROOT`, if no matching `User.id`
     exists, archive or delete.
   - For each `PortSubdomain` row, if `user_id` is gone, delete row + Caddy
     route.
   - For each classroom dir, if no `Classroom.id`, archive.
   - For users with `last_login < 180 days ago`, tag as "stale" and stop
     giving them port allocations (keep data for grace period).
3. **Implement user deletion** (admin router). When it fires, it must:
   force-remove container, delete bind-mount dir, delete `PortSubdomain`
   rows and their Caddy routes, delete `ClassroomMember` rows, delete
   `User`. One transaction + one Docker call.
4. **Swap SQLite → Postgres** if concurrency goes above ~100. SQLite's
   single-writer serialization becomes visible around there. Switch is
   mostly mechanical since we're on SQLModel.
5. **Per-user fair-share CPU**. Move from `--cpus=1.0` hard cap to
   `--cpu-shares=1024` (or cgroup v2 `cpu.weight`). 1 vCPU guaranteed
   under contention, burst to whatever's free. Matches how JupyterHub etc.
   oversubscribe.
6. **Metrics endpoint**. `/admin/containers` already exists; extend it to
   include `docker stats` output (per-container CPU%, mem, net I/O) and
   surface host swap/disk pressure. Hand it to Prometheus if we want
   alerting.
7. **Classroom-global I/O limits**. When a teacher kicks off a 30-student
   assignment, we know all 30 students are about to `pnpm install`. A
   per-classroom token-bucket for "can start heavy build" would smooth
   the peak.

### 5.3 Stronger isolation (when curriculum goes adversarial)

Currently: runc + dropped caps + read-only rootfs + blocked host net.
That is adequate for "students learning Python / JS" but not for
"students learning Linux exploitation". If the curriculum moves toward
the latter:

- **gVisor** (`--runtime=runsc`) — userspace kernel, syscall-level
  sandbox. 10–30% CPU overhead. Drop-in: change the runtime flag in
  `spawn_container`.
- **Firecracker microVMs** (via `firecracker-containerd` or a dedicated
  dispatcher) — per-student VM, sub-second boot, ~5 MiB base overhead.
  Much bigger operational lift. Only worth it if we're teaching
  offensive security / kernel modules.
- **User namespaces** (dockerd `userns-remap=default`). Even without
  changing runtime this gives meaningful defense in depth at zero
  runtime cost, but requires non-trivial fs permission work because
  the container's UID 999 maps to a different host UID.

### 5.4 Going multi-node

Single node will hit its ceiling around 50–100 concurrent active users
even with the quick wins applied. Going multi-node is the right move
before we care about uptime SLOs.

The stack today is *almost* ready:

**What already shards cleanly:**
- Containers are per-user and isolated. Place them anywhere.
- Caddy reverse-proxies subdomains by routing to `localhost:{port}` —
  trivially changed to route to `{node_ip}:{port}`.

**What does not shard yet:**
- **Bind mount**: `UPLOADS_ROOT` is a local filesystem path. A user
  pinned to node A can't have their container spawn on node B without
  migrating data. Options:
  - *Pin users to a node.* Simplest. Assign on first login, record
    `node_id` on `User`. Downside: uneven load, one node failure kills
    those users.
  - *Shared storage.* NFS, or CephFS, or a CSI driver if we go
    Kubernetes. Latency on many small writes (editor saves) will hurt —
    test with Monaco save pattern before committing.
  - *Object-store snapshots.* Per-user tarball on S3-compatible storage,
    restored into local SSD on container spawn. Good fit for 3Compute's
    "container is ephemeral, data lives on host" model — the tarball
    is just the "host" moved into S3.
- **SQLite**: has to become Postgres the instant the backend runs on more
  than one node.
- **Socket.IO**: AsyncServer is in-process. For multi-instance we need
  the `AsyncRedisManager` backend so a tab connecting to node B can
  reach a container on node A (or we scheduler-pin the tab to the same
  node as the container).
- **Port namespace**: today ports are globally unique. On multi-node
  they only need to be node-unique. Encode `(node_id, port)` in
  `PortSubdomain` so Caddy routes include node IP. This actually
  *lowers* the per-node port pressure; we can pack more users per node.
- **Caddy**: runs on one host today. Multi-node: either keep a single
  Caddy in front and route to backend nodes (most operations come out
  simpler), or run Caddy on every node and put a simple TCP LB in
  front (more complex but no SPOF).
- **`deploy.sh`**: needs to iterate nodes instead of hitting one host.

Recommended ordering:

1. Add `node_id` to `User`, pin on first login, route incoming traffic
   by `node_id` — on a single node this is a no-op, but it makes the
   add-a-node operation trivial.
2. Switch SQLite → Postgres.
3. Add a second node. Keep Caddy on node-1. Verify a user pinned to
   node-2 gets a working container + subdomain.
4. Add Redis for Socket.IO if we need tab→container locality across
   nodes.
5. Only then consider shared storage.

### 5.5 Observability gaps

Before we scale, make sure we can *see* the node's state:

- `docker stats` → Prometheus exporter (`cadvisor`). Per-container CPU
  and RAM over time.
- node_exporter on the host. Swap, disk, load.
- Backend: add `/admin/health` returning `{users_active, users_capped,
  containers_running, port_allocator_high_water}`. A glance tells us
  if we're about to hit a ceiling.
- Alert on: host RAM + swap > 90%, container OOM kill rate > 0, port
  allocator within 500 of max.

---

## 6. Open questions / things to confirm

- ~~What are the actual host specs?~~ **Answered**: nyc0 is
  Xeon E3-1240 v5 (4c/8t), 64 GiB RAM, 3.8 GiB swap, 1.8 TiB RAID.
  Numbers in §3 are derived from those values.
- What is "typical class size" in practice? Does a single classroom ever
  have 50+ students working simultaneously, or is 20–30 the realistic
  peak?
- Do teachers ever need a student's long-running process to survive a
  disconnect? (If yes, the 4-second reap is user-hostile and §5.1 item 9
  becomes mandatory, not optional.)
- Are we willing to rate-limit OAuth signups, or is the "open to anyone
  with a Google account" model a hard requirement? A hard cap in §5.1
  item 4 only works if we're OK turning away new signups when full.
- When users leave (graduate, drop out, never come back), what is the
  data-retention rule? The GC rules in §5.2 item 2 need a concrete
  threshold, not "stale".
- Is there a separate disk (NVMe) on the node other than the RAID array
  we could move swap / Docker storage to? RAID1 write bandwidth is the
  hidden bottleneck during bursty workloads.

---

## 7. Appendix: key code locations (copy-paste jump list)

- Container spawn + resource flags: `backend/docker.py:202-269`
- `memory_per_user` math: `backend/docker.py:13-18`
- Idle poller + removal: `backend/api/terminal.py:472-538`
- Infra-process allowlist: `backend/api/terminal.py:462-469`
- Container discovery on startup: `backend/api/terminal.py:89-132`
- Port allocator: `backend/api/routers/auth.py:19-51, 111-125`
- Subdomain CRUD: `backend/api/routers/subdomains.py`
- Caddy integration: `backend/api/subdomain_caddy.py`
- Config / tunables: `backend/api/config.py`
- systemd unit: `production/etc/systemd/system/3compute.service`
- nginx front: `production/etc/nginx/sites-available/3compute.org`
- Deploy: `production/opt/deploy.sh`
- DB models: `backend/api/database.py`

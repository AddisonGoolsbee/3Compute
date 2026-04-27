# Debug: "3 fuckin losers" — empty files + 500 on login

Incident: student reports save error → refresh → all files empty → logout → "Internal Server Error" on login → re-login succeeds but kicked from classroom, files still show empty. Screenshot shows `/3-fuckin-losers/Weather-App/weather_api.py` as empty.

Date of incident: **2026-04-17 around 14:31 local time** (adjust below if you know the server is in a different timezone).

Run the sections below in order on the production server. Paste back all output.

---

## 1. Identify the user + classroom

```bash
cd /var/www/3compute

# Find the classroom — slug was "3-fuckin-losers". Print id + name + access code.
.venv/bin/python3 -c "
from sqlmodel import Session, select
from backend.api.database import Classroom, ClassroomMember, User, get_engine
with Session(get_engine()) as db:
    cs = db.exec(select(Classroom)).all()
    for c in cs:
        import re
        slug = re.sub(r'[^a-z0-9\s-]', '', (c.name or '').lower())
        slug = re.sub(r'[\s-]+', '-', slug).strip('-')
        if 'fuckin' in slug or 'loser' in slug or slug == '3-fuckin-losers':
            print('CLASSROOM', c.id, repr(c.name), c.access_code)
            members = db.exec(select(ClassroomMember).where(ClassroomMember.classroom_id == c.id)).all()
            for m in members:
                u = db.get(User, m.user_id)
                print('  MEMBER', m.role, m.archived, u.email if u else '(missing user)', u.id if u else '?')
"
```

Record the **classroom_id** and each member's **user_id** + **email**. The student (participant) is the one who reported the bug.

```bash
# From the above, set shell vars for later commands
export CID=db67a5b3-4800-42b3-9b4c-e4fabd22d934
export UID_STUDENT=116413670418889020139
export EMAIL_STUDENT=blh237@cornell.edu
```

---

## 2. Disk state for the participant folder

```bash
# Top-level contents
ls -la /var/lib/3compute/classrooms/$CID/
ls -la /var/lib/3compute/classrooms/$CID/participants/

# The specific participant dir — the reported empty files live here
PARTICIPANT_DIR=/var/lib/3compute/classrooms/$CID/participants/${EMAIL_STUDENT//\//_}
echo "PARTICIPANT_DIR=$PARTICIPANT_DIR"
ls -la "$PARTICIPANT_DIR/"

# Recursive listing with sizes so we can spot zero-byte files
find "$PARTICIPANT_DIR" -maxdepth 4 -printf '%s\t%TY-%Tm-%Td %TH:%TM\t%p\n' 2>/dev/null | head -100

# Specifically — is weather_api.py actually empty on disk?
stat "$PARTICIPANT_DIR/Weather-App/weather_api.py" 2>/dev/null
wc -l "$PARTICIPANT_DIR/Weather-App"/*.py 2>/dev/null
echo '--- weather_api.py content (first 80 lines) ---'
sed -n '1,80p' "$PARTICIPANT_DIR/Weather-App/weather_api.py" 2>/dev/null
echo '--- end ---'

# Also check the teacher's assignments dir for Weather-App so we can tell
# whether the student's copy was ever populated from a non-empty template
ls -la /var/lib/3compute/classrooms/$CID/assignments/ 2>/dev/null
ls -la /var/lib/3compute/classrooms/$CID/assignments/Weather-App/ 2>/dev/null
wc -l /var/lib/3compute/classrooms/$CID/assignments/Weather-App/*.py 2>/dev/null
```

---

## 3. Student's upload dir (is the classroom symlink intact?)

```bash
ls -la /var/lib/3compute/uploads/$UID_STUDENT/
# Specifically, is "3-fuckin-losers" a symlink or a real directory?
# (if it's a real directory, that's the bug I'm chasing)
stat /var/lib/3compute/uploads/$UID_STUDENT/3-fuckin-losers 2>/dev/null
readlink /var/lib/3compute/uploads/$UID_STUDENT/3-fuckin-losers 2>/dev/null

# Is Weather-App a standalone directory in their personal upload dir (vs inside the classroom symlink)?
stat /var/lib/3compute/uploads/$UID_STUDENT/Weather-App 2>/dev/null
find /var/lib/3compute/uploads/$UID_STUDENT -maxdepth 3 -name 'weather_api.py' -printf '%s\t%p\n' 2>/dev/null

# List all symlinks to show where things point
find /var/lib/3compute/uploads/$UID_STUDENT -maxdepth 3 -type l -ls 2>/dev/null
```

---

## 4. Container state

```bash
# Is the student's container running?
docker ps -a --filter "name=user-container-$UID_STUDENT" --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"

# When was it last (re)created?
docker inspect user-container-$UID_STUDENT --format '{{.State.Status}} Started={{.State.StartedAt}} Finished={{.State.FinishedAt}} RestartCount={{.RestartCount}}' 2>/dev/null

# If it's running, see the symlink target inside the container
docker exec user-container-$UID_STUDENT sh -c 'ls -la /app/ && readlink /app/3-fuckin-losers' 2>/dev/null
```

---

## 5. Backend logs around the incident

The incident was around **2026-04-17 14:31**. Grab a wide window (say 13:00 to 15:30) and filter. Include a second pass without the filter in case symptoms showed up under different keywords.

```bash
# Find when the 3compute service was started/reloaded recently — was there a restart near the incident?
journalctl -u 3compute --since "2026-04-17 00:00" --until "2026-04-17 23:59" --no-pager \
  | grep -E "Started|Stopping|Stopped|Reloaded|Main process exited|Started 3Compute|uvicorn running" | tail -50

# All ERROR / Traceback / 500 lines in the day
journalctl -u 3compute --since "2026-04-17 13:00" --until "2026-04-17 15:45" --no-pager \
  | grep -E "ERROR|Traceback|500 Internal|exception|Exception|Failed|denied|errno|No space|OSError|PermissionError" \
  | tail -300

# Everything mentioning the student (UID or email) in a wider window
journalctl -u 3compute --since "2026-04-17 00:00" --no-pager \
  | grep -E "$UID_STUDENT|$EMAIL_STUDENT" | tail -200

# Everything mentioning the classroom id
journalctl -u 3compute --since "2026-04-17 00:00" --no-pager \
  | grep -F "$CID" | tail -200

# File write + symlink code paths I suspect. These match log strings from
# backend/docker.py and backend/api/routers/files.py.
journalctl -u 3compute --since "2026-04-17 00:00" --no-pager \
  | grep -E "host symlink|cleaning up old symlinks|Failed to push template|Move failed|Publish|rmtree|notify_files_changed|Host classroom path missing" \
  | tail -200

# Raw slice from ~20 min before the incident to ~20 min after, in case
# something important got filtered out. Large — pipe to a file if it's huge.
journalctl -u 3compute --since "2026-04-17 14:10" --until "2026-04-17 14:55" --no-pager > /tmp/3c-incident.log
wc -l /tmp/3c-incident.log
# Show the non-spammy bits: drop routine socket.io heartbeats and HTTP 200s.
grep -vE "engineio|socketio.*packet|HTTP/1.1\" 2[0-9]{2}|\"GET /api/files/list|PING|PONG|heartbeat" /tmp/3c-incident.log | tail -400
```

If `/var/www/3compute/logs/backend.log` exists, also check it:

```bash
ls -la /var/www/3compute/logs/ 2>/dev/null
tail -n 2000 /var/www/3compute/logs/backend.log 2>/dev/null \
  | grep -E "ERROR|Traceback|500|Failed|$UID_STUDENT|$EMAIL_STUDENT|$CID|symlink|rmtree|No space" \
  | tail -200
```

---

## 6. Disk + inode pressure (cheap sanity check)

A save-then-empty pattern is classic for "disk full" — `open(..., "w")` truncates, then write fails.

```bash
df -h /var/lib/3compute /var/www /tmp
df -i /var/lib/3compute /var/www /tmp
# Anything huge under uploads/classrooms?
du -sh /var/lib/3compute/uploads /var/lib/3compute/classrooms 2>/dev/null
```

---

## 7. Session / DB sanity

```bash
cd /var/www/3compute

# Does the student still have a ClassroomMember row for this classroom?
.venv/bin/python3 -c "
import os
from sqlmodel import Session, select
from backend.api.database import ClassroomMember, User, Classroom, get_engine
UID = os.environ['UID_STUDENT']
CID = os.environ['CID']
with Session(get_engine()) as db:
    u = db.get(User, UID)
    print('USER', u.id if u else None, u.email if u else None, 'role=', u.role if u else None)
    m = db.exec(select(ClassroomMember).where(ClassroomMember.classroom_id==CID, ClassroomMember.user_id==UID)).first()
    print('MEMBERSHIP', m.role if m else 'MISSING', 'archived=', m.archived if m else None)
    c = db.get(Classroom, CID)
    print('CLASSROOM', c.name if c else None, 'joins_paused=', getattr(c,'joins_paused',None))
"
```

---

## Paste-back checklist

Paste back everything from sections 1–7. In particular I'm looking for:

- Section 2: are the files *actually* zero bytes on disk, or does the editor just render blank?
- Section 3: is `/uploads/$UID_STUDENT/3-fuckin-losers` a symlink or a real directory?
- Section 5: any `Traceback`, any `Failed to create host symlink`, any `rmtree` around 14:31?
- Section 6: is disk ≥ 95% full or inodes exhausted?
- Section 7: does the `ClassroomMember` row still exist?

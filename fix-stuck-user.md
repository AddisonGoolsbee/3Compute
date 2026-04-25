# Fix a stuck user

When a single user's terminal won't load ("connection refused") but everyone else is fine, their container is likely in a bad state. Kill it and let it recreate on next page load.

## 1. Find their user ID and port range

```bash
cd /var/www/3compute
.venv/bin/python3 -c "
from sqlmodel import Session, select
from backend.api.database import User, get_engine
with Session(get_engine()) as db:
    for u in db.exec(select(User)).all():
        print(f'{u.id}  {u.port_start}-{u.port_end}  {u.email}')
"
```

Check for overlapping port ranges. Each user should have a unique 10-port block (10000-10009, 10010-10019, etc). If two users share the same range, the second container fails to bind.

## 2. Kill their container

```bash
docker rm -f user-container-<USER_ID>
```

## 3. Check logs (optional, to find root cause)

```bash
sudo journalctl -u 3compute --since "1 hour ago" | grep -i "<USER_ID_OR_EMAIL>" | tail -30
```

## 4. Have them refresh the page

A new container spawns automatically on next page load.

## Port conflict fix

If two users have the same port range, fix in the DB:

```bash
cd /var/www/3compute
.venv/bin/python3 -c "
from sqlmodel import Session, select
from backend.api.database import User, get_engine
with Session(get_engine()) as db:
    users = db.exec(select(User).order_by(User.port_start)).all()
    for u in users:
        print(f'{u.port_start}-{u.port_end}  {u.email}')
    # Check for overlaps
    for i in range(len(users) - 1):
        if users[i].port_end >= users[i+1].port_start:
            print(f'OVERLAP: {users[i].email} ({users[i].port_start}-{users[i].port_end}) and {users[i+1].email} ({users[i+1].port_start}-{users[i+1].port_end})')
"
```

To reassign a user's ports (pick the next free block after the highest existing one):

```bash
cd /var/www/3compute
.venv/bin/python3 -c "
from sqlmodel import Session, select
from backend.api.database import User, get_engine
TARGET_EMAIL = '<THEIR_EMAIL>'
with Session(get_engine()) as db:
    highest = db.exec(select(User).order_by(User.port_end.desc())).first()
    new_start = (highest.port_end + 1) if highest else 10000
    new_end = new_start + 9
    user = db.exec(select(User).where(User.email == TARGET_EMAIL)).first()
    if user:
        print(f'Reassigning {user.email}: {user.port_start}-{user.port_end} -> {new_start}-{new_end}')
        user.port_start = new_start
        user.port_end = new_end
        db.add(user)
        db.commit()
    else:
        print('User not found')
"
```

Then kill their container (`docker rm -f user-container-<USER_ID>`) and have them refresh.

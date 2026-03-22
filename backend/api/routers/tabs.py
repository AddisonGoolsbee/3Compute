import json
import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..database import User
from ..dependencies import get_current_user

logger = logging.getLogger("tabs")
router = APIRouter()

USERS_JSON_FILE = os.environ.get("USERS_JSON_FILE", "backend/users.json")


class TabState(BaseModel):
    tabs: list[str]
    active_tab: str


@router.get("/")
async def get_tabs(user: User = Depends(get_current_user)):
    try:
        if os.path.exists(USERS_JSON_FILE):
            with open(USERS_JSON_FILE) as f:
                users_data = json.load(f)
            user_data = users_data.get(user.id, {})
            tabs_data = user_data.get("terminal_tabs", {})
            if (
                isinstance(tabs_data.get("tabs"), list)
                and isinstance(tabs_data.get("active_tab"), str)
                and tabs_data["tabs"]
                and tabs_data["active_tab"] in tabs_data["tabs"]
            ):
                sanitized = [
                    t for t in tabs_data["tabs"] if isinstance(t, str) and t.isalnum()
                ]
                if sanitized and tabs_data["active_tab"] in sanitized:
                    return {"tabs": sanitized, "active_tab": tabs_data["active_tab"]}
    except Exception as e:
        logger.error(f"Error loading tabs: {e}")
    return {"tabs": ["1"], "active_tab": "1"}


@router.post("/")
async def save_tabs(body: TabState, user: User = Depends(get_current_user)):
    if body.active_tab not in body.tabs:
        raise HTTPException(
            status_code=400, detail="Active tab must be in tabs list"
        )
    if not body.tabs:
        raise HTTPException(status_code=400, detail="Tabs must be non-empty")

    sanitized = [t for t in body.tabs if isinstance(t, str) and t.isalnum()]
    if not sanitized:
        raise HTTPException(status_code=400, detail="No valid tab IDs")

    active = body.active_tab if body.active_tab in sanitized else sanitized[0]

    try:
        users_data = {}
        if os.path.exists(USERS_JSON_FILE):
            with open(USERS_JSON_FILE) as f:
                users_data = json.load(f)
        if user.id not in users_data:
            users_data[user.id] = {}
        users_data[user.id]["terminal_tabs"] = {"tabs": sanitized, "active_tab": active}
        with open(USERS_JSON_FILE, "w") as f:
            json.dump(users_data, f, indent=2)
    except Exception as e:
        logger.error(f"Error saving tabs: {e}")
        raise HTTPException(status_code=500, detail="Failed to save tabs")

    return {"success": True}

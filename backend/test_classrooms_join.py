import json
from unittest.mock import patch

import pytest


@pytest.fixture
def mock_flask_user(monkeypatch):
    class User:
        def __init__(self, id_, email):
            self.id = id_
            self.email = email
            self.is_authenticated = True
            self.port_range = (8000, 8010)

    user = User("user-123", "test@example.com")
    monkeypatch.setattr("backend.classrooms.current_user", user)
    return user


@pytest.fixture
def temp_classrooms_file(tmp_path, monkeypatch):
    p = tmp_path / "classrooms.json"
    monkeypatch.setattr("backend.classrooms.CLASSROOMS_JSON_FILE", str(p))
    return p


def test_duplicate_join_returns_400(mock_flask_user, temp_classrooms_file):
    from backend import classrooms

    # Seed a classroom with access code
    classroom_id = "abc-class"
    access_code = "ABC123"
    data = {
        classroom_id: {
            "id": classroom_id,
            "name": "Test Class",
            "created_at": "2025-01-01T00:00:00Z",
            "instructors": ["other-instructor"],
            "participants": [],
            "access_code": access_code,
        }
    }
    with open(temp_classrooms_file, "w") as f:
        json.dump(data, f)

    # First join should succeed (200)
    with (
        patch("backend.classrooms.spawn_container") as _,
        patch("backend.classrooms.container_exists", return_value=False),
        patch("backend.classrooms.user_containers", {}),
    ):
        from flask import Flask

        app = Flask(__name__)
        app.register_blueprint(classrooms.classrooms_bp)
        client = app.test_client()

        resp1 = client.post("/classrooms/join", json={"code": access_code})
        assert resp1.status_code == 200
        # Update file to reflect added participant
        with open(temp_classrooms_file) as f:
            updated = json.load(f)
        assert mock_flask_user.id in updated[classroom_id]["participants"]

        # Second join should now fail with 400
        resp2 = client.post("/classrooms/join", json={"code": access_code})
        assert resp2.status_code == 400
        err = resp2.get_json()
        assert "already" in err.get("error", "").lower()


def test_instructor_cannot_join_self(
    mock_flask_user, temp_classrooms_file, monkeypatch
):
    from backend import classrooms

    # Make user instructor
    classroom_id = "instr-class"
    access_code = "ZZZ999"
    data = {
        classroom_id: {
            "id": classroom_id,
            "name": "Owned Class",
            "created_at": "2025-01-01T00:00:00Z",
            "instructors": [mock_flask_user.id],
            "participants": [],
            "access_code": access_code,
        }
    }
    with open(temp_classrooms_file, "w") as f:
        json.dump(data, f)

    with (
        patch("backend.classrooms.spawn_container") as _,
        patch("backend.classrooms.container_exists", return_value=False),
        patch("backend.classrooms.user_containers", {}),
    ):
        from flask import Flask

        app = Flask(__name__)
        app.register_blueprint(classrooms.classrooms_bp)
        client = app.test_client()

        resp = client.post("/classrooms/join", json={"code": access_code})
        assert resp.status_code == 400
        msg = resp.get_json().get("error", "").lower()
        assert "instructor" in msg

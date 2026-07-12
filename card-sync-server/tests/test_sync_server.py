"""
Comprehensive test suite for card-sync-server
Tests cover: push, pull, handshake, snapshot, rebuild, LWW, payload mapping, etc.
"""

import pytest
import subprocess
import time
import json
import requests
import sqlite3
import tempfile
import os
import sys
import socket
import shutil
from pathlib import Path

SERVER_DIR = Path(__file__).resolve().parents[1]

# Familien-PIN für Join-Tests: der Standard-Testserver läuft mit konfigurierter
# PIN, damit die Join-Flows testbar bleiben (fail closed ohne Konfiguration).
TEST_JOIN_PIN = "4711"
if str(SERVER_DIR) not in sys.path:
    sys.path.insert(0, str(SERVER_DIR))

import sync_server


# ═════════════════════════════════════════════════════════════════════════════
# Fixtures
# ═════════════════════════════════════════════════════════════════════════════

@pytest.fixture
def temp_db():
    """Create temporary SQLite database."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    yield db_path
    # Cleanup
    if os.path.exists(db_path):
        os.remove(db_path)


def _start_server(temp_db, env_overrides=None):
    """Start sync server with optional environment overrides."""
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        s.bind(("127.0.0.1", 0))
        port = s.getsockname()[1]
    env = os.environ.copy()
    env["SYNC_DB_PATH"] = temp_db
    env["SYNC_PORT"] = str(port)
    # Tests drive push delivery explicitly. Disabling the background loop also
    # guarantees that the shared test database is idle between test cases.
    env["PUSH_DAILY_SCHEDULER_ENABLED"] = "0"
    if env_overrides:
        env.update({key: str(value) for key, value in env_overrides.items()})

    proc = subprocess.Popen(
        ["python3", "sync_server.py"],
        cwd=str(SERVER_DIR),
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE
    )

    base = f"http://localhost:{port}"
    deadline = time.time() + 5
    while time.time() < deadline:
        if proc.poll() is not None:
            stderr = ""
            if proc.stderr:
                try:
                    stderr = proc.stderr.read().decode("utf-8", errors="ignore")
                except Exception:
                    stderr = ""
            raise RuntimeError(f"sync_server.py exited early with code {proc.returncode}: {stderr}")
        try:
            r = requests.get(f"{base}/health", timeout=0.2)
            if r.status_code == 200:
                return {"proc": proc, "port": port, "db": temp_db}
        except Exception:
            pass
        time.sleep(0.05)

    proc.terminate()
    raise RuntimeError("sync_server.py did not become ready within 5s")


def _stop_server(proc):
    proc.terminate()
    try:
        proc.wait(timeout=2)
    except subprocess.TimeoutExpired:
        proc.kill()


@pytest.fixture(scope="module")
def shared_server():
    """Start the default test server once and retain a pristine DB template."""
    with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
        db_path = f.name
    template_path = f"{db_path}.template"
    srv = _start_server(db_path, env_overrides={"SYNC_JOIN_PIN": TEST_JOIN_PIN})

    # Startup closes its schema connection before serving requests. Checkpoint
    # WAL once so the template is a single self-contained SQLite file.
    conn = sqlite3.connect(db_path)
    try:
        conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    finally:
        conn.close()
    shutil.copyfile(db_path, template_path)

    yield {**srv, "template": template_path}

    _stop_server(srv["proc"])
    for path in (db_path, template_path, f"{db_path}-wal", f"{db_path}-shm"):
        if os.path.exists(path):
            os.remove(path)


@pytest.fixture
def server(shared_server):
    """Reset the shared server database to its pristine startup state."""
    db_path = shared_server["db"]
    for suffix in ("-wal", "-shm"):
        sidecar = f"{db_path}{suffix}"
        if os.path.exists(sidecar):
            os.remove(sidecar)
    shutil.copyfile(shared_server["template"], db_path)
    return shared_server


@pytest.fixture
def server_factory(temp_db):
    """Start one or more sync server processes sharing the temp DB."""
    started = []

    def factory(env_overrides=None):
        srv = _start_server(temp_db, env_overrides=env_overrides)
        started.append(srv)
        return srv

    yield factory

    for srv in started:
        _stop_server(srv["proc"])


@pytest.fixture
def api(server):
    """Helper for API requests."""
    port = server["port"]
    
    class APIHelper:
        def _headers(self, auth_token=None):
            headers = {}
            if auth_token:
                headers["Authorization"] = f"Bearer {auth_token}"
            return headers

        def create_profile(self, device_id, device_label="Device", profile_name=None):
            """POST /auth/profile"""
            body = {
                "deviceId": device_id,
                "deviceLabel": device_label,
            }
            if profile_name:
                body["profileName"] = profile_name
            r = requests.post(f"http://localhost:{port}/auth/profile", json=body)
            return r.json() if r.text else {}

        def list_profiles(self, limit=20, auth_token=None):
            """GET /auth/profiles"""
            r = requests.get(f"http://localhost:{port}/auth/profiles", params={"limit": limit}, headers=self._headers(auth_token))
            return r.json() if r.text else {}

        def switch_profile(self, user_id, device_id, device_label="Device", auth_token=None):
            """POST /auth/profile/switch"""
            body = {
                "userId": user_id,
                "deviceId": device_id,
                "deviceLabel": device_label,
            }
            r = requests.post(f"http://localhost:{port}/auth/profile/switch", json=body, headers=self._headers(auth_token))
            return r.json() if r.text else {}

        def join_public_profile(self, user_id, device_id, device_label="Device", join_pin=TEST_JOIN_PIN):
            """POST /auth/profile/join"""
            body = {
                "userId": user_id,
                "deviceId": device_id,
                "deviceLabel": device_label,
            }
            if join_pin is not None:
                body["joinPin"] = join_pin
            r = requests.post(f"http://localhost:{port}/auth/profile/join", json=body)
            return r.json() if r.text else {}

        def issue_pairing_code(self, auth_token):
            """POST /auth/pair/issue"""
            r = requests.post(
                f"http://localhost:{port}/auth/pair/issue",
                json={},
                headers=self._headers(auth_token),
            )
            return r.json() if r.text else {}

        def redeem_pairing_code(self, code, device_id, device_label="Device"):
            """POST /auth/pair/redeem"""
            r = requests.post(
                f"http://localhost:{port}/auth/pair/redeem",
                json={"code": code, "deviceId": device_id, "deviceLabel": device_label},
            )
            return r.json() if r.text else {}

        def recover_profile(self, recovery_code, device_id, device_label="Device"):
            """POST /auth/recover"""
            r = requests.post(
                f"http://localhost:{port}/auth/recover",
                json={"recoveryCode": recovery_code, "deviceId": device_id, "deviceLabel": device_label},
            )
            return r.json() if r.text else {}

        def push(self, op_id, op_type, payload, client_id="test-client", client_timestamp=None, auth_token=None):
            """POST /sync"""
            if client_timestamp is None:
                client_timestamp = int(time.time() * 1000)
            body = {
                "opId": op_id,
                "type": op_type,
                "payload": payload,
                "clientId": client_id,
                "clientTimestamp": client_timestamp
            }
            r = requests.post(f"http://localhost:{port}/sync", json=body, headers=self._headers(auth_token))
            return r.json() if r.text else {}
        
        def pull(self, since=0, limit=50, client_id=None, auth_token=None):
            """GET /sync/pull"""
            params = {"since": since, "limit": limit}
            if client_id:
                params["clientId"] = client_id
            r = requests.get(f"http://localhost:{port}/sync/pull", params=params, headers=self._headers(auth_token))
            return r.json() if r.text else {}
        
        def handshake(self, client_id, last_cursor=0, local_counts=None, wants_snapshot=False, auth_token=None):
            """POST /sync/handshake"""
            body = {
                "clientId": client_id,
                "lastCursor": last_cursor,
                "wantsSnapshot": wants_snapshot
            }
            if local_counts:
                body["localCounts"] = local_counts
            r = requests.post(f"http://localhost:{port}/sync/handshake", json=body, headers=self._headers(auth_token))
            return r.json() if r.text else {}
        
        def snapshot(self, client_id, include_deleted=False, auth_token=None):
            """GET /sync/snapshot"""
            params = {"clientId": client_id}
            if include_deleted:
                params["includeDeleted"] = "true"
            r = requests.get(f"http://localhost:{port}/sync/snapshot", params=params, headers=self._headers(auth_token))
            return r.json() if r.text else {}
        
        def health(self):
            """GET /health"""
            r = requests.get(f"http://localhost:{port}/health")
            return r.json() if r.text else {}

        def list_decks(self, auth_token=None):
            """GET /sync/decks"""
            r = requests.get(f"http://localhost:{port}/sync/decks", headers=self._headers(auth_token))
            return r.json() if r.text else {}

        def bootstrap_upload(self, client_id, batch_id, decks=None, cards=None, reviews=None, shuffle_collections=None, video_notes=None, sent_at=None, auth_token=None):
            """POST /sync/bootstrap/upload"""
            body = {
                "clientId": client_id,
                "batchId": batch_id,
                "decks": decks or [],
                "cards": cards or [],
                "reviews": reviews or [],
                "shuffleCollections": shuffle_collections or [],
                "videoNotes": video_notes or [],
            }
            if sent_at is not None:
                body["sentAt"] = sent_at
            r = requests.post(f"http://localhost:{port}/sync/bootstrap/upload", json=body, headers=self._headers(auth_token))
            return r.json() if r.text else {}
    
    return APIHelper()


@pytest.fixture
def db_helper(server):
    """Helper for direct database queries."""
    db_path = server["db"]
    
    class DBHelper:
        def query(self, sql):
            """Execute query and return results."""
            conn = sqlite3.connect(db_path)
            try:
                rows = conn.execute(sql).fetchall()
                conn.commit()
                return rows
            finally:
                conn.close()
        
        def count(self, table):
            """Count rows in table."""
            result = self.query(f"SELECT COUNT(*) FROM {table}")
            return result[0][0] if result else 0
    
    return DBHelper()


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Push & Idempotency
# ═════════════════════════════════════════════════════════════════════════════

class TestPushAndIdempotency:
    
    def test_push_stores_sync_event_with_client_id(self, api, db_helper, server):
        """Push stores event in sync_operations with correct source_client."""
        assert api.health()["ok"] is True
        
        # Push review operation
        result = api.push(
            op_id="review-1",
            op_type="review",
            payload={"cardId": "c1", "updated": {"type": 2}},
            client_id="client-A",
            client_timestamp=1000
        )
        
        # Verify push response
        assert result["ok"] is True
        assert result["stored"] is True
        assert result["duplicate"] is False
        
        # Verify database
        rows = db_helper.query("SELECT op_id, source_client FROM sync_operations WHERE op_id='review-1'")
        assert len(rows) == 1
        assert rows[0][1] == "client-A"

    def test_legacy_messer_deck_create_is_persisted_as_delete(self, api, db_helper):
        """Stale clients must not resurrect old Professor Messer path decks."""
        created = api.create_profile(device_id="legacy-messer-device", profile_name="Legacy Messer")
        token = created["profileToken"]
        legacy_name = (
            "Professor Messer CompTIA Security+ SY0-701 v1.1 Free Video Course"
            "::Section 1: General Security Concepts::1.1: Security Controls"
        )

        result = api.push(
            op_id="legacy-messer-recreate",
            op_type="deck.create",
            payload={
                "id": "1728574508386",
                "name": legacy_name,
                "parentDeckId": "1773008953575",
                "createdAt": 1000,
                "updatedAt": 2000,
                "source": "anki-import",
            },
            client_id="stale-client",
            client_timestamp=2000,
            auth_token=token,
        )

        assert result["ok"] is True
        assert result["stored"] is True

        deck_rows = db_helper.query(
            "SELECT deleted_at, last_source_client FROM server_decks WHERE id='1728574508386'"
        )
        assert len(deck_rows) == 1
        assert deck_rows[0][0] is not None
        assert deck_rows[0][1] == "server-maintenance-publisher"

        op_rows = db_helper.query(
            """
            SELECT op_type, source_client, payload_json
            FROM sync_operations
            WHERE op_id LIKE 'server-maintenance-publish:blocked-legacy-deck:%'
            """
        )
        assert len(op_rows) == 1
        assert op_rows[0][0] == "deck.delete"
        assert op_rows[0][1] == "server-maintenance-publisher"
        assert json.loads(op_rows[0][2])["deckId"] == "1728574508386"
    
    def test_duplicate_push_is_idempotent(self, api, db_helper, server):
        """Same opId not duplicated; second request returns duplicate=true."""
        push_payload = {
            "opId": "dup-1",
            "type": "card.create",
            "payload": {"id": "c1", "front": "Q", "back": "A"},
            "clientId": "client-A",
            "clientTimestamp": 1000
        }
        
        # First push
        r1 = requests.post(f"http://localhost:{server['port']}/sync", json=push_payload)
        result1 = r1.json()
        assert result1["stored"] is True
        assert result1["duplicate"] is False
        
        # Second push (same opId)
        r2 = requests.post(f"http://localhost:{server['port']}/sync", json=push_payload)
        result2 = r2.json()
        assert result2["stored"] is False
        assert result2["duplicate"] is True
        
        # Verify only 1 row in DB
        rows = db_helper.query("SELECT COUNT(*) FROM sync_operations WHERE op_id='dup-1'")
        assert rows[0][0] == 1


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Handshake
# ═════════════════════════════════════════════════════════════════════════════

class TestHandshake:
    
    def test_handshake_requests_snapshot_for_new_client(self, api):
        """New client with empty local state against empty server: no action needed."""
        result = api.handshake(
            client_id="completely-new-client",
            last_cursor=0,
            local_counts={"cards": 0, "decks": 0}
        )
        
        assert result["ok"] is True
        # Both server and client are empty — nothing to sync, no snapshot needed.
        assert result["needsSnapshot"] is False
        assert result["needsClientBootstrapUpload"] is False
        assert result["reason"] == "ok"
    
    def test_handshake_does_not_require_snapshot_for_known_current_client(self, api):
        """Known client with current cursor + non-zero localCounts gets needsSnapshot=false."""
        # First, push an event from a client
        api.push(
            op_id="test-1",
            op_type="card.create",
            payload={"id": "c1", "front": "Q", "back": "A"},
            client_id="known-client"
        )
        
        # Get current cursor
        pull_result = api.pull()
        current_cursor = pull_result.get("nextCursor", 1)
        
        # Now handshake with known client at current cursor
        result = api.handshake(
            client_id="known-client",
            last_cursor=current_cursor,
            local_counts={"cards": 5, "decks": 1}
        )
        
        assert result["ok"] is True
        assert result["needsSnapshot"] is False
        assert result["reason"] == "ok"

    def test_handshake_advertises_review_bootstrap_support_and_detects_missing_history(self, api):
        api.push(
            op_id="handshake-review-card",
            op_type="card.create",
            payload={"id": "card-review-gap", "deckId": "d1", "noteId": "n1", "front": "Q", "back": "A"},
            client_id="known-client",
            client_timestamp=1000,
        )

        result = api.handshake(
            client_id="known-client",
            last_cursor=1,
            local_counts={"cards": 1, "decks": 0, "reviews": 1},
        )

        assert result["ok"] is True
        assert result["needsClientBootstrapUpload"] is True
        assert result["needsSnapshot"] is False
        assert result["reason"] == "server-missing-client-review-history"
        assert result["bootstrapUploadCapabilities"]["reviews"] is True
        assert result["serverCounts"]["reviews"] == 0


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Pull
# ═════════════════════════════════════════════════════════════════════════════

class TestPull:
    
    def test_pull_excludes_same_client_events(self, api):
        """Pull filters out events where source_client == clientId."""
        # Push two events from different clients
        api.push(
            op_id="evt-a",
            op_type="card.create",
            payload={"id": "ca", "front": "A", "back": "AA"},
            client_id="client-A"
        )
        api.push(
            op_id="evt-b",
            op_type="card.create",
            payload={"id": "cb", "front": "B", "back": "BB"},
            client_id="client-B"
        )
        
        # Pull as client-A (should exclude evt-a)
        result_a = api.pull(client_id="client-A")
        ops_a = [o["opId"] for o in result_a["operations"]]
        assert "evt-b" in ops_a
        assert "evt-a" not in ops_a
        
        # Pull as client-B (should exclude evt-b)
        result_b = api.pull(client_id="client-B")
        ops_b = [o["opId"] for o in result_b["operations"]]
        assert "evt-a" in ops_b
        assert "evt-b" not in ops_b
    
    def test_pull_returns_ascending_ids_and_next_cursor(self, api):
        """Operations sorted by id ASC; nextCursor, hasMore correct."""
        # Push 5 events
        for i in range(5):
            api.push(
                op_id=f"evt-{i}",
                op_type="card.create",
                payload={"id": f"c{i}", "front": f"Q{i}", "back": f"A{i}"},
                client_id="c1"
            )
        
        # Pull with limit=3
        result = api.pull(limit=3)
        ops = result["operations"]
        
        # Check ascending IDs
        ids = [o["id"] for o in ops]
        assert ids == sorted(ids)
        
        # Check cursor
        assert result["nextCursor"] == max(ids)
        assert result["hasMore"] is True
        
        # Pull with higher limit
        result_all = api.pull(limit=100)
        assert result_all["hasMore"] is False

    def test_pull_tracks_client_cursor_ack(self, api, db_helper):
        """Client pull with since>0 is tracked in sync_client_cursors."""
        api.push(
            op_id="ack-evt-1",
            op_type="card.create",
            payload={"id": "ack-card", "front": "Q", "back": "A"},
            client_id="writer"
        )

        api.pull(since=1, limit=10, client_id="reader")
        rows = db_helper.query("SELECT last_seen_cursor FROM sync_client_cursors WHERE client_id='reader'")
        assert len(rows) == 1
        assert rows[0][0] >= 1

    def test_pull_clamps_negative_since_and_large_limit(self, server, db_helper):
        """Pull sanitizes untrusted query params and caps large page sizes."""
        conn = sqlite3.connect(server["db"])
        try:
            conn.executemany(
                """
                INSERT INTO sync_operations
                (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at)
                VALUES (?, 'card.create', ?, 1, 'test', 'writer', 1)
                """,
                [(f"bulk-{i}", json.dumps({"id": f"bulk-card-{i}"})) for i in range(1005)]
            )
            conn.commit()
        finally:
            conn.close()

        r = requests.get(f"http://localhost:{server['port']}/sync/pull?since=-99&limit=5000")
        result = r.json()

        assert result["ok"] is True
        assert len(result["operations"]) == 1000
        assert result["hasMore"] is True
        assert result["nextCursor"] == 1000


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Request Hardening
# ═════════════════════════════════════════════════════════════════════════════

class TestRequestHardening:

    def test_auth_token_rejects_missing_or_wrong_bearer_and_accepts_valid(self, server_factory):
        srv = server_factory({"SYNC_API_TOKEN": "secret-token"})
        url = f"http://localhost:{srv['port']}/sync/pull"

        missing = requests.get(url)
        wrong = requests.get(url, headers={"Authorization": "Bearer wrong-token"})
        valid = requests.get(url, headers={"Authorization": "Bearer secret-token"})

        assert missing.status_code == 401
        assert missing.json()["error"] == "unauthorized"
        assert wrong.status_code == 401
        assert valid.status_code == 200
        assert valid.json()["ok"] is True

    def test_invalid_json_and_non_object_body_return_400(self, server):
        url = f"http://localhost:{server['port']}/sync"

        invalid = requests.post(url, data="{not-json", headers={"Content-Type": "application/json"})
        non_object = requests.post(url, json=[])

        assert invalid.status_code == 400
        assert invalid.json()["error"] == "invalid_json"
        assert non_object.status_code == 400
        assert non_object.json()["error"] == "invalid_json_object"

    def test_oversized_json_body_returns_413(self, server_factory):
        srv = server_factory({"SYNC_MAX_BODY_BYTES": "32"})
        url = f"http://localhost:{srv['port']}/sync"

        response = requests.post(
            url,
            data=json.dumps({"opId": "big", "type": "card.create", "payload": {"front": "x" * 100}}),
            headers={"Content-Type": "application/json"},
        )

        assert response.status_code == 413
        assert response.json()["error"] == "payload_too_large"

    def test_cors_allowlist_echoes_allowed_origin_and_sets_vary(self, server_factory):
        srv = server_factory({"SYNC_CORS_ALLOWED_ORIGINS": "https://cards.example,https://other.example"})
        url = f"http://localhost:{srv['port']}/sync"

        allowed = requests.options(url, headers={"Origin": "https://cards.example"})
        fallback = requests.options(url, headers={"Origin": "https://not-allowed.example"})

        assert allowed.status_code == 204
        assert allowed.headers["Access-Control-Allow-Origin"] == "https://cards.example"
        assert allowed.headers["Vary"] == "Origin"
        assert fallback.headers["Access-Control-Allow-Origin"] == "https://cards.example"


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Rebuild & Snapshot
# ═════════════════════════════════════════════════════════════════════════════

class TestRebuildAndSnapshot:
    
    def test_rebuild_server_state_reconstructs_decks_and_cards(self, api, db_helper, server):
        """Rebuild reconstructs server_decks and server_cards from sync_operations."""
        db_path = server["db"]
        
        # Push events
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "deck-1", "name": "Math", "source": "pwa"},
            client_id="c1"
        )
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "card-1", "deckId": "deck-1", "noteId": "n1",
                "front": "2+2?", "back": "4", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2"
            },
            client_id="c1"
        )
        
        # Clear server state manually
        conn = sqlite3.connect(db_path)
        conn.execute("DELETE FROM server_decks")
        conn.execute("DELETE FROM server_cards")
        conn.commit()
        conn.close()
        
        # Verify cleared
        assert db_helper.count("server_decks") == 0
        assert db_helper.count("server_cards") == 0
        
        # Rebuild
        from sync_server import rebuild_server_state
        conn = sqlite3.connect(db_path)
        rebuild_server_state(conn)
        conn.close()
        
        # Verify reconstructed
        assert db_helper.count("server_decks") >= 1
        assert db_helper.count("server_cards") >= 1
    
    def test_snapshot_returns_active_decks_and_cards(self, api):
        """Snapshot delivers server state with active entities."""
        # Setup: create deck and card
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "deck-snap", "name": "TestDeck", "source": "test"},
            client_id="c1"
        )
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "card-snap", "deckId": "deck-snap", "noteId": "n1",
                "front": "Front", "back": "Back", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2"
            },
            client_id="c1"
        )
        
        # Get snapshot
        result = api.snapshot("test-client")
        
        assert result["ok"] is True
        assert result["cursor"] > 0
        assert isinstance(result["decks"], list)
        assert isinstance(result["cards"], list)
        assert any(d["id"] == "deck-snap" for d in result["decks"])
        assert any(c["id"] == "card-snap" for c in result["cards"])

    def test_snapshot_normalizes_null_card_fields(self, api):
        """Snapshot must normalize legacy cards that have null scheduling/algorithm fields."""
        api.push(
            op_id="d-null",
            op_type="deck.create",
            payload={"id": "deck-null", "name": "NullDeck", "source": "test"},
            client_id="c1"
        )
        # Minimal payload reproduces legacy/incomplete server row with many NULL columns.
        api.push(
            op_id="c-null",
            op_type="card.create",
            payload={
                "id": "card-null",
                "noteId": "n-null",
                "deckId": "deck-null",
                "front": "Q",
                "back": "A"
            },
            client_id="c1"
        )

        result = api.snapshot("snap-null-check")
        card = next(c for c in result["cards"] if c["id"] == "card-null")

        assert card["type"] == 0
        assert card["queue"] == 0
        assert isinstance(card["due"], int)
        assert isinstance(card["dueAt"], int)
        assert card["algorithm"] == "sm2"
        assert card["isDeleted"] is False

    def test_snapshot_defaults_algorithm_to_sm2_when_missing_even_with_fsrs_metrics(self, api, db_helper):
        """Snapshot default policy is strict: only explicit 'fsrs' keeps fsrs, otherwise sm2."""
        now = int(time.time() * 1000)
        db_helper.query(
            f"""
            INSERT INTO server_cards
            (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at,
             interval, factor, stability, difficulty, reps, lapses, algorithm, metadata_json,
             is_deleted, created_at, updated_at, deleted_at, last_source_client)
            VALUES
            ('card-algo-default', 'n-algo', 'deck-missing', 'Q', 'A', '[]', '{{}}', NULL, NULL, NULL, NULL,
             NULL, NULL, 5.5, 7.1, NULL, NULL, NULL, NULL,
             0, {now}, {now}, NULL, 'seed')
            """
        )

        result = api.snapshot("snap-algo-default")
        card = next(c for c in result["cards"] if c["id"] == "card-algo-default")
        assert card["algorithm"] == "sm2"
        assert card["type"] == 0
        assert card["queue"] == 0
        assert isinstance(card["due"], int)
        assert isinstance(card["dueAt"], int)


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Payload Mapping
# ═════════════════════════════════════════════════════════════════════════════

class TestPayloadMapping:
    
    def test_deck_delete_uses_deckid_not_id(self, api, db_helper):
        """deck.delete uses payload.deckId, not payload.id."""
        # Create deck
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "deck-del", "name": "ToDelete", "source": "test", "timestamp": 1000},
            client_id="c1"
        )
        
        # Delete with deckId
        api.push(
            op_id="d-del",
            op_type="deck.delete",
            payload={"deckId": "deck-del", "cardIds": [], "timestamp": 2000},
            client_id="c1"
        )
        
        # Verify deleted_at is set
        rows = db_helper.query("SELECT deleted_at FROM server_decks WHERE id='deck-del'")
        assert len(rows) == 1
        assert rows[0][0] is not None
    
    def test_card_update_uses_cardid_and_updates(self, api, db_helper):
        """card.update uses cardId + updates object."""
        # Create card
        api.push(
            op_id="c-create",
            op_type="card.create",
            payload={
                "id": "card-upd", "deckId": "d1", "noteId": "n1",
                "front": "Original", "back": "Back", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="c1"
        )
        
        # Update with cardId + updates
        api.push(
            op_id="c-upd",
            op_type="card.update",
            payload={
                "cardId": "card-upd",
                "updates": {"front": "Updated", "interval": 7},
                "timestamp": 2000
            },
            client_id="c1"
        )
        
        # Verify updates applied
        rows = db_helper.query("SELECT front, interval FROM server_cards WHERE id='card-upd'")
        assert len(rows) == 1
        assert rows[0][0] == "Updated"
        assert rows[0][1] == 7

    def test_force_tomorrow_operation_applies_like_card_update(self, api, db_helper):
        """card.schedule.forceTomorrow accepts the PWA's singular update payload."""
        api.push(
            op_id="force-base",
            op_type="card.create",
            payload={
                "id": "force-card", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 10, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 1, "lapses": 0, "algorithm": "sm2", "updatedAt": 1000
            },
            client_id="c1",
            client_timestamp=1000
        )

        api.push(
            op_id="force-op",
            op_type="card.schedule.forceTomorrow",
            payload={
                "cardId": "force-card",
                "update": {"type": 2, "queue": 2, "due": 99, "dueAt": 99000, "updatedAt": 2000},
                "timestamp": 2000
            },
            client_id="c1",
            client_timestamp=2000
        )

        rows = db_helper.query("SELECT type, queue, due, due_at, updated_at FROM server_cards WHERE id='force-card'")
        assert rows[0] == (2, 2, 99, 99000, 2000)
    
    def test_card_delete_uses_cardid(self, api, db_helper):
        """card.delete uses cardId field."""
        # Create card
        api.push(
            op_id="c-create",
            op_type="card.create",
            payload={
                "id": "card-del", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="c1"
        )
        
        # Delete with cardId
        api.push(
            op_id="c-del",
            op_type="card.delete",
            payload={"cardId": "card-del", "timestamp": 2000},
            client_id="c1"
        )
        
        # Verify deleted_at
        rows = db_helper.query("SELECT deleted_at FROM server_cards WHERE id='card-del'")
        assert len(rows) == 1
        assert rows[0][0] is not None

    def test_delete_event_payload_is_enriched_with_deletedat(self, api, db_helper):
        """Delete events get deletedAt in persisted payload when client omitted it."""
        api.push(
            op_id="c-del-enrich",
            op_type="card.delete",
            payload={"cardId": "missing-card-ts"},
            client_id="c1",
            client_timestamp=7777
        )

        rows = db_helper.query("SELECT payload_json FROM sync_operations WHERE op_id='c-del-enrich'")
        assert len(rows) == 1
        payload = json.loads(rows[0][0])
        assert payload["cardId"] == "missing-card-ts"
        assert payload["deletedAt"] == 7777

    def test_card_delete_applies_payload_deletedat_to_tombstone(self, api, db_helper):
        """card.delete uses payload.deletedAt as tombstone timestamp when present."""
        api.push(
            op_id="c-create-del-ts",
            op_type="card.create",
            payload={
                "id": "card-del-ts", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="c1"
        )

        api.push(
            op_id="c-del-ts",
            op_type="card.delete",
            payload={"cardId": "card-del-ts", "deletedAt": 8888},
            client_id="c1",
            client_timestamp=9999
        )

        rows = db_helper.query("SELECT deleted_at, updated_at FROM server_cards WHERE id='card-del-ts'")
        assert len(rows) == 1
        assert rows[0][0] == 8888
        assert rows[0][1] == 8888


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Review Operations
# ═════════════════════════════════════════════════════════════════════════════

class TestReviewOperations:
    
    def test_review_updates_all_scheduling_fields(self, api, db_helper):
        """Review applies all scheduling fields including dueAt, stability, difficulty, algorithm."""
        # Create card
        api.push(
            op_id="c-create",
            op_type="card.create",
            payload={
                "id": "card-rev", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="c1"
        )
        
        # Review
        api.push(
            op_id="rev-1",
            op_type="review",
            payload={
                "cardId": "card-rev",
                "updated": {
                    "type": 1, "queue": 2, "due": 105,
                    "dueAt": 2000, "interval": 2, "factor": 2600,
                    "stability": 2.0, "difficulty": 0.3, "retrievability": 0.91, "reps": 1, "lapses": 0,
                    "algorithm": "sm2"
                }
            },
            client_id="c1"
        )
        
        # Verify all fields
        rows = db_helper.query(
            "SELECT type, queue, due, due_at, interval, factor, stability, difficulty, retrievability, reps, lapses, algorithm "
            "FROM server_cards WHERE id='card-rev'"
        )
        assert len(rows) == 1
        assert rows[0][0] == 1  # type
        assert rows[0][2] == 105  # due
        assert rows[0][3] == 2000  # due_at
        assert rows[0][5] == 2600  # factor
        assert rows[0][6] == 2.0  # stability
        assert rows[0][7] == 0.3  # difficulty
        assert rows[0][8] == 0.91  # retrievability
    
    def test_review_undo_restores_all_scheduling_fields(self, api, db_helper):
        """review.undo restores all scheduling fields."""
        # Create card
        api.push(
            op_id="c-create",
            op_type="card.create",
            payload={
                "id": "card-undo", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="c1"
        )
        
        # Undo with restored state
        api.push(
            op_id="undo-1",
            op_type="review.undo",
            payload={
                "cardId": "card-undo",
                "restored": {
                    "type": 0, "queue": 1, "due": 50,
                    "dueAt": 500, "interval": 0, "factor": 2500,
                    "stability": 0.5, "difficulty": 1.0, "reps": 0, "lapses": 0,
                    "algorithm": "sm2"
                }
            },
            client_id="c1"
        )
        
        # Verify restored
        rows = db_helper.query("SELECT due, due_at, stability, difficulty FROM server_cards WHERE id='card-undo'")
        assert rows[0][0] == 50  # due
        assert rows[0][1] == 500  # due_at
        assert rows[0][2] == 0.5  # stability
        assert rows[0][3] == 1.0  # difficulty

    def test_review_undo_can_restore_lower_reps_and_hides_undone_review_from_snapshot(self, api, db_helper):
        """Undo is a compensating action; lower restored reps must not be blocked as stale."""
        api.push(
            op_id="undo-history-card",
            op_type="card.create",
            payload={
                "id": "undo-history", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "updatedAt": 1000
            },
            client_id="c1",
            client_timestamp=1000
        )
        api.push(
            op_id="undo-history-review-1",
            op_type="review",
            payload={
                "cardId": "undo-history",
                "rating": 3,
                "timeMs": 800,
                "timestamp": 2000,
                "updated": {
                    "type": 2, "queue": 2, "due": 2, "dueAt": 20,
                    "interval": 1, "factor": 2500, "stability": 1.1, "difficulty": 0.4,
                    "reps": 1, "lapses": 0, "algorithm": "sm2", "updatedAt": 2000
                }
            },
            client_id="c1",
            client_timestamp=2000
        )
        api.push(
            op_id="undo-history-review-2",
            op_type="review",
            payload={
                "cardId": "undo-history",
                "rating": 4,
                "timeMs": 900,
                "timestamp": 3000,
                "updated": {
                    "type": 2, "queue": 2, "due": 3, "dueAt": 30,
                    "interval": 2, "factor": 2500, "stability": 1.3, "difficulty": 0.3,
                    "reps": 2, "lapses": 0, "algorithm": "sm2", "updatedAt": 3000
                }
            },
            client_id="c1",
            client_timestamp=3000
        )

        api.push(
            op_id="undo-history-undo",
            op_type="review.undo",
            payload={
                "cardId": "undo-history",
                "timestamp": 4000,
                "restored": {
                    "type": 2, "queue": 2, "due": 2, "dueAt": 20,
                    "interval": 1, "factor": 2500, "stability": 1.1, "difficulty": 0.4,
                    "reps": 1, "lapses": 0, "algorithm": "sm2", "updatedAt": 4000
                }
            },
            client_id="c1",
            client_timestamp=4000
        )

        rows = db_helper.query("SELECT reps, due, due_at, updated_at FROM server_cards WHERE id='undo-history'")
        assert rows[0] == (1, 2, 20, 4000)

        review_rows = db_helper.query(
            "SELECT review_op_id, undone_at FROM server_reviews WHERE card_id='undo-history' ORDER BY reviewed_at"
        )
        assert review_rows == [
            ("undo-history-review-1", None),
            ("undo-history-review-2", 4000),
        ]

        snap = api.snapshot("undo-history-client")
        review_ids = [review["opId"] for review in snap["reviews"]]
        assert "undo-history-review-1" in review_ids
        assert "undo-history-review-2" not in review_ids


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Last-Write-Wins (LWW)
# ═════════════════════════════════════════════════════════════════════════════

class TestLWW:
    
    def test_lww_newer_update_wins(self, api, db_helper):
        """Newer timestamp overwrites older."""
        # Create card
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "card-lww1", "deckId": "d1", "noteId": "n1",
                "front": "Initial", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 500
            },
            client_id="c1"
        )
        
        # Old update
        api.push(
            op_id="u1",
            op_type="card.update",
            payload={
                "cardId": "card-lww1",
                "updates": {"front": "OLDER"},
                "timestamp": 1000
            },
            client_id="c1"
        )
        
        # New update
        api.push(
            op_id="u2",
            op_type="card.update",
            payload={
                "cardId": "card-lww1",
                "updates": {"front": "NEWER"},
                "timestamp": 2000
            },
            client_id="c1"
        )
        
        # Newer should win
        rows = db_helper.query("SELECT front FROM server_cards WHERE id='card-lww1'")
        assert rows[0][0] == "NEWER"
    
    def test_lww_older_update_does_not_overwrite_newer(self, api, db_helper):
        """Old update arriving after new does not revert state."""
        # Create card
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "card-lww2", "deckId": "d1", "noteId": "n1",
                "front": "Init", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 500
            },
            client_id="c1"
        )
        
        # New update first
        api.push(
            op_id="u1",
            op_type="card.update",
            payload={
                "cardId": "card-lww2",
                "updates": {"front": "NEW"},
                "timestamp": 2000
            },
            client_id="c1"
        )
        
        # Old update arrives later
        api.push(
            op_id="u2",
            op_type="card.update",
            payload={
                "cardId": "card-lww2",
                "updates": {"front": "OLD"},
                "timestamp": 1000
            },
            client_id="c1"
        )
        
        # Newer should still be there
        rows = db_helper.query("SELECT front FROM server_cards WHERE id='card-lww2'")
        assert rows[0][0] == "NEW"
    
    def test_tie_breaker_by_source_client_when_timestamps_equal(self, api, db_helper):
        """Equal timestamps: lexicographically larger source_client wins."""
        # Create card
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "card-tie", "deckId": "d1", "noteId": "n1",
                "front": "Init", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 500
            },
            client_id="c1"
        )
        
        # Update from client-A (smaller)
        api.push(
            op_id="u1",
            op_type="card.update",
            payload={
                "cardId": "card-tie",
                "updates": {"front": "A-value"},
                "timestamp": 5000
            },
            client_id="client-A"
        )
        
        # Update from client-B (larger) at same timestamp
        api.push(
            op_id="u2",
            op_type="card.update",
            payload={
                "cardId": "card-tie",
                "updates": {"front": "B-value"},
                "timestamp": 5000
            },
            client_id="client-B"
        )
        
        # client-B should win (lexicographically >= client-A)
        rows = db_helper.query("SELECT front FROM server_cards WHERE id='card-tie'")
        assert rows[0][0] == "B-value"

    def test_reps_first_wins_even_when_timestamp_is_older(self, api, db_helper):
        """Conflict rule: higher reps wins before timestamp comparison."""
        api.push(
            op_id="c-reps-base",
            op_type="card.create",
            payload={
                "id": "card-reps", "deckId": "d1", "noteId": "n1",
                "front": "base", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 3, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 5, "lapses": 0, "algorithm": "sm2", "timestamp": 5000
            },
            client_id="c1"
        )

        # Newer timestamp, lower reps -> should NOT win.
        api.push(
            op_id="u-reps-lower-newer",
            op_type="card.update",
            payload={
                "cardId": "card-reps",
                "updates": {"front": "newer-lower-reps", "reps": 4},
                "timestamp": 7000
            },
            client_id="c1"
        )

        # Older timestamp, higher reps -> should win.
        api.push(
            op_id="u-reps-higher-older",
            op_type="card.update",
            payload={
                "cardId": "card-reps",
                "updates": {"front": "older-higher-reps", "reps": 6},
                "timestamp": 6000
            },
            client_id="c1"
        )

        rows = db_helper.query("SELECT front, reps, updated_at FROM server_cards WHERE id='card-reps'")
        assert rows[0][0] == "older-higher-reps"
        assert rows[0][1] == 6
        assert rows[0][2] == 6000


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Progress Reset (globaler Lernfortschritt-Reset)
# ═════════════════════════════════════════════════════════════════════════════

class TestProgressReset:

    def test_progress_reset_resets_cards_and_clears_reviews(self, api, db_helper):
        """progress.reset bypasses higher-reps-wins and clears review history."""
        api.push(
            op_id="pr-create",
            op_type="card.create",
            payload={
                "id": "pr-card", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 120, "dueAt": 120 * 86400000,
                "interval": 3, "factor": 2600, "stability": 2.5, "difficulty": 4.0,
                "reps": 5, "lapses": 1, "algorithm": "fsrs", "updatedAt": 1000
            },
            client_id="c1",
            client_timestamp=1000
        )
        api.push(
            op_id="pr-review",
            op_type="review",
            payload={
                "cardId": "pr-card", "rating": 3, "timeMs": 1200, "timestamp": 1500,
                "updated": {
                    "type": 2, "queue": 2, "due": 125, "dueAt": 125 * 86400000,
                    "interval": 5, "factor": 2600, "reps": 6, "lapses": 1,
                    "algorithm": "fsrs", "updatedAt": 1500
                }
            },
            client_id="c1",
            client_timestamp=1500
        )
        assert db_helper.count("server_reviews") == 1

        # A plain card.update with reps=0 would be rejected (higher reps wins) —
        # progress.reset must apply anyway.
        api.push(
            op_id="pr-reset",
            op_type="progress.reset",
            payload={"timestamp": 2000, "due": 200, "dueAt": 200 * 86400000},
            client_id="c1",
            client_timestamp=2000
        )

        rows = db_helper.query(
            "SELECT type, queue, due, due_at, interval, factor, stability, difficulty, reps, lapses, updated_at "
            "FROM server_cards WHERE id='pr-card'"
        )
        assert rows[0] == (0, 0, 200, 200 * 86400000, 0, 2500, None, None, 0, 0, 2000)
        assert db_helper.count("server_reviews") == 0

    def test_progress_reset_keeps_cards_updated_after_reset_timestamp(self, api, db_helper):
        """Cards written after the reset moment stay untouched (per-card LWW)."""
        api.push(
            op_id="pr-newer-create",
            op_type="card.create",
            payload={
                "id": "pr-newer", "deckId": "d1", "noteId": "n2",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 130, "dueAt": 130 * 86400000,
                "interval": 4, "factor": 2500, "stability": 1.0, "difficulty": 3.0,
                "reps": 2, "lapses": 0, "algorithm": "sm2", "updatedAt": 3000
            },
            client_id="c1",
            client_timestamp=3000
        )

        api.push(
            op_id="pr-reset-older",
            op_type="progress.reset",
            payload={"timestamp": 2500, "due": 200, "dueAt": 200 * 86400000},
            client_id="c2",
            client_timestamp=2500
        )

        rows = db_helper.query("SELECT reps, interval, updated_at FROM server_cards WHERE id='pr-newer'")
        assert rows[0] == (2, 4, 3000)


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Tombstones & Snapshot Filtering
# ═════════════════════════════════════════════════════════════════════════════

class TestTombstones:
    
    def test_snapshot_excludes_tombstoned_entities_by_default(self, api):
        """Deleted entities absent from default snapshot."""
        # Create and delete
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "tombstone-deck", "name": "Temp", "source": "test", "timestamp": 1000},
            client_id="c1"
        )
        api.push(
            op_id="d-del",
            op_type="deck.delete",
            payload={"deckId": "tombstone-deck", "timestamp": 2000},
            client_id="c1"
        )
        
        # Snapshot
        result = api.snapshot("test-client", include_deleted=False)
        deck_ids = [d["id"] for d in result["decks"]]
        assert "tombstone-deck" not in deck_ids
    
    def test_snapshot_can_include_tombstones_when_requested(self, api):
        """With includeDeleted=true, tombstones appear."""
        # Create and delete
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "tombstone-deck2", "name": "Temp", "source": "test", "timestamp": 1000},
            client_id="c1"
        )
        api.push(
            op_id="d-del",
            op_type="deck.delete",
            payload={"deckId": "tombstone-deck2", "timestamp": 2000},
            client_id="c1"
        )
        
        # Snapshot with includeDeleted
        result = api.snapshot("test-client", include_deleted=True)
        decks = [d for d in result["decks"] if d["id"] == "tombstone-deck2"]
        assert len(decks) == 1
        assert decks[0]["deletedAt"] is not None


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Recovery Scenarios
# ═════════════════════════════════════════════════════════════════════════════

class TestRecovery:
    
    def test_recovery_scenario_for_empty_client(self, api):
        """Typical recovery: new client gets snapshot of existing state."""
        # Setup server state
        api.push(
            op_id="d1",
            op_type="deck.create",
            payload={"id": "recovery-deck", "name": "Recovered", "source": "test", "timestamp": 1000},
            client_id="setup"
        )
        api.push(
            op_id="c1",
            op_type="card.create",
            payload={
                "id": "recovery-card", "deckId": "recovery-deck", "noteId": "n1",
                "front": "Recoverable", "back": "Data", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "timestamp": 1000
            },
            client_id="setup"
        )
        
        # New client handshake
        hs = api.handshake(
            client_id="empty-client",
            last_cursor=0,
            local_counts={"cards": 0, "decks": 0}
        )
        
        assert hs["needsSnapshot"] is True
        
        # Get snapshot
        snap = api.snapshot("empty-client")
        assert snap["ok"] is True
        assert any(d["id"] == "recovery-deck" for d in snap["decks"])
        assert any(c["id"] == "recovery-card" for c in snap["cards"])


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Profile List & Switching
# ═════════════════════════════════════════════════════════════════════════════

class TestProfileSwitch:

    def test_create_profile_accepts_profile_name(self, api):
        result = api.create_profile(device_id="dev-profile-1", profile_name="Anna")

        assert result["ok"] is True
        assert result["existingProfile"] is False
        assert result["userId"]
        assert result["profileToken"].startswith("dt_")
        assert result["profileName"] == "Anna"

    def test_pairing_code_can_link_second_device(self, api):
        created = api.create_profile(device_id="pair-dev-1", profile_name="Pair Source")
        issued = api.issue_pairing_code(created["profileToken"])

        assert issued["ok"] is True
        assert issued["code"]

        redeemed = api.redeem_pairing_code(issued["code"], "pair-dev-2", "Tablet")

        assert redeemed["ok"] is True
        assert redeemed["userId"] == created["userId"]
        assert redeemed["deviceId"] == "pair-dev-2"
        assert redeemed["profileToken"].startswith("dt_")

    def test_recovery_code_can_link_new_device(self, api):
        created = api.create_profile(device_id="recover-dev-1", profile_name="Recover Source")

        recovered = api.recover_profile(created["recoveryCode"], "recover-dev-2", "Laptop")

        assert recovered["ok"] is True
        assert recovered["userId"] == created["userId"]
        assert recovered["deviceId"] == "recover-dev-2"
        assert recovered["profileToken"].startswith("dt_")

    def test_create_profile_rejects_existing_device_without_authenticating_it(self, api, db_helper, server):
        first = api.create_profile(device_id="same-device", profile_name="Visible Again")
        second_response = requests.post(
            f"http://localhost:{server['port']}/auth/profile",
            json={"deviceId": "same-device", "deviceLabel": "Device", "profileName": "Ignored New Name"},
        )
        second = second_response.json()

        assert first["ok"] is True
        assert second_response.status_code == 409
        assert second["ok"] is False
        assert second["error"] == "device_already_linked"
        assert second["userId"] == first["userId"]
        assert second["profileName"] == "Visible Again"
        assert "profileToken" not in second

        non_default_users = db_helper.query("SELECT COUNT(*) FROM users WHERE profile_name != 'Default'")
        ignored_profiles = db_helper.query("SELECT COUNT(*) FROM users WHERE profile_name='Ignored New Name'")
        devices = db_helper.query("SELECT COUNT(*) FROM devices WHERE device_id='same-device'")
        active_tokens = db_helper.query(
            "SELECT COUNT(*) FROM device_tokens WHERE device_id='same-device' AND revoked_at IS NULL"
        )
        assert non_default_users[0][0] == 1
        assert ignored_profiles[0][0] == 0
        assert devices[0][0] == 1
        assert active_tokens[0][0] == 1

    def test_public_profile_join_relinks_existing_device_without_fk_conflict(self, api, db_helper):
        first = api.create_profile(device_id="rejoin-device", profile_name="First")
        second = api.create_profile(device_id="target-device", profile_name="Target")

        joined = api.join_public_profile(
            user_id=second["userId"],
            device_id="rejoin-device",
            device_label="Browser",
        )

        assert joined["ok"] is True
        assert joined["userId"] == second["userId"]
        assert joined["deviceId"] == "rejoin-device"
        assert joined["profileToken"].startswith("dt_")
        assert joined["profileToken"] != first["profileToken"]

        device_rows = db_helper.query(
            "SELECT user_id FROM devices WHERE device_id='rejoin-device'"
        )
        active_tokens = db_helper.query(
            "SELECT COUNT(*) FROM device_tokens WHERE device_id='rejoin-device' AND revoked_at IS NULL"
        )
        revoked_old_tokens = db_helper.query(
            "SELECT COUNT(*) FROM device_tokens WHERE device_id='rejoin-device' AND revoked_at IS NOT NULL"
        )

        assert device_rows == [(second["userId"],)]
        assert active_tokens[0][0] == 1
        assert revoked_old_tokens[0][0] >= 1

    def test_public_profiles_requires_authentication(self, api, server):
        created = api.create_profile(device_id="pub-auth-dev", profile_name="PubAuth")
        base = f"http://localhost:{server['port']}"

        anonymous = requests.get(f"{base}/auth/public-profiles")
        assert anonymous.status_code == 401
        assert anonymous.json()["error"] == "unauthorized"

        authed = requests.get(
            f"{base}/auth/public-profiles",
            headers={"Authorization": f"Bearer {created['profileToken']}"},
        )
        assert authed.status_code == 200
        assert authed.json()["ok"] is True

    def test_profile_join_personal_requires_pin(self, api, server):
        target = api.create_profile(device_id="pin-target-dev", profile_name="PinTarget")
        base = f"http://localhost:{server['port']}"

        without_pin = requests.post(f"{base}/auth/profile/join", json={
            "userId": target["userId"], "deviceId": "pin-join-dev", "deviceLabel": "Browser",
        })
        assert without_pin.status_code == 403
        assert without_pin.json()["error"] == "join_pin_invalid"

        wrong_pin = requests.post(f"{base}/auth/profile/join", json={
            "userId": target["userId"], "deviceId": "pin-join-dev", "deviceLabel": "Browser",
            "joinPin": "0000",
        })
        assert wrong_pin.status_code == 403
        assert wrong_pin.json()["error"] == "join_pin_invalid"

        correct_pin = api.join_public_profile(
            user_id=target["userId"], device_id="pin-join-dev",
        )
        assert correct_pin["ok"] is True
        assert correct_pin["userId"] == target["userId"]

    def test_profile_join_default_profile_needs_no_pin(self, api, server, db_helper):
        default_rows = db_helper.query(
            "SELECT user_id FROM users WHERE TRIM(profile_name)='Default' LIMIT 1"
        )
        assert default_rows, "Default profile should exist after schema init"
        default_user_id = default_rows[0][0]

        joined = api.join_public_profile(
            user_id=default_user_id, device_id="default-join-dev", join_pin=None,
        )
        assert joined["ok"] is True
        assert joined["userId"] == default_user_id

    def test_profile_join_fails_closed_without_configured_pin(self, server_factory, db_helper):
        srv = server_factory({"SYNC_JOIN_PIN": ""})
        base = f"http://localhost:{srv['port']}"

        created = requests.post(f"{base}/auth/profile", json={
            "deviceId": "closed-owner-dev", "profileName": "Closed",
        }).json()

        denied = requests.post(f"{base}/auth/profile/join", json={
            "userId": created["userId"], "deviceId": "closed-join-dev", "deviceLabel": "Browser",
            "joinPin": "anything",
        })
        assert denied.status_code == 403
        assert denied.json()["error"] == "join_pin_not_configured"

    def test_list_profiles_returns_profile_metadata(self, api):
        created = api.create_profile(device_id="dev-profile-2", profile_name="Ben")
        user_id = created["userId"]

        listed = api.list_profiles(limit=10, auth_token=created["profileToken"])
        assert listed["ok"] is True
        match = next((p for p in listed["profiles"] if p["userId"] == user_id), None)
        assert match is not None
        assert match["profileName"] == "Ben"
        assert isinstance(match["linkedDevicesCount"], int)
        assert len(listed["profiles"]) == 1

    def test_list_profiles_requires_authentication(self, api, server):
        api.create_profile(device_id="dev-profile-auth", profile_name="Auth")

        r = requests.get(f"http://localhost:{server['port']}/auth/profiles", params={"limit": 10})

        assert r.status_code == 401
        assert r.json()["error"] == "unauthorized"

    def test_sync_requires_device_token_after_profile_exists(self, api, server):
        api.create_profile(device_id="auth-dev-1", profile_name="Auth Required")
        base = f"http://localhost:{server['port']}"

        pull = requests.get(f"{base}/sync/pull", params={"since": 0, "clientId": "anon"})
        snapshot = requests.get(f"{base}/sync/snapshot", params={"clientId": "anon"})
        push = requests.post(
            f"{base}/sync",
            json={
                "opId": "anon-op",
                "type": "deck.create",
                "payload": {"id": "anon-deck", "name": "Anon"},
                "clientId": "anon",
                "clientTimestamp": 1,
            },
        )

        assert pull.status_code == 401
        assert snapshot.status_code == 401
        assert push.status_code == 401

    def test_handshake_requests_snapshot_when_local_decks_are_missing(self, api):
        created = api.create_profile(device_id="missing-decks-dev", profile_name="Missing Decks")
        token = created["profileToken"]

        api.push(
            op_id="missing-decks-deck",
            op_type="deck.create",
            payload={"id": "server-deck", "name": "Server Deck", "source": "manual", "createdAt": 1000, "updatedAt": 1000},
            client_id="server-client",
            client_timestamp=1000,
            auth_token=token,
        )
        api.push(
            op_id="missing-decks-card",
            op_type="card.create",
            payload={
                "id": "server-card",
                "deckId": "server-deck",
                "noteId": "server-note",
                "front": "Q",
                "back": "A",
                "tags": [],
                "extra": {},
                "type": 0,
                "queue": 0,
                "due": 0,
                "dueAt": 0,
                "interval": 0,
                "factor": 2500,
                "reps": 0,
                "lapses": 0,
                "algorithm": "sm2",
                "createdAt": 1000,
                "updatedAt": 1000,
            },
            client_id="server-client",
            client_timestamp=1000,
            auth_token=token,
        )

        handshake = api.handshake(
            client_id="client-with-cards-no-decks",
            local_counts={"cards": 1, "decks": 0},
            auth_token=token,
        )

        assert handshake["ok"] is True
        assert handshake["needsSnapshot"] is True
        assert handshake["needsClientBootstrapUpload"] is False

    def test_same_ids_are_isolated_between_profiles_and_rebuild(self, api, server):
        first = api.create_profile(device_id="scoped-dev-1", profile_name="First")
        second = api.create_profile(device_id="scoped-dev-2", profile_name="Second")

        shared_deck_id = "shared-import-deck"
        shared_card_id = "shared-import-card"

        def push_profile(token, suffix, ts):
            api.push(
                op_id=f"deck-{suffix}",
                op_type="deck.create",
                payload={
                    "id": shared_deck_id,
                    "name": f"Deck {suffix}",
                    "source": "anki-import",
                    "createdAt": ts,
                    "updatedAt": ts,
                },
                client_id=f"client-{suffix}",
                client_timestamp=ts,
                auth_token=token,
            )
            api.push(
                op_id=f"card-{suffix}",
                op_type="card.create",
                payload={
                    "id": shared_card_id,
                    "deckId": shared_deck_id,
                    "noteId": f"note-{suffix}",
                    "front": f"Front {suffix}",
                    "back": f"Back {suffix}",
                    "tags": [],
                    "extra": {},
                    "type": 0,
                    "queue": 0,
                    "due": 0,
                    "dueAt": 0,
                    "interval": 0,
                    "factor": 2500,
                    "reps": 0,
                    "lapses": 0,
                    "algorithm": "sm2",
                    "createdAt": ts,
                    "updatedAt": ts,
                },
                client_id=f"client-{suffix}",
                client_timestamp=ts,
                auth_token=token,
            )

        push_profile(first["profileToken"], "A", 1000)
        push_profile(second["profileToken"], "B", 2000)

        snap_first = api.snapshot("reader-a", auth_token=first["profileToken"])
        snap_second = api.snapshot("reader-b", auth_token=second["profileToken"])
        decks_first = api.list_decks(auth_token=first["profileToken"])
        decks_second = api.list_decks(auth_token=second["profileToken"])

        assert [deck["name"] for deck in snap_first["decks"]] == ["Deck A"]
        assert [deck["name"] for deck in snap_second["decks"]] == ["Deck B"]
        assert [deck["name"] for deck in decks_first["decks"]] == ["Deck A"]
        assert [deck["name"] for deck in decks_second["decks"]] == ["Deck B"]
        assert [card["front"] for card in snap_first["cards"]] == ["Front A"]
        assert [card["front"] for card in snap_second["cards"]] == ["Front B"]

        from server import config as server_config
        old_db_path = server_config.DB_PATH
        server_config.DB_PATH = server["db"]
        conn = sync_server.open_db()
        try:
            sync_server.rebuild_server_state(conn)
        finally:
            conn.close()
            server_config.DB_PATH = old_db_path

        rebuilt_first = api.snapshot("reader-a2", auth_token=first["profileToken"])
        rebuilt_second = api.snapshot("reader-b2", auth_token=second["profileToken"])

        assert [deck["name"] for deck in rebuilt_first["decks"]] == ["Deck A"]
        assert [deck["name"] for deck in rebuilt_second["decks"]] == ["Deck B"]
        assert [card["front"] for card in rebuilt_first["cards"]] == ["Front A"]
        assert [card["front"] for card in rebuilt_second["cards"]] == ["Front B"]

    def test_sync_deck_listing_and_snapshot_hide_empty_decks(self, api):
        created = api.create_profile(device_id="non-empty-dev", profile_name="Non Empty")
        token = created["profileToken"]

        api.push(
            op_id="empty-deck",
            op_type="deck.create",
            payload={"id": "empty-deck", "name": "Empty", "source": "manual", "createdAt": 1000, "updatedAt": 1000},
            client_id="client-a",
            client_timestamp=1000,
            auth_token=token,
        )
        api.push(
            op_id="parent-deck",
            op_type="deck.create",
            payload={"id": "parent-deck", "name": "Parent", "source": "manual", "createdAt": 1000, "updatedAt": 1000},
            client_id="client-a",
            client_timestamp=1000,
            auth_token=token,
        )
        api.push(
            op_id="child-deck",
            op_type="deck.create",
            payload={
                "id": "child-deck",
                "name": "Child",
                "parentDeckId": "parent-deck",
                "source": "manual",
                "createdAt": 1000,
                "updatedAt": 1000,
            },
            client_id="client-a",
            client_timestamp=1000,
            auth_token=token,
        )
        api.push(
            op_id="child-card",
            op_type="card.create",
            payload={
                "id": "child-card",
                "deckId": "child-deck",
                "noteId": "note-child",
                "front": "Q",
                "back": "A",
                "tags": [],
                "extra": {},
                "type": 0,
                "queue": 0,
                "due": 0,
                "dueAt": 0,
                "interval": 0,
                "factor": 2500,
                "reps": 0,
                "lapses": 0,
                "algorithm": "sm2",
                "createdAt": 1000,
                "updatedAt": 1000,
            },
            client_id="client-a",
            client_timestamp=1000,
            auth_token=token,
        )

        listed = api.list_decks(auth_token=token)
        snapshot = api.snapshot("non-empty-reader", auth_token=token)

        assert {deck["id"] for deck in listed["decks"]} == {"parent-deck", "child-deck"}
        assert {deck["id"] for deck in snapshot["decks"]} == {"parent-deck", "child-deck"}

    def test_same_profile_second_device_sees_progress_and_review_history(self, api):
        first = api.create_profile(device_id="progress-dev-a", profile_name="Progress")
        second = api.switch_profile(
            user_id=first["userId"],
            device_id="progress-dev-b",
            device_label="Phone",
            auth_token=first["profileToken"],
        )

        api.push(
            op_id="progress-deck",
            op_type="deck.create",
            payload={"id": "progress-deck", "name": "Progress Deck", "source": "manual", "createdAt": 1000, "updatedAt": 1000},
            client_id="laptop",
            client_timestamp=1000,
            auth_token=first["profileToken"],
        )
        api.push(
            op_id="progress-card",
            op_type="card.create",
            payload={
                "id": "progress-card",
                "deckId": "progress-deck",
                "noteId": "progress-note",
                "front": "Q",
                "back": "A",
                "tags": [],
                "extra": {},
                "type": 0,
                "queue": 0,
                "due": 0,
                "dueAt": 0,
                "interval": 0,
                "factor": 2500,
                "reps": 0,
                "lapses": 0,
                "algorithm": "sm2",
                "createdAt": 1000,
                "updatedAt": 1000,
            },
            client_id="laptop",
            client_timestamp=1000,
            auth_token=first["profileToken"],
        )
        api.push(
            op_id="progress-review-1",
            op_type="review",
            payload={
                "cardId": "progress-card",
                "rating": 4,
                "timeMs": 1200,
                "timestamp": 2000,
                "updated": {
                    "type": 2,
                    "queue": 2,
                    "due": 3,
                    "dueAt": 3000,
                    "interval": 2,
                    "factor": 2600,
                    "reps": 1,
                    "lapses": 0,
                    "algorithm": "sm2",
                    "updatedAt": 2000,
                },
            },
            client_id="laptop",
            client_timestamp=2000,
            auth_token=first["profileToken"],
        )

        snap = api.snapshot("phone", auth_token=second["profileToken"])

        assert snap["ok"] is True
        assert [deck["id"] for deck in snap["decks"]] == ["progress-deck"]
        card = next(card for card in snap["cards"] if card["id"] == "progress-card")
        assert card["reps"] == 1
        assert card["factor"] == 2600
        review = next(review for review in snap["reviews"] if review["opId"] == "progress-review-1")
        assert review["rating"] == 4
        assert review["timeMs"] == 1200

    def test_switch_profile_forbids_switching_to_different_profile(self, api, server):
        first = api.create_profile(device_id="switch-dev-1", profile_name="First")
        second = api.create_profile(device_id="switch-dev-2", profile_name="Second")

        r = requests.post(
            f"http://localhost:{server['port']}/auth/profile/switch",
            json={
                "userId": second["userId"],
                "deviceId": "switch-dev-1",
                "deviceLabel": "Tablet",
            },
            headers={"Authorization": f"Bearer {first['profileToken']}"},
        )

        assert r.status_code == 403
        assert r.json()["error"] == "forbidden_profile_switch"
    
    def test_snapshot_after_rebuild_not_empty_with_entities_in_log(self, api, db_helper):
        """After rebuild, snapshot contains reconstructed entities."""
        # Push events
        api.push(
            op_id="d-evt",
            op_type="deck.create",
            payload={"id": "rebuild-deck", "name": "Rebuilt", "source": "test"},
            client_id="c1"
        )
        api.push(
            op_id="c-evt",
            op_type="card.create",
            payload={
                "id": "rebuild-card", "deckId": "rebuild-deck", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 100, "dueAt": 1000,
                "interval": 1, "factor": 2500, "stability": 1.5, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2"
            },
            client_id="c1"
        )
        
        # Verify entities in state
        snap = api.snapshot("test-client")
        assert any(d["id"] == "rebuild-deck" for d in snap["decks"])
        assert any(c["id"] == "rebuild-card" for c in snap["cards"])


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Startup Flags
# ═════════════════════════════════════════════════════════════════════════════

class TestStartupFlags:

    def test_env_truthy_accepts_expected_true_values(self):
        from sync_server import env_truthy
        for value in ["1", "true", "TRUE", "yes", "on", 1, True]:
            assert env_truthy(value) is True

    def test_env_truthy_rejects_expected_false_values(self):
        from sync_server import env_truthy
        for value in ["0", "false", "FALSE", "no", "off", "", 0, False, None]:
            assert env_truthy(value) is False

    def test_init_db_migrates_legacy_card_schema_before_creating_new_indexes(self):
        """Legacy DBs without new card columns can still initialize cleanly."""
        with tempfile.NamedTemporaryFile(suffix=".db", delete=False) as f:
            db_path = f.name

        conn = sqlite3.connect(db_path)
        try:
            conn.execute("""
                CREATE TABLE server_decks (
                  id TEXT PRIMARY KEY,
                  name TEXT,
                  created_at INTEGER,
                  source TEXT,
                  updated_at INTEGER NOT NULL,
                  deleted_at INTEGER NULL,
                  last_source_client TEXT
                )
            """)
            conn.execute("""
                CREATE TABLE server_cards (
                  id TEXT PRIMARY KEY,
                  note_id TEXT,
                  deck_id TEXT,
                  front TEXT,
                  back TEXT,
                  tags_json TEXT,
                  extra_json TEXT,
                  type INTEGER,
                  queue INTEGER,
                  due INTEGER,
                  due_at INTEGER,
                  interval INTEGER,
                  factor INTEGER,
                  stability REAL,
                  difficulty REAL,
                  reps INTEGER,
                  lapses INTEGER,
                  algorithm TEXT,
                  created_at INTEGER,
                  updated_at INTEGER NOT NULL,
                  deleted_at INTEGER NULL,
                  last_source_client TEXT
                )
            """)
            conn.commit()
        finally:
            conn.close()

        import sync_server
        from server import config as server_config
        original_db_path = server_config.DB_PATH
        try:
            server_config.DB_PATH = db_path
            sync_server.init_db()

            conn = sqlite3.connect(db_path)
            try:
                card_cols = [row[1] for row in conn.execute("PRAGMA table_info(server_cards)").fetchall()]
                card_indexes = [row[1] for row in conn.execute("PRAGMA index_list(server_cards)").fetchall()]
                review_table = conn.execute(
                    "SELECT name FROM sqlite_master WHERE type='table' AND name='server_reviews'"
                ).fetchone()
            finally:
                conn.close()

            assert "metadata_json" in card_cols
            assert "is_deleted" in card_cols
            assert "retrievability" in card_cols
            assert "idx_card_snapshot_active" in card_indexes
            assert review_table is not None
        finally:
            server_config.DB_PATH = original_db_path
            if os.path.exists(db_path):
                os.remove(db_path)


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Bootstrap Upload
# ═════════════════════════════════════════════════════════════════════════════

class TestBootstrapUpload:

    def test_shuffle_collection_push_roundtrip_appears_in_snapshot(self, api, db_helper):
        result = api.push(
            op_id="shuffle-upsert-1",
            op_type="shuffleCollection.upsert",
            payload={
                "id": "shuffle_a",
                "name": "Mixed",
                "deckIds": ["deck-1", "deck-2"],
                "createdAt": 1000,
                "updatedAt": 2000,
            },
            client_id="client-a",
            client_timestamp=2000,
        )

        assert result["ok"] is True
        rows = db_helper.query("SELECT name, deck_ids_json FROM server_shuffle_collections WHERE id='shuffle_a'")
        assert len(rows) == 1
        assert rows[0][0] == "Mixed"
        assert json.loads(rows[0][1]) == ["deck-1", "deck-2"]

        snap = api.snapshot("reader")
        assert snap["ok"] is True
        assert snap["shuffleCollections"] == [{
            "id": "shuffle_a",
            "name": "Mixed",
            "deckIds": ["deck-1", "deck-2"],
            "createdAt": 1000,
            "updatedAt": 2000,
            "isDeleted": False,
            "deletedAt": None,
            "lastSourceClient": "client-a",
        }]

    def test_video_note_push_roundtrip_appears_in_snapshot(self, api, db_helper):
        result = api.push(
            op_id="video-note-upsert-1",
            op_type="videoNote.upsert",
            payload={
                "profileId": "user-video",
                "objective": "1.1",
                "videoId": "video-1.mp4",
                "content": "Meine Notiz #tag",
                "tags": ["tag"],
                "createdAt": 1000,
                "updatedAt": 2000,
            },
            client_id="client-video",
            client_timestamp=2000,
        )

        assert result["ok"] is True
        rows = db_helper.query("SELECT content, tags_json FROM server_video_notes WHERE profile_id='user-video' AND objective='1.1'")
        assert len(rows) == 1
        assert rows[0][0] == "Meine Notiz #tag"
        assert json.loads(rows[0][1]) == ["tag"]

        snap = api.snapshot("reader")
        assert snap["ok"] is True
        assert snap["videoNotes"] == [{
            "profileId": "user-video",
            "objective": "1.1",
            "videoId": "video-1.mp4",
            "content": "Meine Notiz #tag",
            "tags": ["tag"],
            "createdAt": 1000,
            "updatedAt": 2000,
            "isDeleted": False,
            "deletedAt": None,
            "lastSourceClient": "client-video",
        }]

    def test_video_note_delete_removes_note_from_active_snapshot(self, api, db_helper):
        api.push(
            op_id="video-note-upsert-delete-source",
            op_type="videoNote.upsert",
            payload={
                "profileId": "user-video",
                "objective": "1.2",
                "videoId": "video-2.mp4",
                "content": "Wird gelöscht",
                "tags": [],
                "createdAt": 1000,
                "updatedAt": 2000,
            },
            client_id="client-video",
            client_timestamp=2000,
        )
        result = api.push(
            op_id="video-note-delete-1",
            op_type="videoNote.delete",
            payload={
                "profileId": "user-video",
                "objective": "1.2",
                "deletedAt": 3000,
                "updatedAt": 3000,
            },
            client_id="client-video",
            client_timestamp=3000,
        )

        assert result["ok"] is True
        rows = db_helper.query("SELECT deleted_at FROM server_video_notes WHERE profile_id='user-video' AND objective='1.2'")
        assert rows == [(3000,)]

        snap = api.snapshot("reader")
        assert snap["videoNotes"] == []

        deleted_snap = api.snapshot("reader", include_deleted=True)
        assert deleted_snap["videoNotes"][0]["isDeleted"] is True
        assert deleted_snap["videoNotes"][0]["deletedAt"] == 3000

    def test_bootstrap_upload_inserts_state_and_returns_summary(self, api, db_helper):
        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-1",
            sent_at=5000,
            decks=[{"id": "deck-boot", "name": "Boot", "createdAt": 4000, "updatedAt": 5000}],
            cards=[{
                "id": "card-boot", "deckId": "deck-boot", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2",
                "createdAt": 4000, "updatedAt": 5000
            }],
        )

        assert result["ok"] is True
        assert result["batchId"] == "batch-1"
        assert result["summary"]["decksInserted"] == 1
        assert result["summary"]["cardsInserted"] == 1
        assert result["summary"]["shuffleCollectionsInserted"] == 0
        assert result["serverCursor"] > 0
        assert db_helper.count("server_decks") == 1
        assert db_helper.count("server_cards") == 1

    def test_bootstrap_upload_includes_shuffle_collections(self, api, db_helper):
        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-shuffle",
            sent_at=6000,
            shuffle_collections=[{
                "id": "shuffle_boot",
                "name": "Boot Mix",
                "deckIds": ["deck-boot"],
                "createdAt": 5000,
                "updatedAt": 6000
            }],
        )

        assert result["ok"] is True
        assert result["summary"]["shuffleCollectionsInserted"] == 1
        assert db_helper.count("server_shuffle_collections") == 1

        snap = api.snapshot("reader")
        assert [entry["id"] for entry in snap["shuffleCollections"]] == ["shuffle_boot"]

    def test_bootstrap_upload_includes_video_notes(self, api, db_helper):
        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-video-notes",
            sent_at=6000,
            video_notes=[{
                "profileId": "boot-user",
                "objective": "2.1",
                "videoId": "video-boot.mp4",
                "content": "Boot Note #boot",
                "tags": ["boot"],
                "createdAt": 5000,
                "updatedAt": 6000,
            }],
        )

        assert result["ok"] is True
        assert result["summary"]["videoNotesInserted"] == 1
        assert db_helper.count("server_video_notes") == 1

        snap = api.snapshot("reader")
        assert [entry["objective"] for entry in snap["videoNotes"]] == ["2.1"]

    def test_bootstrap_upload_includes_review_history(self, api, db_helper):
        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-reviews",
            sent_at=7000,
            decks=[{"id": "deck-boot", "name": "Boot", "createdAt": 4000, "updatedAt": 5000}],
            cards=[{
                "id": "card-boot", "deckId": "deck-boot", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 1, "lapses": 0, "algorithm": "sm2",
                "createdAt": 4000, "updatedAt": 5000
            }],
            reviews=[{
                "opId": "bootstrap-review-1",
                "cardId": "card-boot",
                "rating": 4,
                "timeMs": 1200,
                "timestamp": 6500,
                "sourceClient": "origin-a",
                "createdAt": 6500,
            }],
        )

        assert result["ok"] is True
        assert result["summary"]["reviewsInserted"] == 1
        assert db_helper.count("server_reviews") == 1

        snap = api.snapshot("reader")
        review = next(entry for entry in snap["reviews"] if entry["opId"] == "bootstrap-review-1")
        assert review["cardId"] == "card-boot"
        assert review["rating"] == 4
        assert review["timeMs"] == 1200
        assert review["timestamp"] == 6500

    def test_bootstrap_upload_is_idempotent_for_duplicate_batch(self, api, db_helper):
        payload_decks = [{"id": "deck-dup", "name": "Dup", "createdAt": 1000, "updatedAt": 1000}]
        payload_cards = [{
            "id": "card-dup", "deckId": "deck-dup", "noteId": "n1",
            "front": "Q", "back": "A", "tags": [], "extra": {},
            "type": 0, "queue": 2, "due": 1, "dueAt": 10,
            "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
            "reps": 0, "lapses": 0, "algorithm": "sm2",
            "createdAt": 1000, "updatedAt": 1000
        }]
        payload_reviews = [{
            "opId": "dup-review-1",
            "cardId": "card-dup",
            "rating": 3,
            "timeMs": 900,
            "timestamp": 1100,
        }]

        r1 = api.bootstrap_upload("boot-client", "batch-dup", decks=payload_decks, cards=payload_cards, reviews=payload_reviews, sent_at=1000)
        r2 = api.bootstrap_upload("boot-client", "batch-dup", decks=payload_decks, cards=payload_cards, reviews=payload_reviews, sent_at=1000)

        assert r1["ok"] is True
        assert r2["ok"] is True
        assert r2["summary"] == r1["summary"]
        assert r2["serverCursor"] == r1["serverCursor"]
        assert db_helper.count("sync_bootstrap_batches") == 1
        assert db_helper.count("server_decks") == 1
        assert db_helper.count("server_cards") == 1
        assert db_helper.count("server_reviews") == 1

    def test_bootstrap_upload_skips_older_card_when_server_has_newer(self, api, db_helper):
        api.push(
            op_id="pre-newer",
            op_type="card.create",
            payload={
                "id": "card-lww-boot", "deckId": "d1", "noteId": "n1",
                "front": "server-newer", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "updatedAt": 9000
            },
            client_id="client-z",
            client_timestamp=9000
        )

        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-lww",
            sent_at=2000,
            cards=[{
                "id": "card-lww-boot", "deckId": "d1", "noteId": "n1",
                "front": "bootstrap-older", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2",
                "createdAt": 1000, "updatedAt": 2000
            }],
        )

        assert result["ok"] is True
        assert result["summary"]["cardsSkippedOlder"] == 1
        rows = db_helper.query("SELECT front, updated_at FROM server_cards WHERE id='card-lww-boot'")
        assert len(rows) == 1
        assert rows[0][0] == "server-newer"
        assert rows[0][1] == 9000

    def test_bootstrap_upload_respects_reps_first_rule(self, api, db_helper):
        api.push(
            op_id="pre-reps-base",
            op_type="card.create",
            payload={
                "id": "card-boot-reps", "deckId": "d1", "noteId": "n1",
                "front": "server-base", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 5, "lapses": 0, "algorithm": "sm2", "updatedAt": 9000
            },
            client_id="client-z",
            client_timestamp=9000
        )

        result = api.bootstrap_upload(
            client_id="boot-client",
            batch_id="batch-reps-first",
            sent_at=8000,
            cards=[{
                "id": "card-boot-reps", "deckId": "d1", "noteId": "n1",
                "front": "bootstrap-higher-reps", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 6, "lapses": 0, "algorithm": "sm2",
                "createdAt": 7000, "updatedAt": 8000
            }],
        )

        assert result["ok"] is True
        assert result["summary"]["cardsSkippedOlder"] == 0
        rows = db_helper.query("SELECT front, reps, updated_at FROM server_cards WHERE id='card-boot-reps'")
        assert len(rows) == 1
        assert rows[0][0] == "bootstrap-higher-reps"
        assert rows[0][1] == 6
        assert rows[0][2] == 8000

    def test_snapshot_returns_retrievability_when_present(self, api):
        api.push(
            op_id="card-retr",
            op_type="card.create",
            payload={
                "id": "card-retr", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 2, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "retrievability": 0.77,
                "reps": 3, "lapses": 0, "algorithm": "fsrs", "updatedAt": 5000
            },
            client_id="c1",
            client_timestamp=5000
        )

        snap = api.snapshot("retr-client")
        card = next(c for c in snap["cards"] if c["id"] == "card-retr")
        assert card["retrievability"] == 0.77

    def test_snapshot_returns_materialized_review_history(self, api):
        api.push(
            op_id="review-history-card",
            op_type="card.create",
            payload={
                "id": "card-history", "deckId": "d1", "noteId": "n1",
                "front": "Q", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 1, "dueAt": 10,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "updatedAt": 1000
            },
            client_id="c1",
            client_timestamp=1000
        )
        api.push(
            op_id="review-history-1",
            op_type="review",
            payload={
                "cardId": "card-history",
                "rating": 4,
                "timeMs": 1200,
                "timestamp": 2000,
                "updated": {"type": 2, "queue": 2, "due": 2, "dueAt": 20, "reps": 1, "updatedAt": 2000}
            },
            client_id="c1",
            client_timestamp=2000
        )

        snap = api.snapshot("history-client")
        review = next(r for r in snap["reviews"] if r["opId"] == "review-history-1")
        assert review["cardId"] == "card-history"
        assert review["rating"] == 4
        assert review["timeMs"] == 1200
        assert review["timestamp"] == 2000


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Offline Merge End-to-End
# ═════════════════════════════════════════════════════════════════════════════

class TestOfflineMerge:

    def test_offline_merge_two_clients_converge(self, api):
        # A creates initial card while B is offline.
        api.push(
            op_id="a-create-1",
            op_type="card.create",
            payload={
                "id": "merge-c1", "deckId": "d1", "noteId": "n1",
                "front": "Q0", "back": "A", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 10, "dueAt": 100,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "updatedAt": 1000
            },
            client_id="client-A",
            client_timestamp=1000
        )

        # B comes online, syncs A event and records cursor.
        b_pull_1 = api.pull(since=0, limit=100, client_id="client-B")
        b_cursor = b_pull_1["nextCursor"]
        assert any(op["opId"] == "a-create-1" for op in b_pull_1["operations"])

        # B updates card while A is offline.
        api.push(
            op_id="b-update-1",
            op_type="card.update",
            payload={"cardId": "merge-c1", "updates": {"front": "Q1"}, "timestamp": 2000},
            client_id="client-B",
            client_timestamp=2000
        )

        # A reconnects and sees B's update.
        a_pull_1 = api.pull(since=0, limit=100, client_id="client-A")
        assert any(op["opId"] == "b-update-1" for op in a_pull_1["operations"])

        # A goes offline again and performs delete + create with newer timestamps.
        api.push(
            op_id="a-del-1",
            op_type="card.delete",
            payload={"cardId": "merge-c1", "deletedAt": 3000},
            client_id="client-A",
            client_timestamp=3000
        )
        api.push(
            op_id="a-create-2",
            op_type="card.create",
            payload={
                "id": "merge-c2", "deckId": "d1", "noteId": "n2",
                "front": "Q2", "back": "B", "tags": [], "extra": {},
                "type": 0, "queue": 2, "due": 20, "dueAt": 200,
                "interval": 1, "factor": 2500, "stability": 1.0, "difficulty": 0.5,
                "reps": 0, "lapses": 0, "algorithm": "sm2", "updatedAt": 3100
            },
            client_id="client-A",
            client_timestamp=3100
        )

        # B reconnects from its old cursor and receives only A's new operations.
        b_pull_2 = api.pull(since=b_cursor, limit=100, client_id="client-B")
        b_ops = [op["opId"] for op in b_pull_2["operations"]]
        assert "a-del-1" in b_ops
        assert "a-create-2" in b_ops
        assert "b-update-1" not in b_ops

        # Final convergence check from authoritative server snapshot.
        snap = api.snapshot("auditor", include_deleted=True)
        cards_by_id = {c["id"]: c for c in snap["cards"]}
        assert cards_by_id["merge-c1"]["deletedAt"] == 3000
        assert cards_by_id["merge-c2"]["deletedAt"] is None
        assert cards_by_id["merge-c2"]["front"] == "Q2"


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Event Log Retention / GC
# ═════════════════════════════════════════════════════════════════════════════

class TestEventLogGc:

    def test_gc_skips_when_no_known_client_cursors(self, api, db_helper, server):
        for i in range(3):
            api.push(
                op_id=f"gc-no-cursor-{i}",
                op_type="card.create",
                payload={"id": f"gc-card-no-cursor-{i}", "front": "Q", "back": "A"},
                client_id="writer"
            )

        db_helper.query("UPDATE sync_operations SET created_at=1")

        from sync_server import gc_sync_operations
        conn = sqlite3.connect(server["db"])
        stats = gc_sync_operations(conn, retention_days=30, min_remaining=0, safety_window=0)
        conn.close()

        assert stats["deleted"] == 0
        assert stats["reason"] == "no-client-cursors"
        assert db_helper.count("sync_operations") == 3

    def test_gc_deletes_old_events_after_all_clients_advanced(self, api, db_helper, server):
        for i in range(5):
            api.push(
                op_id=f"gc-cursor-{i}",
                op_type="card.create",
                payload={"id": f"gc-card-{i}", "front": "Q", "back": "A"},
                client_id="writer"
            )

        max_id = db_helper.query("SELECT MAX(id) FROM sync_operations")[0][0]
        db_helper.query("UPDATE sync_operations SET created_at=1")
        db_helper.query(
            f"INSERT OR REPLACE INTO sync_client_cursors (client_id, last_seen_cursor, updated_at) VALUES ('reader', {max_id}, 1)"
        )

        from sync_server import gc_sync_operations
        conn = sqlite3.connect(server["db"])
        stats = gc_sync_operations(conn, retention_days=30, min_remaining=0, safety_window=0)
        conn.close()

        assert stats["reason"] == "ok"
        assert stats["deleted"] == max_id
        assert db_helper.count("sync_operations") == 0


# ═════════════════════════════════════════════════════════════════════════════
# Tests: Web Push Daily Motivation
# ═════════════════════════════════════════════════════════════════════════════

class TestWebPushMotivation:

    def test_daily_motivation_rotation_is_deterministic_and_changes_by_day(self):
        from server.push.motivation import build_daily_motivation_payload

        first = build_daily_motivation_payload("de", "2026-07-08", "endpoint-A")
        repeated = build_daily_motivation_payload("de", "2026-07-08", "endpoint-A")
        week = [
            build_daily_motivation_payload("de", f"2026-07-{day:02d}", "endpoint-A")
            for day in range(8, 15)
        ]

        assert first == repeated
        assert first["channel"] == "dailyMotivation"
        assert first["tag"] == "card-pwa-daily-motivation"
        assert first["url"] == "/?view=study"
        assert first["body"]
        assert len({item["messageIndex"] for item in week}) > 1

    def test_push_subscribe_stores_subscription_preferences(self, server, db_helper):
        body = {
            "subscription": {
                "endpoint": "https://push.example.test/subscription/test-device",
                "keys": {
                    "p256dh": "public-key",
                    "auth": "auth-secret",
                },
            },
            "clientId": "client-push-test",
            "language": "de",
            "timezone": "Europe/Berlin",
            "reminders": {
                "enabled": True,
                "time": "07:45",
            },
            "userAgent": "pytest",
        }

        response = requests.post(f"http://localhost:{server['port']}/push/subscribe", json=body, timeout=2)
        assert response.status_code == 200
        assert response.json()["ok"] is True

        rows = db_helper.query(
            """
            SELECT endpoint, client_id, language, timezone, daily_time, daily_enabled, disabled_at
            FROM push_subscriptions
            WHERE endpoint='https://push.example.test/subscription/test-device'
            """
        )
        assert len(rows) == 1
        assert rows[0][1] == "client-push-test"
        assert rows[0][2] == "de"
        assert rows[0][3] == "Europe/Berlin"
        assert rows[0][4] == "07:45"
        assert rows[0][5] == 1
        assert rows[0][6] is None


class TestMotivationSlots:
    """Slot-Logik für mehrere Motivations-Pushes pro Tag (reine Unit-Tests)."""

    def test_effective_slot_times_merges_daily_time(self):
        from datetime import datetime, timezone as tz
        from server.push.motivation import compute_due_slot_index, effective_slot_times

        slots = effective_slot_times("08:30,13:00", "20:00")
        assert slots == ["08:30", "13:00", "20:00"]
        # Leere Zusatz-Slots => altes Verhalten (nur daily_time)
        assert effective_slot_times("", "20:00") == ["20:00"]

        def at(hour):
            return datetime(2026, 7, 9, hour, 0, tzinfo=tz.utc)

        assert compute_due_slot_index(at(7), "UTC", slots) is None
        assert compute_due_slot_index(at(9), "UTC", slots) == 0
        assert compute_due_slot_index(at(14), "UTC", slots) == 1
        assert compute_due_slot_index(at(21), "UTC", slots) == 2

    def test_parse_last_sent_slot_formats(self):
        from server.push.motivation import parse_last_sent_slot

        assert parse_last_sent_slot("2026-07-09#1", "2026-07-09") == 1
        assert parse_last_sent_slot("2026-07-08#2", "2026-07-09") == -1
        assert parse_last_sent_slot(None, "2026-07-09") == -1
        # Altformat ohne Slot: konservativ als "heute fertig" werten
        assert parse_last_sent_slot("2026-07-09", "2026-07-09") >= 2

    def test_consecutive_slots_pick_different_messages(self):
        from server.push.motivation import select_daily_motivation

        picks = [
            select_daily_motivation("de", "2026-07-09", "endpoint-x", slot=s)["messageIndex"]
            for s in range(3)
        ]
        assert picks[0] != picks[1]
        assert picks[1] != picks[2]
        # Deterministisch: gleicher Input, gleicher Spruch
        again = select_daily_motivation("de", "2026-07-09", "endpoint-x", slot=2)
        assert again["messageIndex"] == picks[2]


if __name__ == "__main__":
    pytest.main([__file__, "-v"])

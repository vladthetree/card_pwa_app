"""Sync routes: pull/push of operations, bootstrap upload, handshake, deck
listing, snapshot, and the health probe.
"""
import json
import sqlite3
import time
from urllib.parse import urlparse, parse_qs

from server.config import HEALTH_LOG_EVERY_MS, LOGGER
from server.common.helpers import (
  client_short as _client_short,
  env_int,
  now_ms,
  parse_int,
)
from server.logging_setup import log, _LAST_HEALTH_LOG_BY_IP
from server.db.connection import open_db
from server.db.profile_scope import scope_user_id
from server.content_review import (
  GATEWAY_SOURCE,
  GATEWAY_SOURCE_CLIENT,
  gate_bootstrap_card,
  gate_sync_card_operation,
)
from server.domain.card_catalog import (
  active_reference_count,
  catalog_content_from_row,
  catalog_enabled,
  catalog_row,
  canonical_owner_id,
  ensure_user_card_references,
  is_canonical_owner,
)
from server.domain.decks import (
  active_deck_ids_from_bootstrap_payload,
  active_deck_ids_with_cards_or_descendants,
  ensure_security_deck_hierarchy,
  legacy_messer_deck_delete_payload,
)
from server.sync.operations import (
  apply_operation,
  card_should_apply,
  lww_should_apply,
  _prepare_payload_for_storage,
  _push_detail,
)
from server.db.schema import update_client_cursor


class SyncRoutesMixin:
  def _route_health(self):
    client_ip = self.client_address[0] if self.client_address else "?"
    now = now_ms()
    last = _LAST_HEALTH_LOG_BY_IP.get(client_ip, 0)
    interval_ms = env_int(HEALTH_LOG_EVERY_MS, 60000)
    if interval_ms <= 0 or (now - last) >= interval_ms:
      _LAST_HEALTH_LOG_BY_IP[client_ip] = now
      log(f"HEALTH  ip={client_ip}  status=ok")
    self._send_json(200, {"ok": True, "service": "card-pwa-sync"})

  # ---------------------------------------------------------------------------
  # GET /sync/pull  ?since=0 &limit=200 &clientId=…
  # ---------------------------------------------------------------------------

  def _route_sync_pull(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    since     = parse_int(qs.get("since", ["0"])[0] or "0", 0, min_value=0)
    limit     = parse_int(qs.get("limit", ["200"])[0] or "200", 200, min_value=1, max_value=1000)
    client_id = (qs.get("clientId", [""])[0] or "").strip()
    client_ip = self.client_address[0] if self.client_address else "?"

    conn = open_db(sqlite3.Row)
    try:
      if client_id and since > 0:
        update_client_cursor(conn, client_id, since)
        conn.commit()

      if self._current_user_id and catalog_enabled(conn):
        # Per-user state operations plus globally authoritative Vlad content
        # publications. Learners never receive Vlad's scheduling/review ops.
        user_filter = (
          "AND (user_id=? OR (source=? AND source_client=?))"
        )
        user_params = (
          self._current_user_id,
          GATEWAY_SOURCE,
          GATEWAY_SOURCE_CLIENT,
        )
      else:
        user_filter, user_params = self._user_filter_sql()

      if client_id:
        rows = conn.execute(
          f"""
          SELECT id, op_id, op_type, payload_json, client_timestamp, source, source_client, created_at
          FROM sync_operations
          WHERE id > ? AND (source_client IS NULL OR source_client != ?) {user_filter}
          ORDER BY id ASC LIMIT ?
          """,
          (since, client_id) + user_params + (limit,)
        ).fetchall()
      else:
        rows = conn.execute(
          f"""
          SELECT id, op_id, op_type, payload_json, client_timestamp, source, source_client, created_at
          FROM sync_operations
          WHERE id > ? {user_filter}
          ORDER BY id ASC LIMIT ?
          """,
          (since,) + user_params + (limit,)
        ).fetchall()

      operations  = []
      next_cursor = since
      for r in rows:
        try:
          payload = json.loads(r["payload_json"])
        except Exception:
          payload = None
        operations.append({
          "id":            r["id"],
          "opId":          r["op_id"],
          "type":          r["op_type"],
          "payload":       payload,
          "clientTimestamp": r["client_timestamp"],
          "source":        r["source"],
          "sourceClient":  r["source_client"],
          "createdAt":     r["created_at"],
        })
        next_cursor = max(next_cursor, r["id"])

      self._send_json(200, {
        "ok":         True,
        "operations": operations,
        "nextCursor": next_cursor,
        "hasMore":    len(rows) == limit,
      })
      log(
        f"PULL   ip={client_ip}  client={_client_short(client_id)}  "
        f"since={since}  limit={limit}  returned={len(operations)}  "
        f"next={next_cursor}  hasMore={len(rows) == limit}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /sync
  # ---------------------------------------------------------------------------

  def _route_sync_push(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    idem   = self.headers.get("X-Idempotency-Key", "")

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    op_id         = str(data.get("opId")            or idem).strip()
    op_type       = str(data.get("type")            or "").strip()
    requested_op_type = op_type
    payload       = data.get("payload")
    requested_payload = payload if isinstance(payload, dict) else {}
    client_ts     = data.get("clientTimestamp")
    source        = str(data.get("source")          or "").strip() or None
    source_client = str(data.get("clientId")        or "").strip() or None
    client_ip     = self.client_address[0] if self.client_address else "?"

    if not op_id or not op_type:
      self._send_json(400, {"ok": False, "error": "missing_op_fields"})
      return

    payload = _prepare_payload_for_storage(op_type, payload, client_ts)
    blocked_legacy_deck_payload = (
      legacy_messer_deck_delete_payload(payload, client_ts)
      if op_type == "deck.create" and isinstance(payload, dict)
      else None
    )
    if blocked_legacy_deck_payload:
      op_type = "deck.delete"
      payload = blocked_legacy_deck_payload
      source = "server-maintenance-publish"
      source_client = "server-maintenance-publisher"
      op_id = f"server-maintenance-publish:blocked-legacy-deck:{op_id}"
      client_ts = payload["timestamp"]

    conn = open_db(sqlite3.Row)
    try:
      op_type, payload, content_review_queued = gate_sync_card_operation(
        conn,
        user_id=self._current_user_id,
        op_type=op_type,
        payload=payload,
        op_id=op_id,
        source_client=source_client,
      )
      conn.execute(
        """INSERT INTO sync_operations
           (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (op_id, op_type, json.dumps(payload, ensure_ascii=False),
         client_ts, source, source_client, int(time.time()), self._current_user_id)
      )
      try:
        apply_operation(conn, op_type, payload or {}, client_ts, source_client, op_id=op_id, user_id=self._current_user_id)
        conn.commit()
      except Exception:
        LOGGER.exception("APPLY_FAILED op_id=%s op_type=%s", op_id, op_type)
        conn.rollback()
        self._send_json(500, {"ok": False, "error": "apply_failed"})
        return
      
      detail = _push_detail(op_type, payload)
      log(
        f"PUSH   ip={client_ip}  client={_client_short(source_client)}  "
        f"op={op_type}  stored=1  {detail}"
      )
      self._send_json(200, {
        "ok": True,
        "stored": True,
        "duplicate": False,
        "contentReviewQueued": content_review_queued,
        **self._canonical_card_push_result(
          conn,
          requested_op_type,
          requested_payload,
          self._current_user_id,
        ),
      })
    except sqlite3.IntegrityError:
      log(
        f"PUSH   ip={client_ip}  client={_client_short(source_client)}  "
        f"op={op_type}  stored=0  duplicate=1  op_id={op_id}"
      )
      self._send_json(200, {
        "ok": True,
        "stored": False,
        "duplicate": True,
        **self._canonical_card_push_result(
          conn,
          requested_op_type,
          requested_payload,
          self._current_user_id,
        ),
      })
    finally:
      conn.close()

  @staticmethod
  def _canonical_card_push_result(conn, op_type, payload, user_id):
    """Return canonical content so a writer immediately repairs its local copy."""
    if (
      not catalog_enabled(conn)
      or is_canonical_owner(conn, user_id)
      or op_type not in ("card.create", "card.update", "card.delete")
    ):
      return {}
    card_id = str(payload.get("id") or payload.get("cardId") or "").strip()
    if not card_id:
      return {}
    row = catalog_row(conn, card_id)
    if not row or row["deleted_at"] is not None:
      return {
        "canonicalContentProtected": True,
        "referenceRejected": True,
        "cardId": card_id,
      }
    return {
      "canonicalContentProtected": True,
      "referenceRejected": False,
      "canonicalCard": {
        "id": card_id,
        **(catalog_content_from_row(row) or {}),
      },
    }

  # ---------------------------------------------------------------------------
  # POST /sync/bootstrap/upload
  # ---------------------------------------------------------------------------

  def _route_sync_bootstrap_upload(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    client_id = str(data.get("clientId") or "").strip()
    batch_id = str(data.get("batchId") or "").strip()
    sent_at = parse_int(data.get("sentAt") or now_ms(), now_ms(), min_value=0)
    decks = data.get("decks") or []
    cards = data.get("cards") or []
    reviews = data.get("reviews") or []
    shuffle_collections = data.get("shuffleCollections") or []
    video_notes = data.get("videoNotes") or []
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id or not batch_id:
      self._send_json(400, {"ok": False, "error": "missing_bootstrap_fields"})
      return
    if not isinstance(decks, list) or not isinstance(cards, list) or not isinstance(reviews, list) or not isinstance(shuffle_collections, list) or not isinstance(video_notes, list):
      self._send_json(400, {"ok": False, "error": "invalid_bootstrap_payload"})
      return

    conn = open_db(sqlite3.Row)
    try:
      state_user_id = scope_user_id(self._current_user_id)
      shared_catalog = catalog_enabled(conn)
      catalog_owner = canonical_owner_id(conn) if shared_catalog else None
      if shared_catalog:
        ensure_user_card_references(conn, state_user_id)
      existing_batch = conn.execute(
        "SELECT summary_json, server_cursor FROM sync_bootstrap_batches WHERE batch_id=?",
        (batch_id,)
      ).fetchone()
      if existing_batch:
        try:
          summary = json.loads(existing_batch["summary_json"])
        except Exception:
          summary = {
            "decksInserted": 0,
            "decksUpdated": 0,
            "decksSkippedOlder": 0,
            "cardsInserted": 0,
            "cardsUpdated": 0,
            "cardsSkippedOlder": 0,
            "contentReviewQueued": 0,
            "reviewsInserted": 0,
            "reviewsSkipped": 0,
            "shuffleCollectionsInserted": 0,
            "shuffleCollectionsUpdated": 0,
            "shuffleCollectionsSkippedOlder": 0,
            "shuffleCollectionsRejected": 0,
            "videoNotesInserted": 0,
            "videoNotesUpdated": 0,
            "videoNotesSkippedOlder": 0,
            "videoNotesRejected": 0,
          }
        log(
          f"BOOTSTRAP  ip={client_ip}  client={_client_short(client_id)}  "
          f"batch={batch_id}  duplicate=1"
        )
        self._send_json(200, {
          "ok": True,
          "batchId": batch_id,
          "summary": summary,
          "serverCursor": existing_batch["server_cursor"],
        })
        return

      summary = {
        "decksInserted": 0,
        "decksUpdated": 0,
        "decksSkippedOlder": 0,
        "cardsInserted": 0,
        "cardsUpdated": 0,
        "cardsSkippedOlder": 0,
        "contentReviewQueued": 0,
        "reviewsInserted": 0,
        "reviewsSkipped": 0,
        "shuffleCollectionsInserted": 0,
        "shuffleCollectionsUpdated": 0,
        "shuffleCollectionsSkippedOlder": 0,
        "shuffleCollectionsRejected": 0,
        "videoNotesInserted": 0,
        "videoNotesUpdated": 0,
        "videoNotesSkippedOlder": 0,
        "videoNotesRejected": 0,
      }

      syncable_deck_ids = active_deck_ids_from_bootstrap_payload(decks, cards)

      # Upsert decks with LWW + tombstone support.
      for deck in decks:
        if not isinstance(deck, dict):
          continue
        if shared_catalog and state_user_id != catalog_owner:
          # Deck definitions come from Vlad's canonical hierarchy. Other
          # profiles select card references; they do not create deck copies.
          continue
        deck_id = str(deck.get("id") or "").strip()
        if not deck_id:
          continue
        if deck_id not in syncable_deck_ids and not deck.get("isDeleted") and deck.get("deletedAt") is None:
          continue

        candidate_ts = parse_int(deck.get("updatedAt") or deck.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client FROM server_decks WHERE id=? AND user_id=?",
          (deck_id, state_user_id)
        ).fetchone()
        if existing and not lww_should_apply(existing["updated_at"], existing["last_source_client"], candidate_ts, client_id):
          summary["decksSkippedOlder"] += 1
          continue

        created_at = parse_int(deck.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        deck_deleted_at = deck.get("deletedAt")
        if deck_deleted_at is None and deck.get("isDeleted"):
          deck_deleted_at = candidate_ts
        raw_parent_deck_id = deck.get("parentDeckId", deck.get("parent_deck_id"))
        parent_deck_id = raw_parent_deck_id.strip() if isinstance(raw_parent_deck_id, str) else None
        if parent_deck_id == "":
          parent_deck_id = None
        conn.execute(
          """
          INSERT OR REPLACE INTO server_decks
          (id, name, parent_deck_id, created_at, source, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            deck_id,
            deck.get("name"),
            parent_deck_id,
            created_at,
            deck.get("source"),
            candidate_ts,
            deck_deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["decksUpdated"] += 1
        else:
          summary["decksInserted"] += 1

      ensure_security_deck_hierarchy(conn, state_user_id)

      # Upsert cards with LWW + tombstone support.
      for card in cards:
        if not isinstance(card, dict):
          continue
        card, content_review_queued = gate_bootstrap_card(
          conn,
          user_id=self._current_user_id,
          card=card,
          batch_id=batch_id,
          source_client=client_id,
        )
        if content_review_queued:
          summary["contentReviewQueued"] += 1
        if card is None:
          continue
        card_id = str(card.get("id") or "").strip()
        if not card_id:
          continue

        canonical = catalog_row(conn, card_id) if shared_catalog else None
        if shared_catalog and (not canonical or canonical["deleted_at"] is not None):
          continue

        candidate_ts = parse_int(card.get("updatedAt") or card.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client, reps FROM server_cards WHERE id=? AND user_id=?",
          (card_id, state_user_id)
        ).fetchone()
        if existing and not card_should_apply(existing["updated_at"], existing["last_source_client"], existing["reps"], candidate_ts, client_id, card.get("reps")):
          summary["cardsSkippedOlder"] += 1
          continue

        created_at = parse_int(card.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        tags_json = None if shared_catalog else (json.dumps(card.get("tags", []), ensure_ascii=False) if card.get("tags") is not None else None)
        extra_json = None if shared_catalog else (json.dumps(card.get("extra", {}), ensure_ascii=False) if card.get("extra") is not None else None)
        metadata_json = json.dumps(card.get("metadata"), ensure_ascii=False) if card.get("metadata") is not None else None
        deleted_at = card.get("deletedAt")
        is_deleted = 1 if card.get("isDeleted") or deleted_at is not None else 0

        conn.execute(
          """
          INSERT OR REPLACE INTO server_cards
          (id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, learning_step, last_reviewed_at, interval, factor, stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            card_id,
            None if shared_catalog else card.get("noteId"),
            canonical["deck_id"] if shared_catalog else card.get("deckId"),
            None if shared_catalog else card.get("front"),
            None if shared_catalog else card.get("back"),
            tags_json,
            extra_json,
            card.get("type"),
            card.get("queue"),
            card.get("due"),
            card.get("dueAt"),
            card.get("learningStep"),
            card.get("lastReviewedAt"),
            card.get("interval"),
            card.get("factor"),
            card.get("stability"),
            card.get("difficulty"),
            card.get("retrievability"),
            card.get("reps"),
            card.get("lapses"),
            card.get("algorithm"),
            metadata_json,
            is_deleted,
            created_at,
            candidate_ts,
            deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["cardsUpdated"] += 1
        else:
          summary["cardsInserted"] += 1

      for review in reviews:
        if not isinstance(review, dict):
          summary["reviewsSkipped"] += 1
          continue

        card_id = str(review.get("cardId") or review.get("card_id") or "").strip()
        rating = parse_int(review.get("rating"), None)
        reviewed_at = parse_int(
          review.get("timestamp") or review.get("reviewedAt") or review.get("reviewed_at") or sent_at,
          sent_at,
          min_value=0,
        )
        if not card_id or rating not in (1, 2, 3, 4):
          summary["reviewsSkipped"] += 1
          continue

        card_exists = conn.execute(
          """SELECT 1 FROM server_cards
             WHERE id=? AND user_id=? AND deleted_at IS NULL AND IFNULL(is_deleted, 0) = 0""",
          (card_id, state_user_id)
        ).fetchone()
        if not card_exists:
          summary["reviewsSkipped"] += 1
          continue

        source_client = str(review.get("sourceClient") or review.get("source_client") or client_id).strip() or client_id
        review_op_id = str(review.get("opId") or review.get("reviewOpId") or review.get("review_op_id") or "").strip()
        if not review_op_id:
          review_op_id = f"{source_client}:{card_id}:{reviewed_at}:{rating}"

        existing_review = conn.execute(
          "SELECT 1 FROM server_reviews WHERE review_op_id=?",
          (review_op_id,)
        ).fetchone()
        if existing_review:
          summary["reviewsSkipped"] += 1
          continue

        created_at = parse_int(
          review.get("createdAt") or review.get("created_at") or int(time.time()),
          int(time.time()),
          min_value=0,
        )
        # Antwortdetails (optional): sowohl verschachtelt (`answer`) als auch
        # flach (`selectedAnswer`/…) akzeptieren — Dexie-Export liefert flach.
        answer = review.get("answer") if isinstance(review.get("answer"), dict) else {}
        selected_answer = answer.get("selected") or review.get("selectedAnswer")
        correct_answer = answer.get("correct") or review.get("correctAnswer")
        was_correct = answer.get("wasCorrect") if isinstance(answer.get("wasCorrect"), bool) else review.get("answerCorrect")
        session_run_id = review.get("sessionRunId") or review.get("session_run_id")
        conn.execute(
          """
          INSERT INTO server_reviews
          (review_op_id, card_id, rating, time_ms, reviewed_at, source_client, created_at, undone_at, user_id,
           selected_answer, correct_answer, answer_correct, session_run_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?, ?, ?, ?)
          """,
          (
            review_op_id,
            card_id,
            rating,
            parse_int(review.get("timeMs") or review.get("time_ms"), None),
            reviewed_at,
            source_client,
            created_at,
            state_user_id,
            selected_answer if isinstance(selected_answer, str) else None,
            correct_answer if isinstance(correct_answer, str) else None,
            (1 if was_correct else 0) if isinstance(was_correct, bool) else None,
            session_run_id.strip() if isinstance(session_run_id, str) and session_run_id.strip() else None,
          )
        )
        summary["reviewsInserted"] += 1

      for collection in shuffle_collections:
        if not isinstance(collection, dict):
          summary["shuffleCollectionsRejected"] += 1
          LOGGER.warning(
            "BOOTSTRAP_SHUFFLE_COLLECTION_REJECTED batch=%s reason=invalid_entry_type entry_type=%s",
            batch_id,
            type(collection).__name__,
          )
          continue
        collection_id = str(collection.get("id") or "").strip()
        name = collection.get("name")
        deck_ids = collection.get("deckIds") or []
        normalized_name = name.strip() if isinstance(name, str) else ""
        if not collection_id or not normalized_name or not isinstance(deck_ids, list):
          summary["shuffleCollectionsRejected"] += 1
          LOGGER.warning(
            "BOOTSTRAP_SHUFFLE_COLLECTION_REJECTED batch=%s reason=invalid_payload collection_id=%s has_name=%s deck_ids_type=%s",
            batch_id,
            collection_id,
            bool(normalized_name),
            type(deck_ids).__name__,
          )
          continue

        candidate_ts = parse_int(collection.get("updatedAt") or collection.get("createdAt") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client FROM server_shuffle_collections WHERE id=? AND user_id=?",
          (collection_id, state_user_id)
        ).fetchone()
        if existing and not lww_should_apply(existing["updated_at"], existing["last_source_client"], candidate_ts, client_id):
          summary["shuffleCollectionsSkippedOlder"] += 1
          continue

        created_at = parse_int(collection.get("createdAt") or candidate_ts, candidate_ts, min_value=0)
        deleted_at = collection.get("deletedAt")
        if deleted_at is None and collection.get("isDeleted"):
          deleted_at = candidate_ts

        conn.execute(
          """
          INSERT OR REPLACE INTO server_shuffle_collections
          (id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            collection_id,
            normalized_name,
            json.dumps(deck_ids, ensure_ascii=False),
            created_at,
            candidate_ts,
            deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["shuffleCollectionsUpdated"] += 1
        else:
          summary["shuffleCollectionsInserted"] += 1

      for note in video_notes:
        if not isinstance(note, dict):
          summary["videoNotesRejected"] += 1
          continue

        profile_id = str(note.get("profileId") or note.get("profile_id") or state_user_id or "local").strip()
        objective = str(note.get("objective") or "").strip()
        if not profile_id or not objective:
          summary["videoNotesRejected"] += 1
          continue

        raw_tags = note.get("tags")
        if isinstance(raw_tags, str):
          try:
            raw_tags = json.loads(raw_tags)
          except Exception:
            raw_tags = []
        if not isinstance(raw_tags, list):
          raw_tags = []
        tags = []
        seen_tags = set()
        for entry in raw_tags:
          tag = str(entry or "").strip()
          key = tag.lower()
          if not tag or key in seen_tags:
            continue
          seen_tags.add(key)
          tags.append(tag)

        candidate_ts = parse_int(note.get("updatedAt") or note.get("updated_at") or note.get("createdAt") or note.get("created_at") or sent_at, sent_at, min_value=0)
        existing = conn.execute(
          "SELECT updated_at, last_source_client FROM server_video_notes WHERE profile_id=? AND objective=? AND user_id=?",
          (profile_id, objective, state_user_id)
        ).fetchone()
        if existing and not lww_should_apply(existing["updated_at"], existing["last_source_client"], candidate_ts, client_id):
          summary["videoNotesSkippedOlder"] += 1
          continue

        created_at = parse_int(note.get("createdAt") or note.get("created_at") or candidate_ts, candidate_ts, min_value=0)
        deleted_at = note.get("deletedAt", note.get("deleted_at"))
        if deleted_at is None and note.get("isDeleted"):
          deleted_at = candidate_ts

        conn.execute(
          """
          INSERT OR REPLACE INTO server_video_notes
          (profile_id, objective, video_id, content, tags_json, created_at, updated_at, deleted_at, last_source_client, user_id)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          """,
          (
            profile_id,
            objective,
            str(note.get("videoId", note.get("video_id")) or ""),
            note.get("content") if isinstance(note.get("content"), str) else "",
            json.dumps(tags, ensure_ascii=False),
            created_at,
            candidate_ts,
            deleted_at,
            client_id,
            state_user_id,
          )
        )
        if existing:
          summary["videoNotesUpdated"] += 1
        else:
          summary["videoNotesInserted"] += 1

      # Log a single operation marker to advance server cursor for post-bootstrap pull.
      marker_payload = {
        "batchId": batch_id,
        "decks": len(decks),
        "cards": len(cards),
        "reviews": len(reviews),
        "shuffleCollections": len(shuffle_collections),
        "videoNotes": len(video_notes),
      }
      conn.execute(
        """INSERT INTO sync_operations
           (op_id, op_type, payload_json, client_timestamp, source, source_client, created_at, user_id)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
        (
          f"bootstrap:{batch_id}",
          "bootstrap.upload",
          json.dumps(marker_payload, ensure_ascii=False),
          sent_at,
          "card-pwa",
          client_id,
          int(time.time()),
          state_user_id,
        )
      )

      user_filter, user_params = self._user_filter_sql()
      server_cursor = conn.execute(
        f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
        user_params
      ).fetchone()[0] or 0
      conn.execute(
        """INSERT INTO sync_bootstrap_batches (batch_id, client_id, created_at, summary_json, server_cursor)
           VALUES (?, ?, ?, ?, ?)""",
        (batch_id, client_id, int(time.time()), json.dumps(summary, ensure_ascii=False), server_cursor)
      )
      conn.commit()

      log(
        f"BOOTSTRAP  ip={client_ip}  client={_client_short(client_id)}  batch={batch_id}  "
        f"decks=+{summary['decksInserted']}/={summary['decksUpdated']}/skip={summary['decksSkippedOlder']}  "
        f"cards=+{summary['cardsInserted']}/={summary['cardsUpdated']}/skip={summary['cardsSkippedOlder']}  "
        f"reviews=+{summary['reviewsInserted']}/skip={summary['reviewsSkipped']}  "
        f"shuffle=+{summary['shuffleCollectionsInserted']}/={summary['shuffleCollectionsUpdated']}/skip={summary['shuffleCollectionsSkippedOlder']}/rej={summary['shuffleCollectionsRejected']}  "
        f"videoNotes=+{summary['videoNotesInserted']}/={summary['videoNotesUpdated']}/skip={summary['videoNotesSkippedOlder']}/rej={summary['videoNotesRejected']}"
      )
      self._send_json(200, {
        "ok": True,
        "batchId": batch_id,
        "summary": summary,
        "serverCursor": server_cursor,
      })
    except Exception:
      LOGGER.exception("BOOTSTRAP_FAILED client=%s batch=%s", _client_short(client_id), batch_id)
      conn.rollback()
      self._send_json(500, {"ok": False, "error": "bootstrap_failed"})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # POST /sync/handshake  { clientId, lastCursor?, wantsSnapshot?, localCounts? }
  # ---------------------------------------------------------------------------

  def _route_sync_handshake(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    data, error_status, error_code = self._read_json_body()
    if error_code:
      self._send_json(error_status, {"ok": False, "error": error_code})
      return
    if not isinstance(data, dict):
      self._send_json(400, {"ok": False, "error": "invalid_json_object"})
      return

    client_id = str(data.get("clientId") or "").strip()
    last_cursor = parse_int(data.get("lastCursor") or 0, 0, min_value=0)
    wants_snapshot = bool(data.get("wantsSnapshot", False))
    local_counts = data.get("localCounts", {})
    if not isinstance(local_counts, dict):
      local_counts = {}
    local_cards = parse_int(local_counts.get("cards", 0) or 0, 0, min_value=0)
    local_decks = parse_int(local_counts.get("decks", 0) or 0, 0, min_value=0)
    local_reviews = parse_int(local_counts.get("reviews", 0) or 0, 0, min_value=0)
    local_video_notes = parse_int(local_counts.get("videoNotes", 0) or 0, 0, min_value=0)
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id:
      self._send_json(400, {"ok": False, "error": "missing_client_id"})
      return

    conn = open_db()
    try:
      shared_catalog = catalog_enabled(conn)
      if shared_catalog and self._current_user_id:
        ensure_user_card_references(conn, self._current_user_id)
        conn.commit()
      user_filter, user_params = self._user_filter_sql()
      if shared_catalog and self._current_user_id:
        server_cursor = conn.execute(
          """SELECT MAX(id) FROM sync_operations
             WHERE user_id=? OR (source=? AND source_client=?)""",
          (self._current_user_id, GATEWAY_SOURCE, GATEWAY_SOURCE_CLIENT),
        ).fetchone()[0] or 0
        active_cards = active_reference_count(conn, self._current_user_id)
      else:
        server_cursor = conn.execute(
          f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
          user_params
        ).fetchone()[0] or 0
        active_cards = conn.execute(
          f"SELECT COUNT(*) FROM server_cards WHERE deleted_at IS NULL AND IFNULL(is_deleted, 0) = 0 {user_filter}",
          user_params
        ).fetchone()[0] or 0
      active_decks = len(active_deck_ids_with_cards_or_descendants(conn, self._current_user_id))
      active_reviews = conn.execute(
        f"""SELECT COUNT(*) FROM server_reviews
            WHERE undone_at IS NULL {user_filter}
              AND EXISTS (
                SELECT 1 FROM server_cards c
                WHERE c.id = server_reviews.card_id
                  AND c.user_id = server_reviews.user_id
                  AND c.deleted_at IS NULL
                  AND IFNULL(c.is_deleted, 0) = 0
              )""",
        user_params
      ).fetchone()[0] or 0
      active_video_notes = conn.execute(
        f"SELECT COUNT(*) FROM server_video_notes WHERE deleted_at IS NULL {user_filter}",
        user_params
      ).fetchone()[0] or 0
      needs_snapshot = False
      needs_client_bootstrap_upload = False
      reason = "ok"

      if active_cards == 0 and active_decks == 0 and active_video_notes == 0 and (local_cards > 0 or local_decks > 0 or local_video_notes > 0):
        needs_client_bootstrap_upload = True
        reason = "server-empty-client-has-data"
      elif local_reviews > active_reviews:
        needs_client_bootstrap_upload = True
        reason = "server-missing-client-review-history"
      elif server_cursor < last_cursor:
        # If the server cursor regressed, the op-log no longer guarantees that
        # delta replay is sufficient. Force a snapshot to re-anchor the client.
        needs_snapshot = True
        reason = "server-cursor-regressed"
      elif active_cards > local_cards or active_decks > local_decks or active_video_notes > local_video_notes:
        needs_snapshot = True
        reason = "client-missing-server-data"
      elif wants_snapshot and (active_cards > 0 or active_video_notes > 0):
        needs_snapshot = True
        reason = "explicit-request"

      # Contract guard: both flags must never be true simultaneously.
      if needs_snapshot and needs_client_bootstrap_upload:
        needs_snapshot = False
      
      self._send_json(200, {
        "ok": True,
        "serverCursor": server_cursor,
        "needsSnapshot": needs_snapshot,
        "needsClientBootstrapUpload": needs_client_bootstrap_upload,
        "bootstrapUploadCapabilities": {
          "reviews": True,
          "videoNotes": True,
        },
        "reason": reason,
        "serverCounts": {
          "decks": active_decks,
          "cards": active_cards,
          "reviews": active_reviews,
          "videoNotes": active_video_notes,
        }
      })
      log(
        f"HANDSHAKE  ip={client_ip}  client={_client_short(client_id)}  "
        f"lastCursor={last_cursor}  localCards={local_cards}  localDecks={local_decks}  localReviews={local_reviews}  localVideoNotes={local_video_notes}  "
        f"serverCards={active_cards}  serverDecks={active_decks}  serverReviews={active_reviews}  serverVideoNotes={active_video_notes}  "
        f"needsSnapshot={needs_snapshot}  needsUpload={needs_client_bootstrap_upload}  reason={reason}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /sync/decks
  # ---------------------------------------------------------------------------

  def _route_sync_decks(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    include_deleted = qs.get("includeDeleted", ["false"])[0].lower() in ("true", "1", "yes")
    client_ip = self.client_address[0] if self.client_address else "?"

    conn = open_db(sqlite3.Row)
    try:
      syncable_deck_ids = None if include_deleted else active_deck_ids_with_cards_or_descendants(conn, self._current_user_id)
      if self._current_user_id and catalog_enabled(conn):
        deck_owner = canonical_owner_id(conn)
        user_filter, user_params = ("AND d.user_id = ?", (deck_owner,))
      else:
        user_filter, user_params = self._user_filter_sql("d")
      if include_deleted:
        where_clause = f"WHERE 1=1 {user_filter}"
      else:
        where_clause = f"WHERE d.deleted_at IS NULL {user_filter}"

      rows = conn.execute(
        f"""
        SELECT d.id, d.name, d.parent_deck_id, d.source, d.created_at, d.updated_at, d.deleted_at,
               COALESCE(NULLIF(TRIM(u.profile_name), ''), NULLIF(TRIM(u.display_name), ''), 'Profil ' || SUBSTR(d.user_id, 1, 8)) AS owner_profile_name
        FROM server_decks d
        LEFT JOIN users u ON u.user_id = d.user_id
        {where_clause}
        ORDER BY LOWER(COALESCE(d.name, '')), d.id ASC
        """,
        user_params,
      ).fetchall()

      decks = [{
        "id": row["id"],
        "name": row["name"],
        "parentDeckId": row["parent_deck_id"],
        "source": row["source"],
        "createdAt": row["created_at"],
        "updatedAt": row["updated_at"],
        "isDeleted": row["deleted_at"] is not None,
        "ownerProfileName": row["owner_profile_name"],
      } for row in rows if syncable_deck_ids is None or row["id"] in syncable_deck_ids]

      log(f"SYNC_DECKS  ip={client_ip}  count={len(decks)}")
      self._send_json(200, {"ok": True, "decks": decks})
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # GET /sync/snapshot  ?clientId=… &includeDeleted=…
  # ---------------------------------------------------------------------------

  def _route_sync_snapshot(self):
    if not self._resolve_auth():
      self._send_json(401, {"ok": False, "error": "unauthorized"})
      return

    qs = parse_qs(urlparse(self.path).query)
    client_id = (qs.get("clientId", [""])[0] or "").strip()
    include_deleted = qs.get("includeDeleted", ["false"])[0].lower() in ("true", "1", "yes")
    client_ip = self.client_address[0] if self.client_address else "?"

    if not client_id:
      self._send_json(400, {"ok": False, "error": "missing_client_id"})
      return

    conn = open_db(sqlite3.Row)
    try:
      shared_catalog = catalog_enabled(conn)
      if shared_catalog and self._current_user_id:
        ensure_user_card_references(conn, self._current_user_id)
        conn.commit()
      user_filter, user_params = self._user_filter_sql()
      if shared_catalog and self._current_user_id:
        cursor = conn.execute(
          """SELECT MAX(id) FROM sync_operations
             WHERE user_id=? OR (source=? AND source_client=?)""",
          (self._current_user_id, GATEWAY_SOURCE, GATEWAY_SOURCE_CLIENT),
        ).fetchone()[0] or 0
      else:
        cursor = conn.execute(
          f"SELECT MAX(id) FROM sync_operations WHERE 1=1 {user_filter}",
          user_params
        ).fetchone()[0] or 0

      # Profil-Settings (bisher nur examDateIso): leben in ihrer eigenen
      # Tabelle statt im Ops-Log-Replay, weil ein frischer Client per Snapshot
      # bootstrapt und dabei den Cursor direkt auf den aktuellen Serverstand
      # setzt — ein historischer examDate.upsert-Op würde danach nie mehr per
      # Delta-Pull nachgeholt. Deshalb muss der Snapshot den Stand mitliefern.
      profile_settings_row = conn.execute(
        "SELECT exam_date_iso, updated_at FROM server_profile_settings WHERE user_id=?",
        (scope_user_id(self._current_user_id),)
      ).fetchone()
      profile_settings = {
        "examDateIso": profile_settings_row["exam_date_iso"] if profile_settings_row else None,
        "examDateUpdatedAt": profile_settings_row["updated_at"] if profile_settings_row else None,
      }

      # Fetch decks
      if shared_catalog and self._current_user_id:
        deck_filter = "AND user_id=?"
        deck_params = (canonical_owner_id(conn),)
      else:
        deck_filter = user_filter
        deck_params = user_params
      if include_deleted:
        where_deck = f"WHERE 1=1 {deck_filter}"
      else:
        where_deck = f"WHERE deleted_at IS NULL {deck_filter}"
      decks_rows = conn.execute(
        f"""SELECT id, name, parent_deck_id, created_at, source, updated_at, deleted_at, last_source_client
            FROM server_decks {where_deck} ORDER BY id ASC""",
        deck_params
      ).fetchall()
      
      decks = []
      syncable_deck_ids = None if include_deleted else active_deck_ids_with_cards_or_descendants(conn, self._current_user_id)
      for r in decks_rows:
        if syncable_deck_ids is not None and r["id"] not in syncable_deck_ids:
          continue
        decks.append({
          "id": r["id"],
          "name": r["name"],
          "parentDeckId": r["parent_deck_id"],
          "createdAt": r["created_at"],
          "source": r["source"],
          "updatedAt": r["updated_at"],
          "isDeleted": r["deleted_at"] is not None,
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"]
        })
      
      # Fetch cards
      if shared_catalog and self._current_user_id:
        active_clause = "" if include_deleted else (
          "AND r.deleted_at IS NULL AND IFNULL(r.is_deleted, 0)=0 "
          "AND c.deleted_at IS NULL"
        )
        cards_rows = conn.execute(
          f"""SELECT c.id, c.note_id, c.deck_id, c.front, c.back,
                     c.tags_json, c.extra_json,
                     r.type, r.queue, r.due, r.due_at, r.learning_step,
                     r.last_reviewed_at, r.interval, r.factor, r.stability,
                     r.difficulty, r.retrievability, r.reps, r.lapses,
                     r.algorithm, r.metadata_json,
                     CASE WHEN c.deleted_at IS NOT NULL OR r.deleted_at IS NOT NULL
                               OR IFNULL(r.is_deleted, 0)=1 THEN 1 ELSE 0 END AS is_deleted,
                     c.created_at, r.updated_at,
                     COALESCE(c.deleted_at, r.deleted_at) AS deleted_at,
                     COALESCE(c.last_source_client, r.last_source_client) AS last_source_client
              FROM server_cards r
              JOIN shared_card_catalog c ON c.id=r.id
              WHERE r.user_id=? {active_clause}
              ORDER BY c.id ASC""",
          (self._current_user_id,),
        ).fetchall()
      else:
        if include_deleted:
          where_card = f"WHERE 1=1 {user_filter}"
        else:
          where_card = f"WHERE deleted_at IS NULL AND IFNULL(is_deleted, 0) = 0 {user_filter}"
        cards_rows = conn.execute(
          f"""SELECT id, note_id, deck_id, front, back, tags_json, extra_json, type, queue, due, due_at, learning_step, last_reviewed_at, interval, factor, stability, difficulty, retrievability, reps, lapses, algorithm, metadata_json, is_deleted, created_at, updated_at, deleted_at, last_source_client
              FROM server_cards {where_card} ORDER BY id ASC""",
          user_params
        ).fetchall()
      
      cards = []
      for r in cards_rows:
        try:
          tags = json.loads(r["tags_json"]) if r["tags_json"] else []
        except (TypeError, ValueError):
          LOGGER.warning("SNAPSHOT_PARSE_FALLBACK field=tags_json card_id=%s", r["id"])
          tags = []
        try:
          extra = json.loads(r["extra_json"]) if r["extra_json"] else {}
        except (TypeError, ValueError):
          LOGGER.warning("SNAPSHOT_PARSE_FALLBACK field=extra_json card_id=%s", r["id"])
          extra = {}
        try:
          metadata = json.loads(r["metadata_json"]) if r["metadata_json"] else None
        except (TypeError, ValueError):
          LOGGER.warning("SNAPSHOT_PARSE_FALLBACK field=metadata_json card_id=%s", r["id"])
          metadata = None

        raw_due = r["due"]
        raw_due_at = r["due_at"]
        try:
          normalized_due = int(raw_due) if raw_due is not None else int(time.time() // 86400)
        except Exception:
          normalized_due = int(time.time() // 86400)
        try:
          normalized_due_at = int(raw_due_at) if raw_due_at is not None else int(max(0, normalized_due) * 86400000)
        except Exception:
          normalized_due_at = int(max(0, normalized_due) * 86400000)

        raw_type = r["type"] if r["type"] is not None else 0
        raw_queue = r["queue"] if r["queue"] is not None else raw_type
        try:
          normalized_type = max(0, min(3, int(raw_type)))
        except Exception:
          normalized_type = 0
        try:
          normalized_queue = max(-1, min(2, int(raw_queue)))
        except Exception:
          normalized_queue = normalized_type

        stability = r["stability"]
        difficulty = r["difficulty"]
        retrievability = r["retrievability"]
        algorithm = r["algorithm"] if r["algorithm"] in ("sm2", "fsrs") else "sm2"
        normalized_deleted = bool(r["is_deleted"]) or r["deleted_at"] is not None
        
        cards.append({
          "id": r["id"],
          "noteId": r["note_id"],
          "deckId": r["deck_id"],
          "front": r["front"],
          "back": r["back"],
          "tags": tags,
          "extra": extra,
          "type": normalized_type,
          "queue": normalized_queue,
          "due": normalized_due,
          "dueAt": normalized_due_at,
          "learningStep": r["learning_step"],
          "lastReviewedAt": r["last_reviewed_at"],
          "interval": r["interval"],
          "factor": r["factor"],
          "stability": stability,
          "difficulty": difficulty,
          "retrievability": retrievability,
          "reps": r["reps"],
          "lapses": r["lapses"],
          "algorithm": algorithm,
          "metadata": metadata,
          "isDeleted": normalized_deleted,
          "createdAt": r["created_at"],
          "updatedAt": r["updated_at"],
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"]
        })

      if include_deleted:
        where_shuffle = f"WHERE 1=1 {user_filter}"
      else:
        where_shuffle = f"WHERE deleted_at IS NULL {user_filter}"
      shuffle_rows = conn.execute(
        f"""SELECT id, name, deck_ids_json, created_at, updated_at, deleted_at, last_source_client
            FROM server_shuffle_collections {where_shuffle} ORDER BY id ASC""",
        user_params
      ).fetchall()
      shuffle_collections = []
      for r in shuffle_rows:
        try:
          deck_ids = json.loads(r["deck_ids_json"]) if r["deck_ids_json"] else []
        except Exception:
          deck_ids = []

        shuffle_collections.append({
          "id": r["id"],
          "name": r["name"],
          "deckIds": deck_ids,
          "createdAt": r["created_at"],
          "updatedAt": r["updated_at"],
          "isDeleted": r["deleted_at"] is not None,
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"],
        })

      if include_deleted:
        where_video_note = f"WHERE 1=1 {user_filter}"
      else:
        where_video_note = f"WHERE deleted_at IS NULL {user_filter}"
      video_note_rows = conn.execute(
        f"""SELECT profile_id, objective, video_id, content, tags_json, created_at, updated_at, deleted_at, last_source_client
            FROM server_video_notes {where_video_note} ORDER BY profile_id ASC, objective ASC""",
        user_params
      ).fetchall()
      video_notes = []
      for r in video_note_rows:
        try:
          tags = json.loads(r["tags_json"]) if r["tags_json"] else []
          if not isinstance(tags, list):
            tags = []
        except Exception:
          tags = []

        video_notes.append({
          "profileId": r["profile_id"],
          "objective": r["objective"],
          "videoId": r["video_id"] or "",
          "content": r["content"] or "",
          "tags": tags,
          "createdAt": r["created_at"],
          "updatedAt": r["updated_at"],
          "isDeleted": r["deleted_at"] is not None,
          "deletedAt": r["deleted_at"],
          "lastSourceClient": r["last_source_client"],
        })

      where_review = f"WHERE undone_at IS NULL {user_filter}"
      if not include_deleted:
        where_review += """
          AND EXISTS (
            SELECT 1 FROM server_cards c
            WHERE c.id = server_reviews.card_id
              AND c.user_id = server_reviews.user_id
              AND c.deleted_at IS NULL
              AND IFNULL(c.is_deleted, 0) = 0
          )
        """
      review_rows = conn.execute(
        f"""SELECT review_op_id, card_id, rating, time_ms, reviewed_at, source_client, created_at,
                   selected_answer, correct_answer, answer_correct, session_run_id
            FROM server_reviews {where_review}
            ORDER BY reviewed_at ASC, id ASC""",
        user_params
      ).fetchall()
      reviews = []
      for r in review_rows:
        review = {
          "opId": r["review_op_id"],
          "cardId": r["card_id"],
          "rating": r["rating"],
          "timeMs": r["time_ms"],
          "timestamp": r["reviewed_at"],
          "sourceClient": r["source_client"],
          "createdAt": r["created_at"],
        }
        # Antwortdetails nur mitschicken, wenn vorhanden (alte Reviews: NULL).
        if r["selected_answer"] is not None or r["correct_answer"] is not None:
          review["answer"] = {
            "selected": r["selected_answer"] or "",
            "correct": r["correct_answer"] or "",
            "wasCorrect": bool(r["answer_correct"]),
          }
        if r["session_run_id"]:
          review["sessionRunId"] = r["session_run_id"]
        reviews.append(review)
      
      self._send_json(200, {
        "ok": True,
        "cursor": cursor,
        "decks": decks,
        "cards": cards,
        "shuffleCollections": shuffle_collections,
        "videoNotes": video_notes,
        "reviews": reviews,
        "profileSettings": profile_settings
      })
      log(
        f"SNAPSHOT  ip={client_ip}  client={_client_short(client_id)}  "
        f"includeDeleted={include_deleted}  decks={len(decks)}  cards={len(cards)}  shuffle={len(shuffle_collections)}  videoNotes={len(video_notes)}  reviews={len(reviews)}  examDateIso={profile_settings['examDateIso']}  cursor={cursor}"
      )
    finally:
      conn.close()

  # ---------------------------------------------------------------------------
  # Helpers
  # ---------------------------------------------------------------------------

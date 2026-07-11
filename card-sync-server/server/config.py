"""Runtime configuration and static reference tables for the sync server.

All process configuration is read from the environment exactly once at import
time and exposed as module-level constants. `sync_server` re-exports these so
existing references (and the unit tests that monkeypatch ``sync_server.DB_PATH``)
keep working; new modules under ``server/`` import from here directly.
"""
import logging
import os

DB_PATH = os.environ.get("SYNC_DB_PATH", "sync.db")
HOST = os.environ.get("SYNC_HOST", "0.0.0.0")
PORT = int(os.environ.get("SYNC_PORT", "8787"))
API_TOKEN = os.environ.get("SYNC_API_TOKEN", "")
USE_HTTPS = os.environ.get("SYNC_USE_HTTPS", "0")
CERT_FILE = os.environ.get("SYNC_CERT_FILE", "certs/cert.pem")
KEY_FILE = os.environ.get("SYNC_KEY_FILE", "certs/key.pem")
REBUILD_ON_START = os.environ.get("SYNC_REBUILD_ON_START", "1")
GC_ON_START = os.environ.get("SYNC_GC_ON_START", "0")
GC_RETENTION_DAYS = os.environ.get("SYNC_GC_RETENTION_DAYS", "30")
GC_MIN_REMAINING = os.environ.get("SYNC_GC_MIN_REMAINING", "10000")
GC_SAFETY_WINDOW = os.environ.get("SYNC_GC_SAFETY_WINDOW", "100")
SERVER_LOG_DIR = os.environ.get("SYNC_LOG_DIR", "logs")
SERVER_LOG_FILE = os.environ.get("SYNC_LOG_FILE", "sync-server.log")
SERVER_LOG_LEVEL = os.environ.get("SYNC_LOG_LEVEL", "INFO")
SERVER_LOG_KEEP_DAYS = os.environ.get("SYNC_LOG_KEEP_DAYS", "30")
DB_BUSY_TIMEOUT_MS = os.environ.get("SYNC_DB_BUSY_TIMEOUT_MS", "10000")
MAX_BODY_BYTES = os.environ.get("SYNC_MAX_BODY_BYTES", "10000000")
CORS_ALLOWED_ORIGINS = os.environ.get("SYNC_CORS_ALLOWED_ORIGINS", "*")
WEB_PUSH_VAPID_PRIVATE_KEY = os.environ.get("WEB_PUSH_VAPID_PRIVATE_KEY", "")
WEB_PUSH_VAPID_SUBJECT = os.environ.get("WEB_PUSH_VAPID_SUBJECT", "mailto:admin@card-pwa.local")
PUSH_DAILY_SCHEDULER_ENABLED = os.environ.get("PUSH_DAILY_SCHEDULER_ENABLED", "1")
PUSH_DAILY_POLL_SECONDS = os.environ.get("PUSH_DAILY_POLL_SECONDS", "60")
# Zusätzliche Motivations-Slots (HH:MM, kommagetrennt) neben der nutzergewählten
# Erinnerungszeit — leer setzen ("") für das alte Verhalten mit genau einem Push/Tag.
PUSH_DAILY_SLOTS = os.environ.get("PUSH_DAILY_SLOTS", "08:30,13:00")

LOGGER = logging.getLogger("card-sync-server")
HEALTH_LOG_EVERY_MS = os.environ.get("SYNC_HEALTH_LOG_EVERY_MS", "60000")

DEFAULT_PROFILE_NAME = "Default"

# Familien-PIN für /auth/profile/join auf Nicht-Default-Profile. Leer = Join
# auf persönliche Profile ist deaktiviert (fail closed); das Default-Profil
# (geteilte Bibliothek) bleibt bewusst ohne PIN beitretbar.
JOIN_PIN = os.environ.get("SYNC_JOIN_PIN", "")

SY0_701_ROOT_DECKS = {
  "1": ("01_General_Security_Concepts", "General Security Concepts"),
  "2": ("02_Threats_Vulnerabilities_Mitigations", "Threats, Vulnerabilities, and Mitigations"),
  "3": ("03_Security_Architecture", "Security Architecture"),
  "4": ("04_Security_Operations", "Security Operations"),
  "5": ("05_Security_Program_Management_Oversight", "Security Program Management and Oversight"),
}

SY0_701_OBJECTIVES = [
  ("1.1", "Security Controls", SY0_701_ROOT_DECKS["1"][0]),
  ("1.2", "Security Concepts", SY0_701_ROOT_DECKS["1"][0]),
  ("1.3", "Change Management", SY0_701_ROOT_DECKS["1"][0]),
  ("1.4", "Cryptographic Solutions", SY0_701_ROOT_DECKS["1"][0]),
  ("2.1", "Threat Actors", SY0_701_ROOT_DECKS["2"][0]),
  ("2.2", "Threat Vectors and Attack Surfaces", SY0_701_ROOT_DECKS["2"][0]),
  ("2.3", "Types of Vulnerabilities", SY0_701_ROOT_DECKS["2"][0]),
  ("2.4", "Indicators of Malicious Activity", SY0_701_ROOT_DECKS["2"][0]),
  ("2.5", "Mitigation Techniques", SY0_701_ROOT_DECKS["2"][0]),
  ("3.1", "Architecture Models", SY0_701_ROOT_DECKS["3"][0]),
  ("3.2", "Applying Security Principles", SY0_701_ROOT_DECKS["3"][0]),
  ("3.3", "Protecting Data", SY0_701_ROOT_DECKS["3"][0]),
  ("3.4", "Resiliency and Recovery", SY0_701_ROOT_DECKS["3"][0]),
  ("4.1", "Security Techniques", SY0_701_ROOT_DECKS["4"][0]),
  ("4.2", "Asset Management", SY0_701_ROOT_DECKS["4"][0]),
  ("4.3", "Vulnerability Management", SY0_701_ROOT_DECKS["4"][0]),
  ("4.4", "Security Monitoring", SY0_701_ROOT_DECKS["4"][0]),
  ("4.5", "Enterprise Security", SY0_701_ROOT_DECKS["4"][0]),
  ("4.6", "Identity and Access Management", SY0_701_ROOT_DECKS["4"][0]),
  ("4.7", "Automation and Orchestration", SY0_701_ROOT_DECKS["4"][0]),
  ("4.8", "Incident Response", SY0_701_ROOT_DECKS["4"][0]),
  ("4.9", "Security Data Sources", SY0_701_ROOT_DECKS["4"][0]),
  ("5.1", "Security Governance", SY0_701_ROOT_DECKS["5"][0]),
  ("5.2", "Risk Management", SY0_701_ROOT_DECKS["5"][0]),
  ("5.3", "Third-party Risk", SY0_701_ROOT_DECKS["5"][0]),
  ("5.4", "Security Compliance", SY0_701_ROOT_DECKS["5"][0]),
  ("5.5", "Audits and Assessments", SY0_701_ROOT_DECKS["5"][0]),
  ("5.6", "Security Awareness", SY0_701_ROOT_DECKS["5"][0]),
]

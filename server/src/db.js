// SQLite database setup (zero-config). Creates tables on first run.
// To switch to PostgreSQL (Neon/Supabase) see README "Switching to Postgres".
import Database from "better-sqlite3";
import "dotenv/config";

const DB_FILE = process.env.DB_FILE || "./fraud.db";
const db = new Database(DB_FILE);
db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    email       TEXT UNIQUE NOT NULL,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    created_at  TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id               TEXT PRIMARY KEY,
    user_id          TEXT NOT NULL,
    amount           REAL NOT NULL,
    merchant         TEXT,
    location         TEXT,
    device_id        TEXT,
    payment_method   TEXT,
    transaction_time TEXT NOT NULL,
    is_fraud         INTEGER NOT NULL DEFAULT 0,
    risk_score       REAL NOT NULL DEFAULT 0,
    risk_band        TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS alerts (
    id             TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    alert_type     TEXT NOT NULL,
    severity       TEXT NOT NULL,
    message        TEXT,
    created_at     TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
  );

  CREATE TABLE IF NOT EXISTS model_predictions (
    id             TEXT PRIMARY KEY,
    transaction_id TEXT NOT NULL,
    prediction     INTEGER NOT NULL,
    confidence     REAL NOT NULL,
    model_version  TEXT,
    reasons        TEXT,
    created_at     TEXT NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id)
  );

  CREATE INDEX IF NOT EXISTS idx_tx_user ON transactions(user_id);
  CREATE INDEX IF NOT EXISTS idx_tx_time ON transactions(transaction_time);
`);

export default db;

import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { encryptField, isSealed, phoneKey } from "./secret";

const globalForDb = globalThis as unknown as { __regDb?: DatabaseSync };

const SCHEMA = `
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS events (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  summary TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  starts_at TEXT NOT NULL,
  ends_at TEXT,
  published INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS registrations (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  full_name TEXT NOT NULL,
  company TEXT NOT NULL,
  country TEXT NOT NULL,
  phone TEXT NOT NULL,
  phone_norm TEXT NOT NULL,
  position TEXT NOT NULL,
  email TEXT NOT NULL DEFAULT '',
  remind INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  reminder_status TEXT NOT NULL DEFAULT 'none',
  reminder_sent_at TEXT,
  reminder_error TEXT,
  UNIQUE(event_id, phone_norm),
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_reg_event ON registrations(event_id);
CREATE INDEX IF NOT EXISTS idx_reg_remind ON registrations(reminder_status, remind);

CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY,
  expires_at INTEGER NOT NULL
);
`;

function lockFile(file: string) {
  if (fs.existsSync(file)) fs.chmodSync(file, 0o600);
}

function protectFiles(dir: string, dbPath: string) {
  fs.chmodSync(dir, 0o700);
  lockFile(dbPath);
  lockFile(`${dbPath}-wal`);
  lockFile(`${dbPath}-shm`);
  const outbox = path.join(dir, "outbox");
  if (!fs.existsSync(outbox)) return;
  fs.chmodSync(outbox, 0o700);
  for (const name of fs.readdirSync(outbox)) {
    const file = path.join(outbox, name);
    if (!fs.statSync(file).isFile()) continue;
    const text = fs.readFileSync(file, "utf8");
    if (!isSealed(text)) fs.writeFileSync(file, encryptField(text), { mode: 0o600 });
    else fs.chmodSync(file, 0o600);
  }
}

function sealRegistrations(db: DatabaseSync) {
  const rows = db
    .prepare("SELECT id, full_name, company, country, phone, phone_norm, position, email FROM registrations")
    .all() as Array<Record<string, string>>;
  const update = db.prepare(
    `UPDATE registrations
     SET full_name = ?, company = ?, country = ?, phone = ?, phone_norm = ?, position = ?, email = ?
     WHERE id = ?`,
  );
  for (const row of rows) {
    if (isSealed(String(row.full_name))) continue;
    update.run(
      encryptField(String(row.full_name)),
      encryptField(String(row.company)),
      encryptField(String(row.country)),
      encryptField(String(row.phone)),
      phoneKey(String(row.phone_norm)),
      encryptField(String(row.position)),
      encryptField(String(row.email || "")),
      row.id,
    );
  }
}

function migrate(db: DatabaseSync) {
  const regColumns = db.prepare("PRAGMA table_info(registrations)").all() as Array<{ name: string }>;
  if (!regColumns.some((column) => column.name === "lang")) {
    db.exec("ALTER TABLE registrations ADD COLUMN lang TEXT NOT NULL DEFAULT 'ru'");
  }

  const eventColumns = db.prepare("PRAGMA table_info(events)").all() as Array<{ name: string }>;
  if (!eventColumns.some((column) => column.name === "contracts_enabled")) {
    db.exec("ALTER TABLE events ADD COLUMN contracts_enabled INTEGER NOT NULL DEFAULT 0");
  }
  if (!eventColumns.some((column) => column.name === "contracts_voting")) {
    db.exec("ALTER TABLE events ADD COLUMN contracts_voting INTEGER NOT NULL DEFAULT 0");
  }

  db.exec(`
CREATE TABLE IF NOT EXISTS contract_proposals (
  id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  registration_id TEXT,
  text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY(event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY(registration_id) REFERENCES registrations(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_contract_event ON contract_proposals(event_id);
`);

  const voteColumns = db.prepare("PRAGMA table_info(contract_votes)").all() as Array<{ name: string }>;
  const hasRegistrationVote = voteColumns.some((column) => column.name === "registration_id");
  if (!hasRegistrationVote) {
    db.exec("DROP TABLE IF EXISTS contract_votes");
    db.exec(`
CREATE TABLE contract_votes (
  id TEXT PRIMARY KEY,
  proposal_id TEXT NOT NULL,
  registration_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  UNIQUE(proposal_id, registration_id),
  FOREIGN KEY(proposal_id) REFERENCES contract_proposals(id) ON DELETE CASCADE,
  FOREIGN KEY(registration_id) REFERENCES registrations(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_contract_votes_proposal ON contract_votes(proposal_id);
CREATE INDEX IF NOT EXISTS idx_contract_votes_reg ON contract_votes(registration_id);
`);
  }
}

export function getDb() {
  if (!globalForDb.__regDb) {
    const dir = path.join(process.cwd(), "data");
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const dbPath = path.join(dir, "app.db");
    const db = new DatabaseSync(dbPath);
    db.exec(SCHEMA);
    migrate(db);
    sealRegistrations(db);
    protectFiles(dir, dbPath);
    globalForDb.__regDb = db;
  }
  return globalForDb.__regDb;
}

export function isUniqueError(error: unknown) {
  return error instanceof Error && /UNIQUE/i.test(error.message);
}

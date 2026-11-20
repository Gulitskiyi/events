import fs from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import { randomUUID } from "node:crypto";
import { DEFAULT_REF_LINKS } from "./contest";
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

function addColumn(db: DatabaseSync, table: string, column: string, ddl: string) {
  const columns = db.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  if (!columns.some((item) => item.name === column)) {
    db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
  }
}

function seedDirectories(db: DatabaseSync) {
  const count = Number((db.prepare("SELECT COUNT(*) AS c FROM directory_items").get() as { c: number | bigint }).c);
  if (count > 0) return;

  const insert = db.prepare(
    `INSERT INTO directory_items (id, category, code, title, search, active, sort_order, created_at)
     VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
  );
  const now = new Date().toISOString();
  const banks = [
    ["CBR", "Банк России (ЦБ РФ)", "цб россия cbr bank of russia"],
    ["PBOC", "Народный банк Китая (PBOC)", "китая pboc people's bank of china"],
  ];
  banks.forEach(([code, title, search], index) => {
    insert.run(randomUUID(), "central_banks", code, title, search, index + 1, now);
  });

  const stocks = [
    ["KCEL", "Kcell", "kcel kcell"],
    ["KZTO", "KazTransOil", "kzto kaztransoil"],
    ["HSBK", "Halyk Bank", "hsbk halyk"],
  ];
  stocks.forEach(([code, title, search], index) => {
    insert.run(randomUUID(), "its_stocks", code, title, `${code} ${search}`.toLowerCase(), index + 1, now);
  });

  const crypto = [
    ["BTC", "Bitcoin", "btc bitcoin"],
    ["ETH", "Ethereum", "eth ethereum"],
    ["USDT", "Tether", "usdt tether"],
  ];
  crypto.forEach(([code, title, search], index) => {
    insert.run(randomUUID(), "crypto_green", code, title, search, index + 1, now);
  });
}

function seedSettings(db: DatabaseSync) {
  const upsert = db.prepare(
    `INSERT INTO contest_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO NOTHING`,
  );
  upsert.run("green_list_url", DEFAULT_REF_LINKS.greenList);
  upsert.run("its_stocks_url", DEFAULT_REF_LINKS.itsStocks);
  db.prepare(
    `UPDATE contest_settings SET value = ? WHERE key = 'its_stocks_url' AND value LIKE '%its.kz%'`,
  ).run(DEFAULT_REF_LINKS.itsStocks);
  db.prepare(
    `UPDATE contest_settings
     SET value = ?
     WHERE key = 'green_list_url'
       AND (value LIKE '%afsa.kz%' OR value = '' OR value IS NULL)`,
  ).run(DEFAULT_REF_LINKS.greenList);
}

function migrate(db: DatabaseSync) {
  addColumn(db, "registrations", "lang", "lang TEXT NOT NULL DEFAULT 'ru'");
  addColumn(db, "events", "contracts_enabled", "contracts_enabled INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "events", "contracts_voting", "contracts_voting INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "events", "proposals_deadline", "proposals_deadline TEXT");

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

  addColumn(db, "contract_proposals", "number", "number INTEGER NOT NULL DEFAULT 0");
  addColumn(db, "contract_proposals", "title", "title TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "category", "category TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "asset_code", "asset_code TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "asset_label", "asset_label TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "event_question", "event_question TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "condition_op", "condition_op TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "condition_value", "condition_value TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "settlement_at", "settlement_at TEXT NOT NULL DEFAULT '2027-11-26'");
  addColumn(db, "contract_proposals", "comment", "comment TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "status", "status TEXT NOT NULL DEFAULT 'received'");
  addColumn(db, "contract_proposals", "last_name", "last_name TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "first_name", "first_name TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "company", "company TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "position", "position TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "email", "email TEXT NOT NULL DEFAULT ''");
  addColumn(db, "contract_proposals", "phone", "phone TEXT NOT NULL DEFAULT ''");

  const needsBackfill = db
    .prepare(`SELECT id, text, title, status, number FROM contract_proposals WHERE number = 0 OR title = ''`)
    .all() as Array<{ id: string; text: string; title: string; status: string; number: number }>;
  if (needsBackfill.length) {
    let next = Number(
      (db.prepare("SELECT COALESCE(MAX(number), 0) AS n FROM contract_proposals").get() as { n: number | bigint }).n,
    );
    const update = db.prepare(
      `UPDATE contract_proposals SET number = ?, title = ?, status = CASE WHEN status = '' OR status IS NULL THEN ? ELSE status END WHERE id = ?`,
    );
    for (const row of needsBackfill) {
      const number = Number(row.number) > 0 ? Number(row.number) : ++next;
      if (Number(row.number) === 0 && number > next) next = number;
      update.run(number, row.title || row.text.slice(0, 120), "approved", row.id);
    }
  }

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

  db.exec(`
CREATE TABLE IF NOT EXISTS directory_items (
  id TEXT PRIMARY KEY,
  category TEXT NOT NULL,
  code TEXT NOT NULL,
  title TEXT NOT NULL,
  search TEXT NOT NULL DEFAULT '',
  active INTEGER NOT NULL DEFAULT 1,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  UNIQUE(category, code)
);
CREATE INDEX IF NOT EXISTS idx_directory_category ON directory_items(category, active, sort_order);

CREATE TABLE IF NOT EXISTS contest_settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
`);

  seedDirectories(db);
  seedSettings(db);
  seedContestEvent(db);
}

function seedContestEvent(db: DatabaseSync) {
  const count = Number((db.prepare("SELECT COUNT(*) AS c FROM events").get() as { c: number | bigint }).c);
  if (count > 0) {
    const enabled = Number(
      (db.prepare("SELECT COUNT(*) AS c FROM events WHERE contracts_enabled = 1").get() as { c: number | bigint }).c,
    );
    if (enabled > 0) return;
    db.prepare(
      `UPDATE events SET contracts_enabled = 1, title = ?, summary = ? WHERE id = (
         SELECT id FROM events ORDER BY created_at ASC LIMIT 1
       )`,
    ).run(
      "IT’S YOUR CALL! 2027: YES OR NO?",
      "Конкурс «Предложи свой контракт — запусти его на ITS»",
    );
    return;
  }

  db.prepare(
    `INSERT INTO events (
       id, slug, title, summary, description, location, starts_at, ends_at, published,
       contracts_enabled, contracts_voting, proposals_deadline, created_at
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, 1, 0, ?, ?)`,
  ).run(
    randomUUID(),
    "its-prediction-market",
    "IT’S YOUR CALL! 2027: YES OR NO?",
    "Конкурс «Предложи свой контракт — запусти его на ITS»",
    "Предложите идею Prediction-контракта. Пять лучших по итогам голосования будут запущены на ITS.",
    "Astana",
    "2026-11-26T14:00:00.000Z",
    "2026-11-26T20:00:00.000Z",
    "2026-11-25T18:00:00.000Z",
    new Date().toISOString(),
  );
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

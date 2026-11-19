import { randomUUID } from "node:crypto";
import {
  DEFAULT_REF_LINKS,
  SETTLEMENT_DATE,
  buildProposalSummary,
  type ConditionOp,
  type ContestCategory,
  type ProposalStatus,
} from "./contest";
import { getDb, isUniqueError } from "./db";
import { decryptField, encryptField, isSealed, phoneKey } from "./secret";
import type {
  ContestSettings,
  ContractProposal,
  DirectoryItem,
  EventInput,
  EventRecord,
  EventWithCount,
  RegistrationRecord,
  RegistrationWithEvent,
} from "./types";

function openRegistration<T extends RegistrationRecord>(row: T): T {
  return {
    ...row,
    full_name: decryptField(row.full_name),
    company: decryptField(row.company),
    country: decryptField(row.country),
    phone: decryptField(row.phone),
    position: decryptField(row.position),
    email: decryptField(row.email || ""),
  };
}

function openProposalField(value: string) {
  if (!value) return "";
  return isSealed(value) ? decryptField(value) : value;
}

function num(value: unknown) {
  return Number(value);
}

function asEvent(row: EventRecord | undefined | null) {
  if (!row) return null;
  return {
    ...row,
    contracts_enabled: num(row.contracts_enabled) ? 1 : 0,
    contracts_voting: num(row.contracts_voting) ? 1 : 0,
    published: num(row.published) ? 1 : 0,
    proposals_deadline: row.proposals_deadline || null,
  } as EventRecord;
}

function mapProposal(
  row: {
    id: string;
    event_id: string;
    registration_id: string | null;
    number: number | bigint;
    title: string;
    category: string;
    asset_code: string;
    asset_label: string;
    event_question: string;
    condition_op: string;
    condition_value: string;
    settlement_at: string;
    comment: string;
    status: string;
    text: string;
    last_name: string;
    first_name: string;
    company: string;
    position: string;
    email: string;
    phone: string;
    created_at: string;
    votes?: number | bigint;
  },
  voted = false,
): ContractProposal {
  return {
    id: row.id,
    event_id: row.event_id,
    registration_id: row.registration_id,
    number: num(row.number),
    title: row.title || row.text,
    category: (row.category || "") as ContestCategory | "",
    asset_code: row.asset_code || "",
    asset_label: row.asset_label || "",
    event_question: row.event_question || "",
    condition_op: (row.condition_op || "") as ConditionOp | "",
    condition_value: row.condition_value || "",
    settlement_at: row.settlement_at || SETTLEMENT_DATE,
    comment: row.comment || "",
    status: (row.status || "received") as ProposalStatus,
    text: row.text,
    last_name: openProposalField(row.last_name || ""),
    first_name: openProposalField(row.first_name || ""),
    company: openProposalField(row.company || ""),
    position: openProposalField(row.position || ""),
    email: openProposalField(row.email || ""),
    phone: openProposalField(row.phone || ""),
    created_at: row.created_at,
    votes: num(row.votes || 0),
    voted,
  };
}

export function listEvents() {
  const rows = getDb()
    .prepare(
      `SELECT e.*,
              (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count,
              (SELECT COUNT(*) FROM contract_proposals p WHERE p.event_id = e.id) AS proposal_count
       FROM events e
       ORDER BY e.starts_at ASC`,
    )
    .all() as Array<EventRecord & { registration_count: number | bigint; proposal_count: number | bigint }>;
  return rows.map((row) => ({
    ...asEvent(row)!,
    registration_count: num(row.registration_count),
    proposal_count: num(row.proposal_count),
  })) as EventWithCount[];
}

export function listPublicEvents() {
  return listEvents().filter((event) => event.published === 1);
}

export function getContestEvent() {
  const events = listPublicEvents().filter((event) => event.contracts_enabled === 1);
  return events[0] || listPublicEvents()[0] || null;
}

export function getEventBySlug(slug: string) {
  return asEvent(getDb().prepare("SELECT * FROM events WHERE slug = ?").get(slug) as EventRecord | undefined);
}

export function getEventById(id: string) {
  return asEvent(getDb().prepare("SELECT * FROM events WHERE id = ?").get(id) as EventRecord | undefined);
}

export function createEvent(input: EventInput) {
  if (getEventBySlug(input.slug)) return { ok: false as const, error: "slugTaken" as const };
  const id = randomUUID();
  try {
    getDb()
      .prepare(
        `INSERT INTO events (
           id, slug, title, summary, description, location, starts_at, ends_at, published,
           contracts_enabled, contracts_voting, proposals_deadline, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .run(
        id,
        input.slug,
        input.title,
        input.summary,
        input.description,
        input.location,
        input.starts_at,
        input.ends_at,
        input.published ? 1 : 0,
        input.contracts_enabled ? 1 : 0,
        input.contracts_voting ? 1 : 0,
        input.proposals_deadline,
        new Date().toISOString(),
      );
  } catch (error) {
    if (isUniqueError(error)) return { ok: false as const, error: "slugTaken" as const };
    throw error;
  }
  return { ok: true as const, id };
}

export function updateEvent(id: string, input: EventInput) {
  const current = getEventById(id);
  if (!current) return { ok: false as const, error: "eventMissing" as const };
  const taken = getEventBySlug(input.slug);
  if (taken && taken.id !== id) return { ok: false as const, error: "slugTaken" as const };
  try {
    getDb()
      .prepare(
        `UPDATE events
         SET slug = ?, title = ?, summary = ?, description = ?, location = ?, starts_at = ?, ends_at = ?,
             published = ?, contracts_enabled = ?, contracts_voting = ?, proposals_deadline = ?
         WHERE id = ?`,
      )
      .run(
        input.slug,
        input.title,
        input.summary,
        input.description,
        input.location,
        input.starts_at,
        input.ends_at,
        input.published ? 1 : 0,
        input.contracts_enabled ? 1 : 0,
        input.contracts_voting ? 1 : 0,
        input.proposals_deadline,
        id,
      );
  } catch (error) {
    if (isUniqueError(error)) return { ok: false as const, error: "slugTaken" as const };
    throw error;
  }
  return { ok: true as const };
}

export function deleteEvent(id: string) {
  const db = getDb();
  db.prepare(
    `DELETE FROM contract_votes WHERE proposal_id IN (SELECT id FROM contract_proposals WHERE event_id = ?)`,
  ).run(id);
  db.prepare("DELETE FROM contract_proposals WHERE event_id = ?").run(id);
  db.prepare("DELETE FROM registrations WHERE event_id = ?").run(id);
  const result = db.prepare("DELETE FROM events WHERE id = ?").run(id);
  return num(result.changes) > 0;
}

export function listRegistrations(eventId: string) {
  return (
    getDb()
      .prepare("SELECT * FROM registrations WHERE event_id = ? ORDER BY created_at DESC")
      .all(eventId) as RegistrationRecord[]
  ).map(openRegistration);
}

export function listRecentRegistrations(limit = 8) {
  return (
    getDb()
      .prepare(
        `SELECT r.*, e.title AS event_title, e.slug AS event_slug, e.starts_at, e.ends_at, e.location, e.summary
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         ORDER BY r.created_at DESC
         LIMIT ?`,
      )
      .all(limit) as RegistrationWithEvent[]
  ).map(openRegistration);
}

export function stats() {
  const db = getDb();
  const events = num((db.prepare("SELECT COUNT(*) AS c FROM events").get() as { c: number | bigint }).c);
  const registrations = num(
    (db.prepare("SELECT COUNT(*) AS c FROM registrations").get() as { c: number | bigint }).c,
  );
  const pending = num(
    (
      db
        .prepare(
          `SELECT COUNT(*) AS c FROM registrations
           WHERE remind = 1 AND reminder_status IN ('scheduled', 'saved', 'error')`,
        )
        .get() as { c: number | bigint }
    ).c,
  );
  const proposals = num(
    (db.prepare("SELECT COUNT(*) AS c FROM contract_proposals").get() as { c: number | bigint }).c,
  );
  return { events, registrations, pending, proposals };
}

export function createRegistration(input: {
  eventId: string;
  fullName: string;
  company: string;
  country: string;
  phone: string;
  phoneNorm: string;
  position: string;
  email: string;
  remind: boolean;
  lang: string;
  contractProposal?: string;
}) {
  const id = randomUUID();
  const db = getDb();
  try {
    db.prepare(
      `INSERT INTO registrations (
         id, event_id, full_name, company, country, phone, phone_norm, position, email, remind, created_at, reminder_status, lang
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).run(
      id,
      input.eventId,
      encryptField(input.fullName),
      encryptField(input.company),
      encryptField(input.country),
      encryptField(input.phone),
      phoneKey(input.phoneNorm),
      encryptField(input.position),
      encryptField(input.email),
      input.remind ? 1 : 0,
      new Date().toISOString(),
      input.remind ? "scheduled" : "none",
      input.lang,
    );
  } catch (error) {
    if (isUniqueError(error)) return { ok: false as const, error: "alreadyRegistered" as const };
    throw error;
  }

  const proposal = (input.contractProposal || "").trim().replace(/\s+/g, " ");
  if (proposal) {
    const number =
      num((db.prepare("SELECT COALESCE(MAX(number), 0) AS n FROM contract_proposals").get() as { n: number | bigint }).n) +
      1;
    db.prepare(
      `INSERT INTO contract_proposals (
         id, event_id, registration_id, text, created_at, number, title, status
       ) VALUES (?, ?, ?, ?, ?, ?, ?, 'received')`,
    ).run(randomUUID(), input.eventId, id, proposal, new Date().toISOString(), number, proposal.slice(0, 120));
  }

  return { ok: true as const, id };
}

export function findOrCreateRegistration(input: {
  eventId: string;
  fullName: string;
  company: string;
  phone: string;
  phoneNorm: string;
  position: string;
  email: string;
  lang: string;
}) {
  const existingId = findRegistrationIdByPhone(input.eventId, input.phoneNorm);
  if (existingId) return { ok: true as const, id: existingId, created: false as const };

  const created = createRegistration({
    ...input,
    country: "kz",
    remind: false,
  });
  if (!created.ok) {
    const again = findRegistrationIdByPhone(input.eventId, input.phoneNorm);
    if (again) return { ok: true as const, id: again, created: false as const };
    return created;
  }
  return { ok: true as const, id: created.id, created: true as const };
}

export function findRegistrationIdByPhone(eventId: string, phoneNorm: string) {
  const key = phoneKey(phoneNorm);
  const row = getDb()
    .prepare("SELECT id FROM registrations WHERE event_id = ? AND phone_norm = ?")
    .get(eventId, key) as { id: string } | undefined;
  return row?.id || null;
}

export function registrationExists(id: string, eventId: string) {
  const row = getDb()
    .prepare("SELECT id FROM registrations WHERE id = ? AND event_id = ?")
    .get(id, eventId) as { id: string } | undefined;
  return Boolean(row);
}

export function isProposalsOpen(event: EventRecord) {
  if (!event.proposals_deadline) return true;
  return Date.now() <= new Date(event.proposals_deadline).getTime();
}

export function createContestProposal(input: {
  eventId: string;
  registrationId: string;
  lastName: string;
  firstName: string;
  company: string;
  position: string;
  email: string;
  phone: string;
  title: string;
  category: ContestCategory;
  assetCode: string;
  assetLabel: string;
  eventQuestion: string;
  conditionOp: ConditionOp;
  conditionValue: string;
  comment: string;
}) {
  const db = getDb();
  const number =
    num((db.prepare("SELECT COALESCE(MAX(number), 0) AS n FROM contract_proposals").get() as { n: number | bigint }).n) +
    1;
  const settlementAt = SETTLEMENT_DATE;
  const text = buildProposalSummary({
    title: input.title,
    assetLabel: input.assetLabel,
    eventQuestion: input.eventQuestion,
    conditionOp: input.conditionOp,
    conditionValue: input.conditionValue,
    settlementAt,
  });
  const id = randomUUID();
  db.prepare(
    `INSERT INTO contract_proposals (
       id, event_id, registration_id, text, created_at, number, title, category, asset_code, asset_label,
       event_question, condition_op, condition_value, settlement_at, comment, status,
       last_name, first_name, company, position, email, phone
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'received', ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.eventId,
    input.registrationId,
    text,
    new Date().toISOString(),
    number,
    input.title,
    input.category,
    input.assetCode,
    input.assetLabel,
    input.eventQuestion,
    input.conditionOp,
    input.conditionValue,
    settlementAt,
    input.comment,
    encryptField(input.lastName),
    encryptField(input.firstName),
    encryptField(input.company),
    encryptField(input.position),
    encryptField(input.email),
    encryptField(input.phone),
  );
  return { ok: true as const, id, number };
}

function proposalSelect(where: string) {
  return `SELECT p.*,
            (SELECT COUNT(*) FROM contract_votes v WHERE v.proposal_id = p.id) AS votes
     FROM contract_proposals p
     WHERE ${where}`;
}

export function listContractProposals(
  eventId: string,
  registrationId?: string | null,
  options?: { approvedOnly?: boolean },
): ContractProposal[] {
  const where = options?.approvedOnly
    ? "p.event_id = ? AND p.status = 'approved'"
    : "p.event_id = ?";
  const rows = getDb()
    .prepare(`${proposalSelect(where)} ORDER BY votes DESC, p.number ASC`)
    .all(eventId) as Array<Parameters<typeof mapProposal>[0]>;

  let votedIds = new Set<string>();
  if (registrationId) {
    const mine = getDb()
      .prepare(
        `SELECT proposal_id FROM contract_votes
         WHERE registration_id = ? AND proposal_id IN (SELECT id FROM contract_proposals WHERE event_id = ?)`,
      )
      .all(registrationId, eventId) as Array<{ proposal_id: string }>;
    votedIds = new Set(mine.map((row) => row.proposal_id));
  }

  return rows.map((row) => mapProposal(row, votedIds.has(row.id)));
}

export function listAllProposals(eventId?: string) {
  const rows = (
    eventId
      ? (getDb()
          .prepare(`${proposalSelect("p.event_id = ?")} ORDER BY p.created_at DESC`)
          .all(eventId) as Array<Parameters<typeof mapProposal>[0]>)
      : (getDb()
          .prepare(`${proposalSelect("1=1")} ORDER BY p.created_at DESC`)
          .all() as Array<Parameters<typeof mapProposal>[0]>)
  );
  return rows.map((row) => mapProposal(row));
}

export function getProposalById(id: string) {
  const row = getDb().prepare(`${proposalSelect("p.id = ?")}`).get(id) as Parameters<typeof mapProposal>[0] | undefined;
  return row ? mapProposal(row) : null;
}

export function updateProposalStatus(id: string, status: ProposalStatus) {
  const result = getDb().prepare("UPDATE contract_proposals SET status = ? WHERE id = ?").run(status, id);
  return num(result.changes) > 0;
}

export function toggleContractVote(proposalId: string, registrationId: string) {
  const db = getDb();
  const proposal = getProposalById(proposalId);
  if (!proposal || proposal.status !== "approved") return { ok: false as const, error: "errProposalMissing" as const };

  const existing = db
    .prepare("SELECT id FROM contract_votes WHERE proposal_id = ? AND registration_id = ?")
    .get(proposalId, registrationId) as { id: string } | undefined;
  if (existing) {
    db.prepare("DELETE FROM contract_votes WHERE id = ?").run(existing.id);
    return { ok: true as const, voted: false as const };
  }
  db.prepare(
    `INSERT INTO contract_votes (id, proposal_id, registration_id, created_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), proposalId, registrationId, new Date().toISOString());
  return { ok: true as const, voted: true as const };
}

export function countContractProposals(eventId: string) {
  return num(
    (getDb().prepare("SELECT COUNT(*) AS c FROM contract_proposals WHERE event_id = ?").get(eventId) as {
      c: number | bigint;
    }).c,
  );
}

export function topProposals(eventId: string, limit = 5) {
  return listContractProposals(eventId, null, { approvedOnly: true }).slice(0, limit);
}

export function listDirectoryItems(category?: ContestCategory, activeOnly = false) {
  const db = getDb();
  const rows = (
    category
      ? activeOnly
        ? db
            .prepare(
              `SELECT * FROM directory_items WHERE category = ? AND active = 1
               ORDER BY sort_order ASC, title ASC`,
            )
            .all(category)
        : db
            .prepare(`SELECT * FROM directory_items WHERE category = ? ORDER BY sort_order ASC, title ASC`)
            .all(category)
      : db.prepare(`SELECT * FROM directory_items ORDER BY category ASC, sort_order ASC, title ASC`).all()
  ) as DirectoryItem[];
  return rows.map((row) => ({ ...row, active: num(row.active) ? 1 : 0, sort_order: num(row.sort_order) }));
}

export function createDirectoryItem(input: {
  category: ContestCategory;
  code: string;
  title: string;
  search?: string;
  sortOrder?: number;
}) {
  const id = randomUUID();
  const search = (input.search || `${input.code} ${input.title}`).toLowerCase();
  try {
    getDb()
      .prepare(
        `INSERT INTO directory_items (id, category, code, title, search, active, sort_order, created_at)
         VALUES (?, ?, ?, ?, ?, 1, ?, ?)`,
      )
      .run(id, input.category, input.code, input.title, search, input.sortOrder ?? 0, new Date().toISOString());
  } catch (error) {
    if (isUniqueError(error)) return { ok: false as const, error: "duplicate" as const };
    throw error;
  }
  return { ok: true as const, id };
}

export function updateDirectoryItem(
  id: string,
  input: { code: string; title: string; search?: string; active: boolean; sortOrder: number },
) {
  const search = (input.search || `${input.code} ${input.title}`).toLowerCase();
  try {
    const result = getDb()
      .prepare(
        `UPDATE directory_items SET code = ?, title = ?, search = ?, active = ?, sort_order = ? WHERE id = ?`,
      )
      .run(input.code, input.title, search, input.active ? 1 : 0, input.sortOrder, id);
    return num(result.changes) > 0 ? ({ ok: true as const } as const) : ({ ok: false as const, error: "missing" as const });
  } catch (error) {
    if (isUniqueError(error)) return { ok: false as const, error: "duplicate" as const };
    throw error;
  }
}

export function deleteDirectoryItem(id: string) {
  return num(getDb().prepare("DELETE FROM directory_items WHERE id = ?").run(id).changes) > 0;
}

export function getContestSettings(): ContestSettings {
  const rows = getDb().prepare("SELECT key, value FROM contest_settings").all() as Array<{ key: string; value: string }>;
  const map = Object.fromEntries(rows.map((row) => [row.key, row.value]));
  return {
    green_list_url: map.green_list_url || DEFAULT_REF_LINKS.greenList,
    its_stocks_url: map.its_stocks_url || DEFAULT_REF_LINKS.itsStocks,
  };
}

export function updateContestSettings(input: ContestSettings) {
  const upsert = getDb().prepare(
    `INSERT INTO contest_settings (key, value) VALUES (?, ?)
     ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
  );
  upsert.run("green_list_url", input.green_list_url);
  upsert.run("its_stocks_url", input.its_stocks_url);
}

export function listReminderCandidates() {
  return (
    getDb()
      .prepare(
        `SELECT r.*, e.title AS event_title, e.slug AS event_slug, e.starts_at, e.ends_at, e.location, e.summary
         FROM registrations r
         JOIN events e ON e.id = r.event_id
         WHERE r.remind = 1 AND r.reminder_status IN ('scheduled', 'saved')`,
      )
      .all() as RegistrationWithEvent[]
  ).map(openRegistration);
}

export function setReminderStatus(id: string, status: string, error: string | null) {
  const sentAt = status === "sent" ? new Date().toISOString() : null;
  getDb()
    .prepare(
      `UPDATE registrations
       SET reminder_status = ?, reminder_error = ?, reminder_sent_at = CASE WHEN ? IS NOT NULL THEN ? ELSE reminder_sent_at END
       WHERE id = ?`,
    )
    .run(status, error, sentAt, sentAt, id);
}

export function resetFailedReminders() {
  getDb()
    .prepare(
      `UPDATE registrations
       SET reminder_status = 'scheduled', reminder_error = NULL
       WHERE reminder_status = 'error'`,
    )
    .run();
}

import { randomUUID } from "node:crypto";
import { getDb, isUniqueError } from "./db";
import { decryptField, encryptField, phoneKey } from "./secret";
import type {
  ContractProposal,
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
  } as EventRecord;
}

export function listEvents() {
  const rows = getDb()
    .prepare(
      `SELECT e.*, (SELECT COUNT(*) FROM registrations r WHERE r.event_id = e.id) AS registration_count
       FROM events e
       ORDER BY e.starts_at ASC`,
    )
    .all() as Array<EventRecord & { registration_count: number | bigint }>;
  return rows.map((row) => ({
    ...asEvent(row)!,
    registration_count: num(row.registration_count),
  })) as EventWithCount[];
}

export function listPublicEvents() {
  return listEvents().filter((event) => event.published === 1);
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
           contracts_enabled, contracts_voting, created_at
         ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
             published = ?, contracts_enabled = ?, contracts_voting = ?
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
  return { events, registrations, pending };
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
    db.prepare(
      `INSERT INTO contract_proposals (id, event_id, registration_id, text, created_at)
       VALUES (?, ?, ?, ?, ?)`,
    ).run(randomUUID(), input.eventId, id, proposal, new Date().toISOString());
  }

  return { ok: true as const, id };
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

export function listContractProposals(eventId: string, registrationId?: string | null): ContractProposal[] {
  const rows = getDb()
    .prepare(
      `SELECT p.id, p.event_id, p.registration_id, p.text, p.created_at,
              (SELECT COUNT(*) FROM contract_votes v WHERE v.proposal_id = p.id) AS votes
       FROM contract_proposals p
       WHERE p.event_id = ?
       ORDER BY votes DESC, p.created_at ASC`,
    )
    .all(eventId) as Array<{
    id: string;
    event_id: string;
    registration_id: string | null;
    text: string;
    created_at: string;
    votes: number | bigint;
  }>;

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

  return rows.map((row) => ({
    id: row.id,
    event_id: row.event_id,
    registration_id: row.registration_id,
    text: row.text,
    created_at: row.created_at,
    votes: num(row.votes),
    voted: votedIds.has(row.id),
  }));
}

export function getProposalById(id: string) {
  return (
    (getDb()
      .prepare("SELECT id, event_id, registration_id, text, created_at FROM contract_proposals WHERE id = ?")
      .get(id) as
      | { id: string; event_id: string; registration_id: string | null; text: string; created_at: string }
      | undefined) ?? null
  );
}

export function toggleContractVote(proposalId: string, registrationId: string) {
  const db = getDb();
  const existing = db
    .prepare("SELECT id FROM contract_votes WHERE proposal_id = ? AND registration_id = ?")
    .get(proposalId, registrationId) as { id: string } | undefined;
  if (existing) {
    db.prepare("DELETE FROM contract_votes WHERE id = ?").run(existing.id);
    return { voted: false as const };
  }
  db.prepare(
    `INSERT INTO contract_votes (id, proposal_id, registration_id, created_at) VALUES (?, ?, ?, ?)`,
  ).run(randomUUID(), proposalId, registrationId, new Date().toISOString());
  return { voted: true as const };
}

export function countContractProposals(eventId: string) {
  return num(
    (getDb().prepare("SELECT COUNT(*) AS c FROM contract_proposals WHERE event_id = ?").get(eventId) as {
      c: number | bigint;
    }).c,
  );
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

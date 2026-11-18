import { createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "./db";

export const COOKIE = "reg_session";
const MAX_AGE = 60 * 60 * 12;

function secret() {
  return createHash("sha256")
    .update(`reg-session:${process.env.SESSION_SECRET || ""}:${process.env.ADMIN_PASSWORD || ""}`)
    .digest();
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function passwordOk(input: string) {
  const expected = (process.env.ADMIN_PASSWORD || "").trim();
  const given = input.trim();
  if (expected.length < 12 || !given) return false;
  const left = createHash("sha256").update(given).digest();
  const right = createHash("sha256").update(expected).digest();
  return timingSafeEqual(left, right);
}

function readToken(value: string | undefined) {
  if (!value) return null;
  const [id, expRaw, signature] = value.split(".");
  if (!id || !expRaw || !signature) return null;
  const payload = `${id}.${expRaw}`;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp)) return null;
  return { id, exp };
}

export function createSession() {
  const now = Math.floor(Date.now() / 1000);
  const db = getDb();
  db.prepare("DELETE FROM sessions WHERE expires_at <= ?").run(now);
  const id = randomBytes(32).toString("base64url");
  const exp = now + MAX_AGE;
  db.prepare("INSERT INTO sessions (id, expires_at) VALUES (?, ?)").run(id, exp);
  const payload = `${id}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function verifySession(value: string | undefined) {
  const token = readToken(value);
  if (!token) return false;
  const now = Math.floor(Date.now() / 1000);
  if (token.exp <= now) {
    getDb().prepare("DELETE FROM sessions WHERE id = ?").run(token.id);
    return false;
  }
  const row = getDb().prepare("SELECT id FROM sessions WHERE id = ? AND expires_at > ?").get(token.id, now);
  return Boolean(row);
}

export function destroySession(value: string | undefined) {
  const token = readToken(value);
  if (!token) return;
  getDb().prepare("DELETE FROM sessions WHERE id = ?").run(token.id);
}

export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function isAuthed() {
  const jar = await cookies();
  return verifySession(jar.get(COOKIE)?.value);
}

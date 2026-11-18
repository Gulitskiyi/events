import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { cookies } from "next/headers";

export const BALLOT_COOKIE = "contract_ballot";
const MAX_AGE = 60 * 60 * 24 * 30;

function secret() {
  return createHash("sha256")
    .update(`contract-ballot:${process.env.SESSION_SECRET || ""}:${process.env.DATA_KEY || ""}`)
    .digest();
}

function sign(payload: string) {
  return createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function createBallotToken(registrationId: string, eventId: string) {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE;
  const payload = `${registrationId}.${eventId}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function readBallotToken(value: string | undefined) {
  if (!value) return null;
  const [registrationId, eventId, expRaw, signature] = value.split(".");
  if (!registrationId || !eventId || !expRaw || !signature) return null;
  const payload = `${registrationId}.${eventId}.${expRaw}`;
  const expected = sign(payload);
  const left = Buffer.from(signature);
  const right = Buffer.from(expected);
  if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || exp <= Math.floor(Date.now() / 1000)) return null;
  return { registrationId, eventId, exp };
}

export function ballotCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: MAX_AGE,
    secure: process.env.NODE_ENV === "production",
  };
}

export async function readBallot() {
  const jar = await cookies();
  return readBallotToken(jar.get(BALLOT_COOKIE)?.value);
}

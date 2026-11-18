import { NextResponse } from "next/server";
import { isCountryId } from "@/lib/countries";
import { isRegistrationOpen } from "@/lib/format";
import { getLocale } from "@/lib/current-locale";
import { parseLocale } from "@/lib/locale";
import { errorText } from "@/lib/messages";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { reminderPhase } from "@/lib/reminder-time";
import { processReminders } from "@/lib/reminders";
import { createRegistration, getEventById } from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const locale = typeof body?.lang === "string" ? parseLocale(body.lang) : await getLocale();
  const fail = (status: number, key: string) =>
    NextResponse.json({ ok: false, error: errorText(locale, key) }, { status });
  const ip = clientIp(request.headers);
  if (!rateLimit(`register:${ip}`, 10, 10 * 60 * 1000)) return fail(429, "errRate");
  if (!body) return fail(400, "errBadRequest");
  if (String(body.website || "").trim()) return NextResponse.json({ ok: true, timing: "none" });

  const event = getEventById(String(body.eventId || ""));
  if (!event || !event.published) return fail(404, "errEventMissing");
  if (!isRegistrationOpen(event.starts_at)) return fail(400, "errClosed");

  const fullName = String(body.fullName || "").trim().replace(/\s+/g, " ");
  const company = String(body.company || "").trim();
  const countryRaw = String(body.country || "").trim();
  const country = countryRaw === "other" ? String(body.countryOther || "").trim() : countryRaw;
  const phone = String(body.phone || "").trim();
  const phoneNorm = phone.replace(/\D/g, "");
  const position = String(body.position || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const remind = Boolean(body.remind);
  const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  if (fullName.length < 3 || fullName.length > 200) return fail(400, "errName");
  if (company.length < 2 || company.length > 200) return fail(400, "errCompany");
  if (countryRaw !== "other" && !isCountryId(countryRaw)) return fail(400, "errCountry");
  if (country.length < 2 || country.length > 80) return fail(400, "errCountry");
  if (phoneNorm.length < 10 || phoneNorm.length > 15) return fail(400, "errPhone");
  if (position.length < 2 || position.length > 200) return fail(400, "errPosition");
  if (!emailOk || email.length > 200) return fail(400, "errEmail");
  if (body.consent !== true) return fail(400, "errConsent");

  const contractProposal = String(body.contractProposal || "").trim().replace(/\s+/g, " ");
  if (contractProposal && event.contracts_enabled !== 1) return fail(400, "errBadData");
  if (contractProposal.length > 500) return fail(400, "errContractLong");

  const saved = createRegistration({
    eventId: event.id,
    fullName,
    company,
    country,
    phone,
    phoneNorm,
    position,
    email,
    remind,
    lang: locale,
    contractProposal: event.contracts_enabled === 1 ? contractProposal : "",
  });
  if (!saved.ok) return NextResponse.json({ ok: false, error: errorText(locale, saved.error) }, { status: 409 });

  void processReminders().catch((error) => console.error(error));
  const phase = remind ? reminderPhase(event.starts_at) : "wait";
  const timing = !remind ? "none" : phase === "due" ? "soon" : "later";
  return NextResponse.json({ ok: true, timing });
}

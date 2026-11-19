import { NextResponse } from "next/server";
import { isConditionOp, isContestCategory } from "@/lib/contest";
import { getLocale } from "@/lib/current-locale";
import { parseLocale } from "@/lib/locale";
import { deliverProposalConfirmation } from "@/lib/mail";
import { errorText } from "@/lib/messages";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  createContestProposal,
  findOrCreateRegistration,
  getEventById,
  isProposalsOpen,
} from "@/lib/store";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const locale = typeof body?.lang === "string" ? parseLocale(body.lang) : await getLocale();
  const fail = (status: number, key: string) =>
    NextResponse.json({ ok: false, error: errorText(locale, key) }, { status });

  const ip = clientIp(request.headers);
  if (!rateLimit(`proposal:${ip}`, 12, 10 * 60 * 1000)) return fail(429, "errRate");
  if (!body) return fail(400, "errBadRequest");
  if (String(body.website || "").trim()) return NextResponse.json({ ok: true, number: 0 });

  const event = getEventById(String(body.eventId || ""));
  if (!event || !event.published || event.contracts_enabled !== 1) return fail(404, "errNoContest");
  if (!isProposalsOpen(event)) return fail(400, "errDeadline");

  const lastName = String(body.lastName || "").trim().replace(/\s+/g, " ");
  const firstName = String(body.firstName || "").trim().replace(/\s+/g, " ");
  const company = String(body.company || "").trim();
  const position = String(body.position || "").trim();
  const email = String(body.email || "").trim().toLowerCase();
  const phone = String(body.phone || "").trim();
  const phoneNorm = phone.replace(/\D/g, "");
  const title = String(body.title || "").trim().replace(/\s+/g, " ");
  const category = String(body.category || "").trim();
  const assetCode = String(body.assetCode || "").trim();
  const assetLabel = String(body.assetLabel || "").trim();
  const eventQuestion = String(body.eventQuestion || "").trim().replace(/\s+/g, " ");
  const conditionOp = String(body.conditionOp || "").trim();
  const conditionValue = String(body.conditionValue || "").trim();
  const comment = String(body.comment || "").trim();

  if (lastName.length < 2 || lastName.length > 100) return fail(400, "errLastName");
  if (firstName.length < 2 || firstName.length > 100) return fail(400, "errFirstName");
  if (company.length < 2 || company.length > 200) return fail(400, "errCompany");
  if (position.length < 2 || position.length > 200) return fail(400, "errPosition");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 200) return fail(400, "errEmail");
  if (phoneNorm.length < 10 || phoneNorm.length > 15) return fail(400, "errPhone");
  if (title.length < 2 || title.length > 200) return fail(400, "errContractTitle");
  if (!isContestCategory(category)) return fail(400, "errCategory");
  if (!assetCode || !assetLabel) return fail(400, "errAsset");
  if (eventQuestion.length < 8 || eventQuestion.length > 500) return fail(400, "errQuestion");
  if (!isConditionOp(conditionOp)) return fail(400, "errCondition");
  if (!conditionValue || Number.isNaN(Number(conditionValue))) return fail(400, "errCondition");
  if (comment.length > 2000) return fail(400, "errBadData");
  if (body.rules !== true) return fail(400, "errRules");
  if (body.consent !== true) return fail(400, "errConsent");

  const person = findOrCreateRegistration({
    eventId: event.id,
    fullName: `${lastName} ${firstName}`,
    company,
    phone,
    phoneNorm,
    position,
    email,
    lang: locale,
  });
  if (!person.ok) return fail(400, "errSubmit");

  const saved = createContestProposal({
    eventId: event.id,
    registrationId: person.id,
    lastName,
    firstName,
    company,
    position,
    email,
    phone,
    title,
    category,
    assetCode,
    assetLabel,
    eventQuestion,
    conditionOp,
    conditionValue,
    comment,
  });

  void deliverProposalConfirmation({
    id: saved.id,
    to: email,
    name: `${firstName} ${lastName}`,
    number: saved.number,
    title,
    locale,
  }).catch((error) => console.error(error));

  return NextResponse.json({ ok: true, id: saved.id, number: saved.number });
}

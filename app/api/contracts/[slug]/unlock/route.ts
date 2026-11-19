import { NextResponse } from "next/server";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { findRegistrationIdByPhone, getEventBySlug, listContractProposals, topProposals } from "@/lib/store";
import { BALLOT_COOKIE, ballotCookieOptions, createBallotToken } from "@/lib/voter";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const fail = (status: number, key: string) =>
    NextResponse.json({ ok: false, error: errorText(locale, key) }, { status });

  const ip = clientIp(request.headers);
  if (!rateLimit(`contract-unlock:${ip}`, 8, 15 * 60 * 1000)) return fail(429, "errRate");

  const event = getEventBySlug(slug);
  if (!event || !event.published || event.contracts_enabled !== 1) return fail(404, "errEventMissing");
  if (event.contracts_voting !== 1) return fail(400, "errVotingClosed");

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const phoneNorm = String(body?.phone || "")
    .trim()
    .replace(/\D/g, "");
  if (phoneNorm.length < 10 || phoneNorm.length > 15) return fail(400, "errPhone");

  const registrationId = findRegistrationIdByPhone(event.id, phoneNorm);
  if (!registrationId) return fail(404, "errVoterNotRegistered");

  const proposals = listContractProposals(event.id, registrationId, { approvedOnly: true });
  const totalVotes = proposals.reduce((sum, row) => sum + row.votes, 0);
  const response = NextResponse.json({
    ok: true,
    unlocked: true,
    votingOpen: true,
    totalVotes,
    topIds: topProposals(event.id, 5).map((row) => row.id),
    proposals: proposals.map((row) => ({
      id: row.id,
      number: row.number,
      title: row.title,
      text: row.text,
      category: row.category,
      assetLabel: row.asset_label,
      eventQuestion: row.event_question,
      votes: row.votes,
      voted: row.voted,
      createdAt: row.created_at,
    })),
  });
  response.cookies.set(BALLOT_COOKIE, createBallotToken(registrationId, event.id), ballotCookieOptions());
  return response;
}

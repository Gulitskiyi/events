import { NextResponse } from "next/server";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import {
  getEventBySlug,
  getProposalById,
  listContractProposals,
  registrationExists,
  toggleContractVote,
  topProposals,
} from "@/lib/store";
import { readBallot } from "@/lib/voter";

export async function POST(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const fail = (status: number, key: string) =>
    NextResponse.json({ ok: false, error: errorText(locale, key) }, { status });

  const ip = clientIp(request.headers);
  if (!rateLimit(`contract-vote:${ip}`, 30, 10 * 60 * 1000)) return fail(429, "errRate");

  const event = getEventBySlug(slug);
  if (!event || !event.published || event.contracts_enabled !== 1) return fail(404, "errEventMissing");
  if (event.contracts_voting !== 1) return fail(400, "errVotingClosed");

  const ballot = await readBallot();
  if (!ballot || ballot.eventId !== event.id || !registrationExists(ballot.registrationId, event.id)) {
    return fail(401, "errNeedVoter");
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const proposalId = String(body?.proposalId || "").trim();
  if (!proposalId) return fail(400, "errBadData");

  const proposal = getProposalById(proposalId);
  if (!proposal || proposal.event_id !== event.id || proposal.status !== "approved") {
    return fail(404, "errProposalMissing");
  }

  const result = toggleContractVote(proposalId, ballot.registrationId);
  if (!result.ok) return fail(400, result.error);

  const proposals = listContractProposals(event.id, ballot.registrationId, { approvedOnly: true });
  const totalVotes = proposals.reduce((sum, row) => sum + row.votes, 0);
  return NextResponse.json({
    ok: true,
    unlocked: true,
    voted: result.voted,
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
}

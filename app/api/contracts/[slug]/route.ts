import { NextResponse } from "next/server";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { getEventBySlug, listContractProposals, registrationExists, topProposals } from "@/lib/store";
import { readBallot } from "@/lib/voter";

export async function GET(_request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const locale = await getLocale();
  const event = getEventBySlug(slug);
  if (!event || !event.published || event.contracts_enabled !== 1) {
    return NextResponse.json({ ok: false, error: errorText(locale, "errEventMissing") }, { status: 404 });
  }

  const ballot = await readBallot();
  const unlocked = Boolean(
    ballot && ballot.eventId === event.id && registrationExists(ballot.registrationId, event.id),
  );
  const registrationId = unlocked && ballot ? ballot.registrationId : null;
  const proposals = listContractProposals(event.id, registrationId, { approvedOnly: true });
  const totalVotes = proposals.reduce((sum, row) => sum + row.votes, 0);
  const top = topProposals(event.id, 5).map((row) => row.id);

  return NextResponse.json({
    ok: true,
    votingOpen: event.contracts_voting === 1,
    unlocked,
    totalVotes,
    topIds: top,
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

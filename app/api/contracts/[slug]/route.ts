import { NextResponse } from "next/server";
import { getLocale } from "@/lib/current-locale";
import { errorText } from "@/lib/messages";
import { getEventBySlug, listContractProposals, registrationExists } from "@/lib/store";
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
  const proposals = listContractProposals(event.id, registrationId);
  const totalVotes = proposals.reduce((sum, row) => sum + row.votes, 0);

  return NextResponse.json({
    ok: true,
    votingOpen: event.contracts_voting === 1,
    unlocked,
    totalVotes,
    proposals: proposals.map((row) => ({
      id: row.id,
      text: row.text,
      votes: row.votes,
      voted: row.voted,
      createdAt: row.created_at,
    })),
  });
}

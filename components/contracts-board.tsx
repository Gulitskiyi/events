"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import type { Locale } from "@/lib/locale";
import { fill, messages } from "@/lib/messages";

type Proposal = {
  id: string;
  text: string;
  votes: number;
  voted: boolean;
  createdAt: string;
};

export function ContractsBoard({
  slug,
  locale,
  votingOpen: initialVoting,
}: {
  slug: string;
  locale: Locale;
  votingOpen: boolean;
}) {
  const text = messages[locale];
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [votingOpen, setVotingOpen] = useState(initialVoting);
  const [unlocked, setUnlocked] = useState(false);
  const [totalVotes, setTotalVotes] = useState(0);
  const [error, setError] = useState("");
  const [pendingId, setPendingId] = useState("");
  const [unlocking, setUnlocking] = useState(false);

  const applyPayload = useCallback(
    (data: {
      votingOpen?: boolean;
      unlocked?: boolean;
      totalVotes?: number;
      proposals?: Proposal[];
    }) => {
      if (typeof data.votingOpen === "boolean") setVotingOpen(data.votingOpen);
      if (typeof data.unlocked === "boolean") setUnlocked(data.unlocked);
      if (typeof data.totalVotes === "number") setTotalVotes(data.totalVotes);
      if (Array.isArray(data.proposals)) setProposals(data.proposals);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch(`/api/contracts/${slug}`, { cache: "no-store" });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        votingOpen?: boolean;
        unlocked?: boolean;
        totalVotes?: number;
        proposals?: Proposal[];
      };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errNetwork);
        return;
      }
      setError("");
      applyPayload(data);
    } catch {
      setError(text.errNetwork);
    }
  }, [applyPayload, slug, text.errNetwork]);

  useEffect(() => {
    void refresh();
    const timer = setInterval(() => {
      void refresh();
    }, 2500);
    return () => clearInterval(timer);
  }, [refresh]);

  async function onUnlock(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (unlocking) return;
    setError("");
    const form = new FormData(event.currentTarget);
    const phone = String(form.get("phone") || "").trim();
    if (phone.replace(/\D/g, "").length < 10) {
      setError(text.errPhone);
      return;
    }
    setUnlocking(true);
    try {
      const response = await fetch(`/api/contracts/${slug}/unlock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        votingOpen?: boolean;
        unlocked?: boolean;
        totalVotes?: number;
        proposals?: Proposal[];
      };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errVoterNotRegistered);
        setUnlocking(false);
        return;
      }
      applyPayload(data);
    } catch {
      setError(text.errNetwork);
    }
    setUnlocking(false);
  }

  async function onVote(proposalId: string) {
    if (!votingOpen || !unlocked || pendingId) return;
    setPendingId(proposalId);
    setError("");
    try {
      const response = await fetch(`/api/contracts/${slug}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ proposalId }),
      });
      const data = (await response.json()) as {
        ok?: boolean;
        error?: string;
        unlocked?: boolean;
        totalVotes?: number;
        proposals?: Proposal[];
      };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errVote);
        setPendingId("");
        return;
      }
      applyPayload(data);
    } catch {
      setError(text.errNetwork);
    }
    setPendingId("");
  }

  const maxVotes = Math.max(1, ...proposals.map((row) => row.votes));

  return (
    <div className="contracts-board">
      <div className="contracts-meta">
        <div>
          <span>{text.contractsTotal}</span>
          <strong>{proposals.length}</strong>
        </div>
        <div>
          <span>{text.contractsVotes}</span>
          <strong>{totalVotes}</strong>
        </div>
        <div>
          <span>{text.contractsLive}</span>
          <strong className="live-dot">{votingOpen ? text.contractsVotingOn : text.contractsVotingOff}</strong>
        </div>
      </div>

      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}

      {!votingOpen ? <p className="contracts-wait">{text.contractsCollecting}</p> : null}

      {votingOpen && !unlocked ? (
        <form className="contracts-unlock" onSubmit={onUnlock}>
          <h3>{text.contractsUnlockTitle}</h3>
          <p className="note">{text.contractsUnlockHint}</p>
          <div className="field">
            <label htmlFor="votePhone">{text.phone}</label>
            <input id="votePhone" name="phone" type="tel" autoComplete="tel" placeholder="+7 777 000 00 00" />
          </div>
          <button className="btn" type="submit" disabled={unlocking}>
            {unlocking ? text.contractsUnlocking : text.contractsUnlock}
          </button>
        </form>
      ) : null}

      {votingOpen && unlocked ? <p className="note">{text.contractsUnlocked}</p> : null}

      {proposals.length === 0 ? (
        <p className="empty">{text.contractsEmpty}</p>
      ) : (
        <ol className="contracts-list">
          {proposals.map((row, index) => {
            const share = Math.round((row.votes / maxVotes) * 100);
            return (
              <li className="contract-card" key={row.id}>
                <div className="contract-rank">{index + 1}</div>
                <div className="contract-body">
                  <p>{row.text}</p>
                  <div className="contract-bar" aria-hidden="true">
                    <span style={{ width: `${share}%` }} />
                  </div>
                  <div className="contract-foot">
                    <strong>{fill(text.contractsVoteCount, { count: String(row.votes) })}</strong>
                    {votingOpen && unlocked ? (
                      <button
                        className={row.voted ? "btn btn-ghost" : "btn"}
                        type="button"
                        disabled={pendingId === row.id}
                        onClick={() => onVote(row.id)}
                      >
                        {row.voted ? text.contractsUnvote : text.contractsVote}
                      </button>
                    ) : null}
                  </div>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

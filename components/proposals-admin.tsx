"use client";

import { useState } from "react";
import type { ProposalStatus } from "@/lib/contest";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

type Row = {
  id: string;
  number: number;
  title: string;
  category: string;
  assetLabel: string;
  eventQuestion: string;
  status: ProposalStatus;
  votes: number;
  author: string;
  company: string;
  created: string;
};

export function ProposalsAdmin({ rows, locale }: { rows: Row[]; locale: Locale }) {
  const text = messages[locale];
  const [items, setItems] = useState(rows);
  const [pending, setPending] = useState("");
  const [error, setError] = useState("");

  async function setStatus(id: string, status: ProposalStatus) {
    setPending(id);
    setError("");
    try {
      const response = await fetch(`/api/admin/proposals/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !data.ok) {
        setError(data.error || text.errSave);
        setPending("");
        return;
      }
      setItems((prev) => prev.map((row) => (row.id === id ? { ...row, status } : row)));
    } catch {
      setError(text.errNetwork);
    }
    setPending("");
  }

  function label(status: ProposalStatus) {
    if (status === "reviewing") return text.statusReviewing;
    if (status === "approved") return text.statusApproved;
    if (status === "rejected") return text.statusRejected;
    return text.statusReceived;
  }

  if (items.length === 0) return <p className="empty">{text.nobody}</p>;

  return (
    <>
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>{text.colNumber}</th>
              <th>{text.colContract}</th>
              <th>{text.colName}</th>
              <th>{text.colVotes}</th>
              <th>{text.colStatus}</th>
              <th>{text.colCreated}</th>
            </tr>
          </thead>
          <tbody>
            {items.map((row) => (
              <tr key={row.id}>
                <td>#{row.number}</td>
                <td>
                  <strong>{row.title}</strong>
                  <div className="muted">{row.category}</div>
                  <div className="muted">{row.assetLabel}</div>
                  <div>{row.eventQuestion}</div>
                </td>
                <td>
                  {row.author}
                  <div className="muted">{row.company}</div>
                </td>
                <td>{row.votes}</td>
                <td>
                  <div className="stack">
                    <span className={row.status === "approved" ? "badge badge-on" : "badge"}>
                      {label(row.status)}
                    </span>
                    <select
                      value={row.status}
                      disabled={pending === row.id}
                      onChange={(event) => setStatus(row.id, event.target.value as ProposalStatus)}
                    >
                      <option value="received">{text.statusReceived}</option>
                      <option value="reviewing">{text.statusReviewing}</option>
                      <option value="approved">{text.statusApproved}</option>
                      <option value="rejected">{text.statusRejected}</option>
                    </select>
                  </div>
                </td>
                <td>{row.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

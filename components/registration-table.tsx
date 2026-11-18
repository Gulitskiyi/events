"use client";

import { useMemo, useState } from "react";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

export type RegRow = {
  id: string;
  fullName: string;
  company: string;
  country: string;
  phone: string;
  position: string;
  email: string;
  reminder: string;
  created: string;
};

export function RegistrationTable({ rows, locale }: { rows: RegRow[]; locale: Locale }) {
  const text = messages[locale];
  const [query, setQuery] = useState("");
  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      [row.fullName, row.company, row.country, row.phone, row.position, row.email, row.reminder]
        .join(" ")
        .toLowerCase()
        .includes(needle),
    );
  }, [query, rows]);

  if (rows.length === 0) return <p className="empty">{text.nobody}</p>;

  return (
    <div>
      <input
        className="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder={text.searchPh}
        aria-label={text.searchLabel}
      />
      <div className="table-scroll">
        <table className="table">
          <thead>
            <tr>
              <th>{text.colName}</th>
              <th>{text.colCompany}</th>
              <th>{text.colCountry}</th>
              <th>{text.colPhone}</th>
              <th>{text.colPosition}</th>
              <th>{text.colMail}</th>
              <th>{text.colReminder}</th>
              <th>{text.colCreated}</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((row) => (
              <tr key={row.id}>
                <td>{row.fullName}</td>
                <td>{row.company}</td>
                <td>{row.country}</td>
                <td>{row.phone}</td>
                <td>{row.position}</td>
                <td>{row.email || "—"}</td>
                <td>{row.reminder}</td>
                <td>{row.created}</td>
              </tr>
            ))}
            {visible.length === 0 ? (
              <tr>
                <td colSpan={8}>{text.nothingFound}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </div>
  );
}

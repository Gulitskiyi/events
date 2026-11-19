"use client";

import { FormEvent, useState } from "react";
import type { ContestCategory } from "@/lib/contest";
import type { Locale } from "@/lib/locale";
import { messages } from "@/lib/messages";

type Item = {
  id: string;
  category: ContestCategory;
  code: string;
  title: string;
  active: number;
  sort_order: number;
};

export function DirectoriesAdmin({
  locale,
  initialItems,
  initialSettings,
}: {
  locale: Locale;
  initialItems: Item[];
  initialSettings: { green_list_url: string; its_stocks_url: string };
}) {
  const text = messages[locale];
  const [items, setItems] = useState(initialItems);
  const [settings, setSettings] = useState(initialSettings);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [category, setCategory] = useState<ContestCategory>("central_banks");

  async function saveLinks(event: FormEvent) {
    event.preventDefault();
    setError("");
    setSaved(false);
    const response = await fetch("/api/admin/directories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "settings", ...settings }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string };
    if (!response.ok || !data.ok) {
      setError(data.error || text.errSave);
      return;
    }
    setSaved(true);
  }

  async function addItem(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const form = new FormData(event.currentTarget);
    const code = String(form.get("code") || "").trim();
    const title = String(form.get("title") || "").trim();
    const response = await fetch("/api/admin/directories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ category, code, title }),
    });
    const data = (await response.json()) as { ok?: boolean; error?: string; id?: string };
    if (!response.ok || !data.ok || !data.id) {
      setError(data.error || text.errSave);
      return;
    }
    setItems((prev) => [
      ...prev,
      { id: data.id!, category, code: code.toUpperCase(), title, active: 1, sort_order: 0 },
    ]);
    event.currentTarget.reset();
  }

  async function toggleActive(item: Item) {
    const response = await fetch(`/api/admin/directories/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code: item.code,
        title: item.title,
        active: !item.active,
        sortOrder: item.sort_order,
      }),
    });
    if (!response.ok) return;
    setItems((prev) =>
      prev.map((row) => (row.id === item.id ? { ...row, active: row.active ? 0 : 1 } : row)),
    );
  }

  async function remove(id: string) {
    if (!confirm(text.confirmDelete)) return;
    const response = await fetch(`/api/admin/directories/${id}`, { method: "DELETE" });
    if (!response.ok) return;
    setItems((prev) => prev.filter((row) => row.id !== id));
  }

  const visible = items.filter((item) => item.category === category);

  return (
    <div className="stack">
      {error ? (
        <p className="form-error" role="alert">
          {error}
        </p>
      ) : null}
      {saved ? <p className="note">{text.saved}</p> : null}

      <form className="panel" onSubmit={saveLinks}>
        <h2>{text.refsTitle}</h2>
        <div className="grid-2">
          <div className="field">
            <label htmlFor="green">{text.refsGreenBtn}</label>
            <input
              id="green"
              value={settings.green_list_url}
              onChange={(event) => setSettings((prev) => ({ ...prev, green_list_url: event.target.value }))}
            />
          </div>
          <div className="field">
            <label htmlFor="stocks">{text.refsStocksBtn}</label>
            <input
              id="stocks"
              value={settings.its_stocks_url}
              onChange={(event) => setSettings((prev) => ({ ...prev, its_stocks_url: event.target.value }))}
            />
          </div>
        </div>
        <button className="btn" type="submit">
          {text.dirSaveLinks}
        </button>
      </form>

      <div className="panel">
        <div className="field">
          <label htmlFor="dirCategory">{text.category}</label>
          <select
            id="dirCategory"
            value={category}
            onChange={(event) => setCategory(event.target.value as ContestCategory)}
          >
            <option value="central_banks">{text.categoryBanks}</option>
            <option value="its_stocks">{text.categoryStocks}</option>
            <option value="crypto_green">{text.categoryCrypto}</option>
          </select>
        </div>

        <form className="grid-2" onSubmit={addItem}>
          <div className="field">
            <label htmlFor="code">{text.dirCode}</label>
            <input id="code" name="code" required />
          </div>
          <div className="field">
            <label htmlFor="title">{text.dirTitle}</label>
            <input id="title" name="title" required />
          </div>
          <button className="btn" type="submit">
            {text.dirAdd}
          </button>
        </form>

        <div className="table-scroll" style={{ marginTop: 18 }}>
          <table className="table">
            <thead>
              <tr>
                <th>{text.dirCode}</th>
                <th>{text.dirTitle}</th>
                <th>{text.dirActive}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {visible.map((item) => (
                <tr key={item.id}>
                  <td>{item.code}</td>
                  <td>{item.title}</td>
                  <td>
                    <button className="btn btn-ghost" type="button" onClick={() => toggleActive(item)}>
                      {item.active ? text.dirActive : text.statusHidden}
                    </button>
                  </td>
                  <td>
                    <button className="btn btn-danger" type="button" onClick={() => remove(item.id)}>
                      {text.delete}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

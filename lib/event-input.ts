import { fromAlmatyInput } from "./format";
import { slugify } from "./slug";
import type { EventInput } from "./types";

export function parseEventInput(body: unknown): { ok: true; value: EventInput } | { ok: false; error: string } {
  if (!body || typeof body !== "object") return { ok: false, error: "errBadData" };
  const source = body as Record<string, unknown>;
  const title = String(source.title || "").trim();
  const summary = String(source.summary || "").trim();
  const description = String(source.description || "").trim();
  const location = String(source.location || "").trim();
  const startsRaw = String(source.startsAt || "").trim();
  const endsRaw = String(source.endsAt || "").trim();
  let slug = String(source.slug || "").trim().toLowerCase();
  const published = Boolean(source.published);
  const contracts_enabled = Boolean(source.contractsEnabled);
  const contracts_voting = Boolean(source.contractsVoting);

  if (title.length < 2 || title.length > 200) return { ok: false, error: "errNeedTitle" };
  if (location.length < 2 || location.length > 200) return { ok: false, error: "errNeedPlace" };
  if (summary.length > 300) return { ok: false, error: "errSummaryLong" };
  if (description.length > 5000) return { ok: false, error: "errDescriptionLong" };

  if (!slug) slug = slugify(title);
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    return { ok: false, error: "errSlug" };
  }

  const starts_at = fromAlmatyInput(startsRaw);
  if (!starts_at) return { ok: false, error: "errStart" };

  let ends_at: string | null = null;
  if (endsRaw) {
    ends_at = fromAlmatyInput(endsRaw);
    if (!ends_at) return { ok: false, error: "errEnd" };
    if (new Date(ends_at).getTime() <= new Date(starts_at).getTime()) {
      return { ok: false, error: "errEndBefore" };
    }
  }

  return {
    ok: true,
    value: {
      title,
      summary,
      description,
      location,
      starts_at,
      ends_at,
      slug,
      published,
      contracts_enabled,
      contracts_voting,
    },
  };
}

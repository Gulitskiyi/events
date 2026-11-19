import { DirectoriesAdmin } from "@/components/directories-admin";
import type { ContestCategory } from "@/lib/contest";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { getContestSettings, listDirectoryItems } from "@/lib/store";

export default async function AdminDirectoriesPage() {
  const locale = await getLocale();
  const text = messages[locale];
  const items = listDirectoryItems().map((item) => ({
    id: item.id,
    category: item.category as ContestCategory,
    code: item.code,
    title: item.title,
    active: item.active,
    sort_order: item.sort_order,
  }));

  return (
    <>
      <div className="admin-head">
        <div>
          <h1>{text.adminDirectories}</h1>
          <p className="lede">{text.refsTitle}</p>
        </div>
      </div>
      <DirectoriesAdmin locale={locale} initialItems={items} initialSettings={getContestSettings()} />
    </>
  );
}

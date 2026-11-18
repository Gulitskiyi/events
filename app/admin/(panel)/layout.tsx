import Link from "next/link";
import { redirect } from "next/navigation";
import { LangSwitch } from "@/components/lang-switch";
import { LogoutButton } from "@/components/logout-button";
import { isAuthed } from "@/lib/auth";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthed())) redirect("/admin/login");
  const locale = await getLocale();
  const text = messages[locale];

  return (
    <>
      <header className="adminbar">
        <div className="wrap adminbar-inner">
          <Link className="brand" href="/admin" aria-label="ITS">
            <img src="/logo.png" alt="ITS" />
          </Link>
          <nav className="admin-nav">
            <Link href="/admin">{text.adminEvents}</Link>
            <Link href="/">{text.site}</Link>
            <LangSwitch locale={locale} />
            <LogoutButton locale={locale} />
          </nav>
        </div>
      </header>
      <div className="admin-main">
        <div className="wrap">{children}</div>
      </div>
    </>
  );
}

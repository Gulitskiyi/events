import Link from "next/link";
import { LangSwitch } from "@/components/lang-switch";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export async function Header() {
  const locale = await getLocale();
  const text = messages[locale];

  return (
    <header className="top">
      <div className="wrap top-inner">
        <Link className="brand" href="/" aria-label="ITS">
          <img src="/logo.png" alt="ITS" />
        </Link>
        <nav className="nav">
          <Link href="/">{text.navEvents}</Link>
          <LangSwitch locale={locale} />
        </nav>
      </div>
    </header>
  );
}

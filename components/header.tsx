import Link from "next/link";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export async function Header({ voteHref }: { voteHref?: string }) {
  const locale = await getLocale();
  const text = messages[locale];

  return (
    <header className="top">
      <div className="wrap top-inner">
        <nav className="nav">
          <Link href="/">{text.navEvents}</Link>
          <Link href="/propose">{text.navPropose}</Link>
          {voteHref ? <Link href={voteHref}>{text.navVote}</Link> : null}
        </nav>
      </div>
    </header>
  );
}

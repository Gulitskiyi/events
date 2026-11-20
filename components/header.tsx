import Link from "next/link";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export async function Header({
  voteHref,
  variant = "solid",
}: {
  voteHref?: string;
  variant?: "overlay" | "solid";
}) {
  const locale = await getLocale();
  const text = messages[locale];
  const showLogo = variant === "solid";

  return (
    <header className={variant === "overlay" ? "top top-overlay" : "top top-solid"}>
      <div className="wrap top-inner">
        {showLogo ? (
          <Link className="brand" href="/" aria-label="ITS">
            <img src="/logo.png" alt="ITS" />
          </Link>
        ) : null}
        <nav className="nav">
          <Link href="/">{text.navEvents}</Link>
          <Link href="/propose">{text.navPropose}</Link>
          {voteHref ? <Link href={voteHref}>{text.navVote}</Link> : null}
        </nav>
      </div>
    </header>
  );
}

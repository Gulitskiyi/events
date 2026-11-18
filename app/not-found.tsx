import Link from "next/link";
import { Header } from "@/components/header";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export default async function NotFound() {
  const text = messages[await getLocale()];
  return (
    <>
      <Header />
      <main className="hero miss">
        <div style={{ position: "relative", zIndex: 1 }}>
          <p className="eyebrow">404</p>
          <h1>{text.notFoundTitle}</h1>
          <p>{text.notFoundText}</p>
          <Link className="btn" href="/">
            {text.toEvents}
          </Link>
        </div>
      </main>
    </>
  );
}

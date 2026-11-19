import Image from "next/image";
import Link from "next/link";
import { Header } from "@/components/header";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";

export default async function NotFound() {
  const text = messages[await getLocale()];
  return (
    <>
      <Header />
      <main className="miss">
        <div className="hero-media" aria-hidden="true">
          <Image
            src="/astana.jpg"
            alt=""
            width={1920}
            height={1080}
            sizes="100vw"
            quality={92}
            className="hero-banner"
          />
        </div>
        <div className="miss-copy">
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

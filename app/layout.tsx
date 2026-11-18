import type { Metadata } from "next";
import { Montserrat } from "next/font/google";
import { getLocale } from "@/lib/current-locale";
import { messages } from "@/lib/messages";
import { startScheduler } from "@/lib/scheduler";
import "./globals.css";

const montserrat = Montserrat({
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const text = messages[await getLocale()];
  return {
    title: {
      default: text.metaTitle,
      template: `%s — ${text.metaShort}`,
    },
    description: text.metaDescription,
  };
}

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  startScheduler();
  const locale = await getLocale();
  return (
    <html lang={locale}>
      <body className={montserrat.className}>{children}</body>
    </html>
  );
}

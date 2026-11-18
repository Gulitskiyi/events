import { cookies } from "next/headers";
import { LANG_COOKIE, parseLocale, type Locale } from "./locale";

export async function getLocale(): Promise<Locale> {
  const jar = await cookies();
  return parseLocale(jar.get(LANG_COOKIE)?.value);
}

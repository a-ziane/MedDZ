import { cookies } from "next/headers";
import { t, type TranslationKey } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/types";

export async function getServerLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get("patientdz-locale")?.value;
  if (locale === "fr" || locale === "ar" || locale === "en") {
    return locale;
  }
  return "en";
}

export async function getServerT() {
  const locale = await getServerLocale();
  return {
    locale,
    text: (key: TranslationKey) => t(locale, key),
  };
}

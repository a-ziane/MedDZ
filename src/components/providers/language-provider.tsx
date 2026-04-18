"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { RTL_LOCALES, t } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/types";

type LanguageContextType = {
  locale: Locale;
  dir: "ltr" | "rtl";
  setLocale: (value: Locale) => void;
  text: (key: Parameters<typeof t>[1]) => string;
};

const LanguageContext = createContext<LanguageContextType | null>(null);

export function LanguageProvider({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(() => {
    if (typeof window === "undefined") return initialLocale;
    const saved = localStorage.getItem("patientdz-locale");
    if (saved === "fr" || saved === "ar" || saved === "en") {
      return saved;
    }
    return initialLocale;
  });
  const router = useRouter();

  const setLocale = useCallback((value: Locale) => {
    setLocaleState(value);
    localStorage.setItem("patientdz-locale", value);
    document.documentElement.lang = value;
    document.documentElement.dir = RTL_LOCALES.includes(value) ? "rtl" : "ltr";
    fetch("/api/language", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ locale: value }),
    })
      .then(() => router.refresh())
      .catch(() => undefined);
  }, [router]);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo<LanguageContextType>(
    () => ({
      locale,
      dir: RTL_LOCALES.includes(locale) ? "rtl" : "ltr",
      setLocale,
      text: (key) => t(locale, key),
    }),
    [locale, setLocale],
  );

  return <LanguageContext.Provider value={value}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error("useLanguage must be used inside LanguageProvider");
  }
  return context;
}

"use client";

import { useEffect } from "react";
import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/providers/language-provider";
import type { Locale } from "@/lib/types";

export function AppProviders({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    document.documentElement.classList.add("light");
    document.body.classList.remove("dark");
    document.body.classList.add("light");
    document.documentElement.style.colorScheme = "light";
    try {
      localStorage.setItem("theme", "light");
    } catch {
      // noop
    }
  }, []);

  return (
    <LanguageProvider initialLocale={locale}>
      {children}
      <Toaster richColors position="top-right" />
    </LanguageProvider>
  );
}

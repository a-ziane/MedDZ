"use client";

import { Toaster } from "sonner";
import { LanguageProvider } from "@/components/providers/language-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import type { Locale } from "@/lib/types";

export function AppProviders({
  children,
  locale,
}: {
  children: React.ReactNode;
  locale: Locale;
}) {
  return (
    <ThemeProvider attribute="class" forcedTheme="light" enableSystem={false}>
      <LanguageProvider initialLocale={locale}>
        {children}
        <Toaster richColors position="top-right" />
      </LanguageProvider>
    </ThemeProvider>
  );
}

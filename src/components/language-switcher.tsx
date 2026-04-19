"use client";

import { Languages } from "lucide-react";
import { useLanguage } from "@/components/providers/language-provider";
import { Select } from "@/components/ui/select";
import type { Locale } from "@/lib/types";

export function LanguageSwitcher() {
  const { locale, setLocale, text } = useLanguage();

  return (
    <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-2 py-1 shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:shadow-none">
      <Languages size={16} className="text-slate-500" />
      <Select
        aria-label={text("language")}
        className="h-8 border-none bg-transparent p-0 pr-6 text-xs focus:ring-0 dark:bg-transparent"
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
      >
        <option value="en">English</option>
        <option value="fr">Francais</option>
        <option value="ar">العربية</option>
      </Select>
    </div>
  );
}

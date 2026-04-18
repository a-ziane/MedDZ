import type { Metadata } from "next";
import { cookies } from "next/headers";
import { AppProviders } from "@/components/providers/app-providers";
import { RTL_LOCALES } from "@/lib/i18n/translations";
import type { Locale } from "@/lib/types";
import "./globals.css";

export const metadata: Metadata = {
  title: "PatientDZ | Healthcare Booking Algeria",
  description:
    "PatientDZ connects patients and doctors in Algeria with fast appointments and live queue tracking.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const locale = (cookieStore.get("patientdz-locale")?.value ?? "en") as Locale;
  const dir = RTL_LOCALES.includes(locale) ? "rtl" : "ltr";

  return (
    <html
      lang={locale}
      dir={dir}
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
        <AppProviders locale={locale}>{children}</AppProviders>
      </body>
    </html>
  );
}

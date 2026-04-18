"use client";

import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { logout } from "@/lib/actions/auth";

export function Navbar({ isAuthed = false }: { isAuthed?: boolean }) {
  const { text } = useLanguage();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:bg-slate-950/80 dark:border-slate-800">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-blue-700">
          <Stethoscope size={18} /> {text("brand")}
        </Link>
        <div className="flex items-center gap-2">
          <LanguageSwitcher />
          <ModeToggle />
          {isAuthed ? (
            <form action={logout}>
              <Button size="sm" variant="outline" type="submit">
                {text("logout")}
              </Button>
            </form>
          ) : (
            <>
              <Link href="/auth/login">
                <Button size="sm" variant="outline">
                  {text("login")}
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm">{text("signup")}</Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

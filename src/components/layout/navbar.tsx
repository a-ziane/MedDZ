"use client";

import Link from "next/link";
import { Menu, Stethoscope, X } from "lucide-react";
import { useState } from "react";
import { LanguageSwitcher } from "@/components/language-switcher";
import { ModeToggle } from "@/components/mode-toggle";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/components/providers/language-provider";
import { logout } from "@/lib/actions/auth";

export function Navbar({ isAuthed = false }: { isAuthed?: boolean }) {
  const { text } = useLanguage();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200 bg-white/90 backdrop-blur dark:bg-slate-950/80 dark:border-slate-800">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold text-blue-700">
          <Stethoscope size={18} /> {text("brand")}
        </Link>

        <div className="hidden items-center gap-2 sm:flex">
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

        <Button
          type="button"
          variant="outline"
          size="sm"
          className="sm:hidden"
          aria-label="Toggle menu"
          onClick={() => setMobileOpen((v) => !v)}
        >
          {mobileOpen ? <X size={16} /> : <Menu size={16} />}
        </Button>
      </div>

      {mobileOpen && (
        <div className="border-t border-slate-200 bg-white px-4 py-3 shadow-sm sm:hidden dark:border-slate-800 dark:bg-slate-950">
          <div className="space-y-3">
            <div className="flex flex-col items-stretch gap-2">
              <LanguageSwitcher />
              <ModeToggle />
            </div>

            {isAuthed ? (
              <form action={logout} onSubmit={() => setMobileOpen(false)}>
                <Button size="sm" variant="outline" type="submit" className="w-full">
                  {text("logout")}
                </Button>
              </form>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link href="/auth/login" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" variant="outline" className="w-full">
                    {text("login")}
                  </Button>
                </Link>
                <Link href="/auth/signup" onClick={() => setMobileOpen(false)}>
                  <Button size="sm" className="w-full">
                    {text("signup")}
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}

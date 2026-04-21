import Link from "next/link";
import { type LucideIcon } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export function DashboardShell({
  title,
  pathname,
  nav,
  children,
}: {
  title: string;
  pathname: string;
  nav: NavItem[];
  children: React.ReactNode;
}) {
  const isPatientShell = pathname.startsWith("/patient");
  const isActive = (href: string) => {
    if (href === "/patient" || href === "/doctor" || href === "/admin") {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
      <Navbar isAuthed />
      <div className="mx-auto grid w-full max-w-7xl gap-4 px-4 py-6 sm:grid-cols-[240px_1fr] sm:px-6">
        <aside
          className={cn(
            "min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm dark:border-slate-800 dark:bg-slate-900",
            isPatientShell && "hidden sm:block",
          )}
        >
          <h2 className="px-2 pb-2 text-sm font-semibold text-slate-500">{title}</h2>
          <nav className="space-y-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-2 rounded-xl px-3 py-2 text-sm transition",
                    active
                      ? "bg-blue-50 text-blue-700"
                      : "text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon size={16} />
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </aside>
        <main className={cn("min-w-0 space-y-4", isPatientShell && "pb-24 sm:pb-0")}>{children}</main>
      </div>

      {isPatientShell && (
        <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 backdrop-blur sm:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <div className="mx-auto grid max-w-7xl grid-cols-4 gap-1">
            {nav.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex flex-col items-center justify-center rounded-xl px-1 py-2 text-[11px] font-medium leading-tight transition",
                    active
                      ? "bg-blue-50 text-blue-700 dark:bg-slate-800 dark:text-blue-300"
                      : "text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800",
                  )}
                >
                  <Icon size={16} />
                  <span className="mt-1 text-center">{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}
    </div>
  );
}

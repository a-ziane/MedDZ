import { cn } from "@/lib/utils";

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-blue-100/50 dark:border-slate-800 dark:bg-slate-900 dark:shadow-none",
        className,
      )}
      {...props}
    />
  );
}

import Link from "next/link";
import { Navbar } from "@/components/layout/navbar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { getServerT } from "@/lib/i18n/server";
import { requireRole } from "@/lib/auth";

export default async function PendingApprovalPage() {
  await requireRole(["doctor"]);
  const { text } = await getServerT();

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar isAuthed />
      <div className="mx-auto flex w-full max-w-2xl px-4 py-10 sm:px-0">
        <Card className="w-full space-y-4">
          <h1 className="text-2xl font-semibold">{text("doctorPendingTitle")}</h1>
          <p className="text-slate-600 dark:text-slate-300">{text("doctorPendingBody")}</p>
          <Link href="/">
            <Button variant="outline">{text("backToLogin")}</Button>
          </Link>
        </Card>
      </div>
    </div>
  );
}

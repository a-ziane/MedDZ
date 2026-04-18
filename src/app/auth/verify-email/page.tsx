"use client";

import { useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { useLanguage } from "@/components/providers/language-provider";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/client";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const { text } = useLanguage();
  const [loading, setLoading] = useState(false);

  const email = searchParams.get("email") ?? "";

  async function resend() {
    if (!email) return;
    setLoading(true);
    const supabase = createClient();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/login` },
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success(text("confirmationSent"));
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="mx-auto flex w-full max-w-lg px-4 py-10 sm:px-0">
        <Card className="w-full space-y-4">
          <h1 className="text-2xl font-semibold">{text("emailConfirmTitle")}</h1>
          <p className="text-sm text-slate-600 dark:text-slate-300">{text("emailConfirmBody")}</p>
          {email ? <p className="text-sm font-medium text-blue-700">{email}</p> : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={resend} disabled={loading || !email}>
              {loading ? "..." : text("resendEmail")}
            </Button>
            <Link href="/auth/login">
              <Button variant="outline">{text("backToLogin")}</Button>
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}

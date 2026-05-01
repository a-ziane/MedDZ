"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function roleRedirect(role: string) {
  if (role === "admin") return "/admin";
  if (role === "doctor") return "/doctor";
  return "/patient";
}

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { text } = useLanguage();
  const [loading, setLoading] = useState(false);
  const initial = searchParams.get("type") === "doctor" ? "doctor" : "patient";
  const [accountType, setAccountType] = useState<"patient" | "doctor">(initial);

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const supabase = createClient();

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("confirm")) {
        toast.error(text("loginFailedTryAgain"));
      } else if (msg.includes("invalid login credentials")) {
        try {
          const result = await fetch("/api/auth/account-exists", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = (await result.json()) as { exists?: boolean };
          toast.error(data.exists ? text("wrongPassword") : text("emailNoAccount"));
        } catch {
          toast.error(text("loginFailedTryAgain"));
        }
      } else {
        toast.error(error.message || text("loginFailedTryAgain"));
      }
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast.error(text("loginFailedTryAgain"));
      setLoading(false);
      return;
    }

    const { data: profile } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role && profile.role !== accountType && profile.role !== "admin") {
      toast.error(`This account is registered as ${profile.role}.`);
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    toast.success("Welcome back");
    router.push(roleRedirect(profile?.role ?? "patient"));
    router.refresh();
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="mx-auto flex w-full max-w-md px-4 py-10 sm:px-0">
        <Card className="w-full space-y-4">
          <div className="space-y-2">
            <Badge variant="default">{text("chooseAccountType")}</Badge>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  accountType === "patient"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
                onClick={() => setAccountType("patient")}
              >
                {text("patientLogin")}
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  accountType === "doctor"
                    ? "border-blue-300 bg-blue-50 text-blue-700"
                    : "border-slate-200 bg-slate-100 text-slate-500"
                }`}
                onClick={() => setAccountType("doctor")}
              >
                {text("doctorLogin")}
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-semibold">
            {accountType === "patient" ? text("patientLogin") : text("doctorLogin")}
          </h1>
          <form action={handleSubmit} className="space-y-3">
            <Input name="email" type="email" placeholder={text("email")} required />
            <Input name="password" type="password" placeholder={text("password")} required />
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? text("signingIn") : text("login")}
            </Button>
          </form>
          <p className="text-sm text-slate-500">
            {text("newHere")} {" "}
            <Link href={`/auth/signup?type=${accountType}`} className="text-blue-600 hover:underline">
              {text("createAccount")}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Navbar } from "@/components/layout/navbar";
import { useLanguage } from "@/components/providers/language-provider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { SPECIALTIES, WILAYAS } from "@/lib/constants";
import { createClient } from "@/lib/supabase/client";

export default function SignUpPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { text } = useLanguage();
  const [loading, setLoading] = useState(false);
  const initial = searchParams.get("type") === "doctor" ? "doctor" : "patient";
  const [accountType, setAccountType] = useState<"patient" | "doctor">(initial);

  const pageTitle = useMemo(
    () => (accountType === "patient" ? text("patientSignup") : text("doctorSignup")),
    [accountType, text],
  );

  async function handleSubmit(formData: FormData) {
    setLoading(true);
    const supabase = createClient();

    const email = String(formData.get("email") ?? "");
    const password = String(formData.get("password") ?? "");
    const fullName = String(formData.get("full_name") ?? "");
    const phone = String(formData.get("phone") ?? "");
    const specialty = String(formData.get("specialty") ?? "");
    const clinicName = String(formData.get("clinic_name") ?? "");
    const wilaya = String(formData.get("wilaya") ?? "");
    const city = String(formData.get("city") ?? "");
    const address = String(formData.get("address") ?? "");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          role: accountType,
          full_name: fullName,
          phone,
          language: "en",
          specialty,
          clinic_name: clinicName,
          wilaya,
          city,
          address,
        },
        emailRedirectTo: `${window.location.origin}/auth/login`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    router.push(`/auth/verify-email?email=${encodeURIComponent(email)}&type=${accountType}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Navbar />
      <div className="mx-auto flex w-full max-w-lg px-4 py-10 sm:px-0">
        <Card className="w-full space-y-4">
          <div className="space-y-2">
            <Badge variant="default">{text("chooseAccountType")}</Badge>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  accountType === "patient" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200"
                }`}
                onClick={() => setAccountType("patient")}
              >
                {text("patientSignup")}
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm ${
                  accountType === "doctor" ? "border-blue-300 bg-blue-50 text-blue-700" : "border-slate-200"
                }`}
                onClick={() => setAccountType("doctor")}
              >
                {text("doctorSignup")}
              </button>
            </div>
          </div>

          <h1 className="text-2xl font-semibold">{pageTitle}</h1>
          <form action={handleSubmit} className="grid gap-3">
            <Input name="full_name" placeholder={text("fullName")} required />
            <Input name="email" type="email" placeholder={text("email")} required />
            <Input name="phone" placeholder={text("phone")} />
            <Input name="password" type="password" minLength={8} placeholder={text("password")} required />

            {accountType === "doctor" && (
              <>
                <Select name="specialty" defaultValue="" required>
                  <option value="">{text("specialty")}</option>
                  {SPECIALTIES.map((specialty) => (
                    <option key={specialty} value={specialty}>
                      {specialty}
                    </option>
                  ))}
                </Select>
                <Input name="clinic_name" placeholder={text("clinicName")} required />
                <Select name="wilaya" defaultValue="" required>
                  <option value="">{text("wilaya")}</option>
                  {WILAYAS.map((wilaya) => (
                    <option key={wilaya} value={wilaya}>
                      {wilaya}
                    </option>
                  ))}
                </Select>
                <Input name="city" placeholder={text("city")} required />
                <Input name="address" placeholder={text("address")} required />
              </>
            )}

            <Button type="submit" className="mt-2 w-full" disabled={loading}>
              {loading ? text("creatingAccount") : text("createAccount")}
            </Button>
          </form>
          <p className="text-sm text-slate-500">
            {text("alreadyHaveAccount")} {" "}
            <Link href={`/auth/login?type=${accountType}`} className="text-blue-600 hover:underline">
              {text("login")}
            </Link>
          </p>
        </Card>
      </div>
    </div>
  );
}

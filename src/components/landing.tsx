"use client";

import Link from "next/link";
import { Activity, CalendarClock, ShieldCheck, Stethoscope, UsersRound } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useLanguage } from "@/components/providers/language-provider";

export function LandingPage() {
  const { text } = useLanguage();

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,#dbeafe_0%,#eff6ff_30%,#f8fafc_100%)] dark:bg-[radial-gradient(circle_at_top,#0f172a_0%,#020617_60%,#020617_100%)]">
      <Navbar />
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-10 sm:px-6 lg:py-16">
        <div className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div className="space-y-5">
            <Badge className="w-fit">{text("builtForAlgeria")}</Badge>
            <h1 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-5xl">
              {text("heroTitle")}
            </h1>
            <p className="max-w-2xl text-lg text-slate-600 dark:text-slate-300">{text("tagline")}</p>
            <div className="flex flex-wrap gap-3">
              <Link href="/patient/doctors">
                <Button size="lg">{text("findDoctor")}</Button>
              </Link>
              <Link href="/auth/signup?type=doctor">
                <Button size="lg" variant="outline">
                  {text("joinDoctor")}
                </Button>
              </Link>
            </div>
          </div>

          <Card className="grid gap-4 p-6">
            <div className="flex items-start gap-3">
              <CalendarClock className="text-blue-600" />
              <div>
                <h3 className="font-semibold">{text("step1")}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text("step2")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Activity className="text-blue-600" />
              <div>
                <h3 className="font-semibold">{text("step3")}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text("trust3Body")}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <ShieldCheck className="text-blue-600" />
              <div>
                <h3 className="font-semibold">{text("trust1Title")}</h3>
                <p className="text-sm text-slate-600 dark:text-slate-300">{text("trust1Body")}</p>
              </div>
            </div>
          </Card>
        </div>

        <Card className="space-y-5 p-6">
          <h2 className="text-xl font-semibold">{text("howItWorks")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { icon: Stethoscope, title: text("step1"), body: text("trust1Body") },
              { icon: CalendarClock, title: text("step2"), body: text("trust2Body") },
              { icon: Activity, title: text("step3"), body: text("trust3Body") },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.title} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <Icon className="mb-2 text-blue-600" size={20} />
                  <h3 className="font-semibold">{item.title}</h3>
                  <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{item.body}</p>
                </div>
              );
            })}
          </div>
        </Card>

        <Card className="space-y-5 p-6">
          <h2 className="text-xl font-semibold">{text("trustTitle")}</h2>
          <div className="grid gap-4 md:grid-cols-3">
            {[
              { label: text("trust1Title"), value: "10+", icon: UsersRound },
              { label: text("trust2Title"), value: "30+", icon: CalendarClock },
              { label: text("trust3Title"), value: "Live", icon: Activity },
            ].map((item) => {
              const Icon = item.icon;
              return (
                <div key={item.label} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
                  <div>
                    <p className="text-sm text-slate-500">{item.label}</p>
                    <p className="text-3xl font-bold text-blue-700">{item.value}</p>
                  </div>
                  <Icon className="text-blue-400" size={22} />
                </div>
              );
            })}
          </div>
        </Card>
      </section>
    </div>
  );
}

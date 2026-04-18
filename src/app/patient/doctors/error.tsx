"use client";

import { useLanguage } from "@/components/providers/language-provider";
import { Card } from "@/components/ui/card";

export default function DoctorsErrorPage({ error }: { error: Error }) {
  const { text } = useLanguage();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Card>
        <p className="text-sm text-red-600">{text("doctorsLoadError")}</p>
        <p className="text-xs text-slate-500">{error.message}</p>
      </Card>
    </div>
  );
}

import { Card } from "@/components/ui/card";
import { getServerT } from "@/lib/i18n/server";

export default async function LoadingDoctorsPage() {
  const { text } = await getServerT();
  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">
      <Card>
        <p className="text-sm text-slate-500">{text("loadingDoctors")}</p>
      </Card>
    </div>
  );
}

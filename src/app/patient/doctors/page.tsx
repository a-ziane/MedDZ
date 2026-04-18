import Link from "next/link";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { requireRole } from "@/lib/auth";
import { SPECIALTIES, WILAYAS } from "@/lib/constants";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";

export default async function PatientDoctorsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  await requireRole(["patient"]);
  const { text } = await getServerT();
  const params = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("doctors")
    .select(
      "id, specialty, clinic_name, city, wilaya, approved, suspended, average_consultation_minutes, users!doctors_user_id_fkey(full_name), availability(id,weekday,start_time)",
    )
    .eq("approved", true)
    .eq("suspended", false)
    .order("created_at", { ascending: false });

  if (params.specialty) query = query.eq("specialty", params.specialty);
  if (params.wilaya) query = query.eq("wilaya", params.wilaya);
  if (params.city) query = query.ilike("city", `%${params.city}%`);

  const { data: doctors, error } = await query.limit(50);

  const today = new Date().getDay();
  const filtered = (doctors ?? []).filter((doctor) => {
    const row = doctor as {
      users?: { full_name?: string } | null;
      availability?: { weekday: number; start_time: string }[];
    };

    if (params.name) {
      const fullName = row.users?.full_name ?? "";
      if (!fullName.toLowerCase().includes(params.name.toLowerCase())) {
        return false;
      }
    }

    if (params.today === "1") {
      const hasTodaySlot = (row.availability ?? []).some((slot) => slot.weekday === today);
      if (!hasTodaySlot) return false;
    }

    return true;
  });

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient/doctors" nav={buildPatientNav(text)}>
      <Card>
        <h1 className="text-2xl font-bold">{text("searchDoctors")}</h1>
        <form className="mt-4 grid gap-2 md:grid-cols-6">
          <Select name="specialty" defaultValue={params.specialty ?? ""}>
            <option value="">{text("specialty")}</option>
            {SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </Select>
          <Select name="wilaya" defaultValue={params.wilaya ?? ""}>
            <option value="">{text("wilaya")}</option>
            {WILAYAS.map((wilaya) => (
              <option key={wilaya} value={wilaya}>
                {wilaya}
              </option>
            ))}
          </Select>
          <Input name="city" defaultValue={params.city ?? ""} placeholder={text("city")} />
          <Input name="name" defaultValue={params.name ?? ""} placeholder={text("doctor")} />
          <label className="flex items-center gap-2 rounded-xl border border-slate-200 px-3 text-sm">
            <input type="checkbox" name="today" value="1" defaultChecked={params.today === "1"} />
            {text("availableToday")}
          </label>
          <button className="h-10 rounded-xl bg-blue-600 px-4 text-sm font-medium text-white">
            {text("searchDoctors")}
          </button>
        </form>
      </Card>

      {error ? (
        <Card>
          <p className="text-sm text-red-600">{text("doctorsLoadError")}</p>
          <p className="text-xs text-slate-500">{error.message}</p>
        </Card>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        {filtered.length === 0 && (
          <Card className="md:col-span-2">
            <p className="text-sm text-slate-500">{text("noDoctorsFound")}</p>
          </Card>
        )}
        {filtered.map((doctor) => {
          const row = doctor as {
            id: string;
            specialty?: string;
            clinic_name?: string;
            city?: string;
            users?: { full_name?: string } | null;
            availability?: { start_time?: string }[];
          };
          const fullName = row.users?.full_name ?? text("doctor");
          const nextSlot = row.availability?.[0]?.start_time ?? "--:--";

          return (
            <Card key={row.id} className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold">Dr. {fullName}</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300">{row.specialty}</p>
                </div>
                <Badge variant="success">{text("approved")}</Badge>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-300">
                {row.clinic_name} • {row.city}
              </p>
              <p className="text-sm text-slate-600 dark:text-slate-300">{text("nextSlot")}: {nextSlot}</p>
              <Link href={`/patient/doctors/${row.id}`} className="text-sm text-blue-600 hover:underline">
                {text("viewProfileBook")}
              </Link>
            </Card>
          );
        })}
      </div>
    </DashboardShell>
  );
}

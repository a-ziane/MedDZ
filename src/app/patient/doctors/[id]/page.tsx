import { notFound } from "next/navigation";
import { addDays, format } from "date-fns";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildPatientNav } from "@/lib/nav";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { BookingScheduler } from "@/components/booking-scheduler";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function weekdayLabelFromSlot(slotWeekday: number, locale: string) {
  const asJsDay = slotWeekday >= 1 && slotWeekday <= 7 ? slotWeekday % 7 : slotWeekday;
  return new Intl.DateTimeFormat(locale, { weekday: "long" }).format(
    new Date(Date.UTC(2026, 3, 12 + asJsDay)),
  );
}

export default async function DoctorProfilePage({ params }: { params: Promise<{ id: string }> }) {
  await requireRole(["patient"]);
  const { locale, text } = await getServerT();
  const supabase = await createClient();
  const { id } = await params;

  const { data: doctor } = await supabase
    .from("doctors")
    .select(
      "id, specialty, clinic_name, wilaya, city, address, bio, languages_spoken, average_consultation_minutes, profile_photo, approved, suspended, users!doctors_user_id_fkey(full_name), availability(id,weekday,start_time,end_time,slot_minutes)",
    )
    .eq("id", id)
    .eq("approved", true)
    .eq("suspended", false)
    .single();

  const fromDate = format(new Date(), "yyyy-MM-dd");
  const toDate = format(addDays(new Date(), 35), "yyyy-MM-dd");
  const adminSupabase = createAdminClient();
  const { data: booked } = await adminSupabase
    .from("appointments")
    .select("appointment_date, appointment_time")
    .eq("doctor_id", id)
    .gte("appointment_date", fromDate)
    .lte("appointment_date", toDate)
    .in("status", ["pending", "approved"]);

  if (!doctor) {
    notFound();
  }

  const doctorUser = Array.isArray(doctor.users) ? doctor.users[0] : doctor.users;
  const fullName = doctorUser?.full_name ?? text("doctor");
  const avgWait = `${doctor.average_consultation_minutes} min ${text("perPatient")}`;
  const initials = fullName
    .split(" ")
    .slice(0, 2)
    .map((part: string) => part[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <DashboardShell title={text("dashboardPatient")} pathname="/patient/doctors" nav={buildPatientNav(text)}>
      <Card className="w-full max-w-full space-y-4 overflow-hidden bg-gradient-to-br from-white via-blue-50/50 to-white">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
          <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-blue-100 text-2xl font-semibold text-blue-700">
            {doctor.profile_photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doctor.profile_photo} alt={fullName} className="h-full w-full object-cover" />
            ) : (
              <span>{initials || "DR"}</span>
            )}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="break-words text-2xl font-bold">Dr. {fullName}</h1>
              <Badge variant="success">{text("approved")}</Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-300">{doctor.specialty}</p>
            <p className="break-words text-sm text-slate-500">
              {doctor.clinic_name} • {doctor.city}, {doctor.wilaya}
            </p>
          </div>
        </div>
        <p className="text-sm text-slate-600 dark:text-slate-300">{doctor.bio ?? text("doctorBioFallback")}</p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {text("languagesLabel")}: {doctor.languages_spoken ?? "Arabic, French"}
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-300">
          {text("averageWaitLabel")}: {avgWait}
        </p>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">{text("availabilityTitle")}</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          {(doctor.availability ?? []).length === 0 && (
            <p className="text-sm text-slate-500">{text("noAvailability")}</p>
          )}
          {(doctor.availability ?? []).map((slot) => (
            <div key={slot.id} className="rounded-xl border border-slate-200 p-3 text-sm">
              <p>
                {text("day")}: {weekdayLabelFromSlot(slot.weekday, locale)}
              </p>
              <p>
                {slot.start_time} - {slot.end_time} ({slot.slot_minutes} min)
              </p>
            </div>
          ))}
        </div>
      </Card>

      <BookingScheduler
        doctorId={doctor.id}
        availability={doctor.availability ?? []}
        bookedSlots={(booked ?? []).map((b) => ({
          appointment_date: b.appointment_date,
          appointment_time: b.appointment_time,
        }))}
      />
    </DashboardShell>
  );
}

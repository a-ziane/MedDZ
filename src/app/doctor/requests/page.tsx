import { approveAppointment, rejectAppointment } from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function DoctorRequestsPage() {
  const user = await requireRole(["doctor"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: pending } = doctor
    ? await supabase
        .from("appointments")
        .select("id, appointment_date, appointment_time, message_optional, patients(users(full_name))")
        .eq("doctor_id", doctor.id)
        .eq("status", "pending")
        .order("appointment_date", { ascending: true })
    : { data: [] as unknown[] };
  const requests = (pending ?? []) as {
    id: string;
    appointment_date: string;
    appointment_time: string;
    message_optional?: string | null;
    patients?: { users?: { full_name?: string }[] }[];
  }[];

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor/requests" nav={buildDoctorNav(text)}>
      <Card>
        <h1 className="mb-3 text-2xl font-bold">Appointment Requests</h1>
        <div className="space-y-2">
          {requests.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No pending requests.
            </p>
          )}
          {requests.map((request) => {
            const patientName =
              (request.patients?.[0]?.users?.[0]?.full_name as string | undefined) ?? "Patient";

            return (
              <div key={request.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium">{patientName}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {request.appointment_date} at {request.appointment_time}
                </p>
                {request.message_optional && (
                  <p className="mt-1 text-sm text-slate-500">Message: {request.message_optional}</p>
                )}
                <div className="mt-3 flex gap-2">
                  <form action={approveAppointment}>
                    <input type="hidden" name="appointment_id" value={request.id} />
                    <Button type="submit" size="sm">
                      Approve
                    </Button>
                  </form>
                  <form action={rejectAppointment}>
                    <input type="hidden" name="appointment_id" value={request.id} />
                    <Button type="submit" variant="outline" size="sm">
                      Reject
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </DashboardShell>
  );
}

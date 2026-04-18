import { moderateDoctor } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildAdminNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default async function AdminHomePage() {
  await requireRole(["admin"]);
  const { text } = await getServerT();
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ count: totalUsers }, { count: pendingDoctors }, { count: approvedDoctors }, { count: todaysAppointments }] =
    await Promise.all([
      supabase.from("users").select("id", { count: "exact", head: true }),
      supabase
        .from("doctors")
        .select("id", { count: "exact", head: true })
        .eq("approved", false)
        .eq("suspended", false),
      supabase
        .from("doctors")
        .select("id", { count: "exact", head: true })
        .eq("approved", true)
        .eq("suspended", false),
      supabase
        .from("appointments")
        .select("id", { count: "exact", head: true })
        .eq("appointment_date", today),
    ]);

  const { data: pending } = await supabase
    .from("doctors")
    .select("id, specialty, clinic_name, city, users(full_name)")
    .eq("approved", false)
    .eq("suspended", false)
    .order("created_at", { ascending: false })
    .limit(10);

  const metrics = [
    { label: "Total users", value: totalUsers ?? 0 },
    { label: "Doctors pending approval", value: pendingDoctors ?? 0 },
    { label: "Approved doctors", value: approvedDoctors ?? 0 },
    { label: "Appointments today", value: todaysAppointments ?? 0 },
  ];

  return (
    <DashboardShell title={text("dashboardAdmin")} pathname="/admin" nav={buildAdminNav(text)}>
      <div className="grid gap-4 md:grid-cols-4">
        {metrics.map((metric) => (
          <Card key={metric.label}>
            <p className="text-sm text-slate-500">{metric.label}</p>
            <p className="text-3xl font-bold text-blue-700">{metric.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Doctor Approval Queue</h2>
        <div className="space-y-2">
          {(pending ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No pending doctors.
            </p>
          )}
          {(pending ?? []).map((doctor) => {
            const name = ((doctor.users as { full_name?: string }[])[0]?.full_name ?? "Doctor") as string;
            return (
              <div key={doctor.id} className="rounded-xl border border-slate-200 p-3">
                <p className="font-medium">Dr. {name}</p>
                <p className="text-sm text-slate-600 dark:text-slate-300">
                  {doctor.specialty} • {doctor.clinic_name} • {doctor.city}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <form action={moderateDoctor}>
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <input type="hidden" name="action" value="approve" />
                    <Button size="sm" type="submit">
                      Approve
                    </Button>
                  </form>
                  <form action={moderateDoctor}>
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <input type="hidden" name="action" value="reject" />
                    <Button size="sm" type="submit" variant="outline">
                      Reject
                    </Button>
                  </form>
                  <form action={moderateDoctor}>
                    <input type="hidden" name="doctor_id" value={doctor.id} />
                    <input type="hidden" name="action" value="suspend" />
                    <Button size="sm" type="submit" variant="danger">
                      Suspend
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

import { removeAvailability, saveAvailability } from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default async function DoctorAvailabilityPage() {
  const user = await requireRole(["doctor"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select("id")
    .eq("user_id", user.id)
    .single();

  const { data: availability } = doctor
    ? await supabase
        .from("availability")
        .select("id, weekday, start_time, end_time, slot_minutes")
        .eq("doctor_id", doctor.id)
        .order("weekday", { ascending: true })
    : { data: [] as unknown[] };

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor/availability" nav={buildDoctorNav(text)}>
      <Card>
        <h1 className="text-2xl font-bold">Availability Manager</h1>
        <form action={saveAvailability} className="mt-4 grid gap-2 md:grid-cols-5">
          <Select name="weekday" defaultValue="1">
            <option value="0">Sunday</option>
            <option value="1">Monday</option>
            <option value="2">Tuesday</option>
            <option value="3">Wednesday</option>
            <option value="4">Thursday</option>
            <option value="5">Friday</option>
            <option value="6">Saturday</option>
          </Select>
          <Input type="time" name="start_time" required />
          <Input type="time" name="end_time" required />
          <Input type="number" name="slot_minutes" min={10} max={60} defaultValue={15} required />
          <Button type="submit">Add Slot</Button>
        </form>
      </Card>

      <Card>
        <h2 className="mb-3 text-lg font-semibold">Current Slots</h2>
        <div className="space-y-2">
          {(availability ?? []).length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No availability defined yet.
            </p>
          )}
          {(availability ?? []).map((slot) => (
            <div
              key={(slot as { id: string }).id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3"
            >
              <p className="text-sm">
                Day {(slot as { weekday: number }).weekday}: {(slot as { start_time: string }).start_time} -{" "}
                {(slot as { end_time: string }).end_time} ({(slot as { slot_minutes: number }).slot_minutes} min)
              </p>
              <form action={removeAvailability}>
                <input type="hidden" name="availability_id" value={(slot as { id: string }).id} />
                <Button type="submit" variant="outline" size="sm">
                  Remove
                </Button>
              </form>
            </div>
          ))}
        </div>
      </Card>
    </DashboardShell>
  );
}

import { moderateDoctor } from "@/lib/actions/admin";
import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildAdminNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";

export default async function AdminDoctorsPage() {
  await requireRole(["admin"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: doctors } = await supabase
    .from("doctors")
    .select("id, specialty, clinic_name, city, approved, suspended, users(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <DashboardShell title={text("dashboardAdmin")} pathname="/admin/doctors" nav={buildAdminNav(text)}>
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Manage Doctors</h1>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Specialty</Th>
                <Th>Clinic</Th>
                <Th>Status</Th>
                <Th>Actions</Th>
              </tr>
            </thead>
            <tbody>
              {(doctors ?? []).map((doctor) => {
                const name = ((doctor.users as { full_name?: string }[])[0]?.full_name ?? "Doctor") as string;
                return (
                  <tr key={doctor.id} className="border-t border-slate-200">
                    <Td>Dr. {name}</Td>
                    <Td>{doctor.specialty}</Td>
                    <Td>
                      {doctor.clinic_name} • {doctor.city}
                    </Td>
                    <Td>
                      {doctor.suspended ? (
                        <Badge variant="danger">Suspended</Badge>
                      ) : doctor.approved ? (
                        <Badge variant="success">Approved</Badge>
                      ) : (
                        <Badge variant="warning">Pending</Badge>
                      )}
                    </Td>
                    <Td>
                      <div className="flex gap-2">
                        <form action={moderateDoctor}>
                          <input type="hidden" name="doctor_id" value={doctor.id} />
                          <input type="hidden" name="action" value="approve" />
                          <Button size="sm" type="submit" variant="outline">
                            Approve
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
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      </Card>
    </DashboardShell>
  );
}

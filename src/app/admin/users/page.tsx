import { requireRole } from "@/lib/auth";
import { getServerT } from "@/lib/i18n/server";
import { buildAdminNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Table, Td, Th } from "@/components/ui/table";

export default async function AdminUsersPage() {
  await requireRole(["admin"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: users } = await supabase
    .from("users")
    .select("id, full_name, email, role, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  return (
    <DashboardShell title={text("dashboardAdmin")} pathname="/admin/users" nav={buildAdminNav(text)}>
      <Card>
        <h1 className="mb-4 text-2xl font-bold">Manage Users</h1>
        <div className="overflow-x-auto">
          <Table>
            <thead>
              <tr>
                <Th>Name</Th>
                <Th>Email</Th>
                <Th>Role</Th>
                <Th>Created</Th>
              </tr>
            </thead>
            <tbody>
              {(users ?? []).map((user) => (
                <tr key={user.id} className="border-t border-slate-200">
                  <Td>{user.full_name}</Td>
                  <Td>{user.email}</Td>
                  <Td>
                    <Badge variant={user.role === "admin" ? "default" : user.role === "doctor" ? "warning" : "muted"}>
                      {user.role}
                    </Badge>
                  </Td>
                  <Td>{new Date(user.created_at).toLocaleDateString()}</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        </div>
      </Card>
    </DashboardShell>
  );
}

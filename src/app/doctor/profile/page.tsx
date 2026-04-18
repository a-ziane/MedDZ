import { updateDoctorProfile } from "@/lib/actions/doctor";
import { requireRole } from "@/lib/auth";
import { SPECIALTIES, WILAYAS } from "@/lib/constants";
import { getServerT } from "@/lib/i18n/server";
import { buildDoctorNav } from "@/lib/nav";
import { createClient } from "@/lib/supabase/server";
import { DashboardShell } from "@/components/layout/dashboard-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export default async function DoctorProfileSettingsPage() {
  const user = await requireRole(["doctor"]);
  const { text } = await getServerT();
  const supabase = await createClient();

  const { data: doctor } = await supabase
    .from("doctors")
    .select(
      "specialty, clinic_name, wilaya, city, address, bio, languages_spoken, average_consultation_minutes, profile_photo",
    )
    .eq("user_id", user.id)
    .single();

  return (
    <DashboardShell title={text("dashboardDoctor")} pathname="/doctor/profile" nav={buildDoctorNav(text)}>
      <Card>
        <h1 className="mb-3 text-2xl font-bold">Profile Settings</h1>
        <form action={updateDoctorProfile} className="grid gap-3 md:grid-cols-2">
          <Select name="specialty" defaultValue={doctor?.specialty ?? ""}>
            <option value="">Select specialty</option>
            {SPECIALTIES.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </Select>
          <Input name="clinic_name" defaultValue={doctor?.clinic_name ?? ""} placeholder="Clinic name" required />
          <Select name="wilaya" defaultValue={doctor?.wilaya ?? ""}>
            <option value="">Select wilaya</option>
            {WILAYAS.map((wilaya) => (
              <option key={wilaya} value={wilaya}>
                {wilaya}
              </option>
            ))}
          </Select>
          <Input name="city" defaultValue={doctor?.city ?? ""} placeholder="City" required />
          <Input name="address" defaultValue={doctor?.address ?? ""} placeholder="Address" required />
          <Input name="languages_spoken" defaultValue={doctor?.languages_spoken ?? "Arabic, French"} placeholder="Languages" />
          <Input
            name="average_consultation_minutes"
            type="number"
            min={5}
            max={90}
            defaultValue={doctor?.average_consultation_minutes ?? 15}
          />
          <Input name="profile_photo" type="url" defaultValue={doctor?.profile_photo ?? ""} placeholder="Profile photo URL" />
          <div className="md:col-span-2">
            <Textarea name="bio" defaultValue={doctor?.bio ?? ""} placeholder="Short bio" maxLength={500} />
          </div>
          <div className="md:col-span-2">
            <Button type="submit">Save Profile</Button>
          </div>
        </form>
      </Card>
    </DashboardShell>
  );
}

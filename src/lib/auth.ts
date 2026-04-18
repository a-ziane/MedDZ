import { redirect } from "next/navigation";
import type { Role } from "@/lib/types";
import { createClient } from "@/lib/supabase/server";

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const { data: user } = await supabase
    .from("users")
    .select("id, role, full_name, email, phone, language")
    .eq("id", authUser.id)
    .single();

  return user;
}

export async function requireRole(allowed: Role[]) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/auth/login");
  }

  if (!allowed.includes(user.role)) {
    redirect("/");
  }

  return user;
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string };
    const email = (body.email ?? "").trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    const admin = createAdminClient();
    const { data, error } = await admin
      .from("users")
      .select("id")
      .eq("email", email)
      .limit(1)
      .maybeSingle();

    if (error) {
      return NextResponse.json({ exists: false }, { status: 200 });
    }

    return NextResponse.json({ exists: Boolean(data?.id) }, { status: 200 });
  } catch {
    return NextResponse.json({ exists: false }, { status: 200 });
  }
}


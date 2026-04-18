import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/middleware";

const protectedPrefixes = ["/patient", "/doctor", "/admin"];

export async function middleware(request: NextRequest) {
  const { supabase, response } = createClient(request);
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isProtected = protectedPrefixes.some((prefix) => pathname.startsWith(prefix));

  if (!isProtected) {
    return response;
  }

  if (!user) {
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    return NextResponse.redirect(url);
  }

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!profile) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/admin") && profile.role !== "admin") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/doctor") && profile.role !== "doctor") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/patient") && profile.role !== "patient") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (pathname.startsWith("/doctor") && profile.role === "doctor") {
    const isPendingPage = pathname.startsWith("/doctor/pending-approval");
    const { data: doctorProfile } = await supabase
      .from("doctors")
      .select("approved, suspended")
      .eq("user_id", user.id)
      .single();

    if (!doctorProfile || doctorProfile.suspended) {
      return NextResponse.redirect(new URL("/", request.url));
    }

    if (!doctorProfile.approved && !isPendingPage) {
      return NextResponse.redirect(new URL("/doctor/pending-approval", request.url));
    }

    if (doctorProfile.approved && isPendingPage) {
      return NextResponse.redirect(new URL("/doctor", request.url));
    }
  }

  return response;
}

export const config = {
  matcher: ["/patient/:path*", "/doctor/:path*", "/admin/:path*"],
};

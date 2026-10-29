import { NextResponse, type NextRequest } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const destination = request.nextUrl.searchParams.get("next") === "/admin" ? "/admin" : "/dashboard";
  const loginPath = destination === "/admin" ? "/admin/login" : "/login";
  const supabase = await createServerSupabaseClient();

  if (!code || !supabase) {
    return NextResponse.redirect(new URL(`${loginPath}?error=confirmation`, request.url));
  }

  const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
  if (exchangeError) {
    console.error("Authentication callback failed:", exchangeError.message);
    return NextResponse.redirect(new URL(`${loginPath}?error=confirmation`, request.url));
  }

  if (destination === "/admin") {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error("Admin identity could not be verified:", userError.message);
    }

    const { data: profile, error: profileError } = user
      ? await supabase.from("profiles").select("role").eq("id", user.id).single()
      : { data: null, error: userError };

    if (profileError) {
      console.error("Admin permission could not be checked:", profileError.message);
    }
    if (!profile || !["moderator", "admin"].includes(profile.role)) {
      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) console.error("Unauthorized admin sign-in could not be cleared:", signOutError.message);
      const reason = profileError ? "permissions" : "forbidden";
      return NextResponse.redirect(new URL(`/admin/login?error=${reason}`, request.url));
    }
  }

  return NextResponse.redirect(new URL(destination, request.url));
}

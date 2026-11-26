import { NextRequest, NextResponse } from "next/server";
import { getWorkspacePool } from "../../../../lib/server/db/workspace-pool.ts";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route-client.ts";

export async function POST(request: NextRequest) {
  const routeClient = createSupabaseRouteClient(request);
  if (!routeClient) {
    return NextResponse.redirect(new URL("/quan-tri/dang-nhap?error=auth-config", request.url), 303);
  }
  const formData = await request.formData();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!email || password.length < 8) {
    return NextResponse.redirect(new URL("/quan-tri/dang-nhap?error=credentials", request.url), 303);
  }

  const { data, error } = await routeClient.client.auth.signInWithPassword({ email, password });
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/quan-tri/dang-nhap?error=credentials", request.url), 303);
  }
  const profile = await getWorkspacePool().query(
    "SELECT role FROM public.app_user_profiles WHERE auth_user_id = $1",
    [data.user.id],
  );
  if (profile.rows[0]?.role !== "admin") {
    await routeClient.client.auth.signOut();
    return routeClient.applyCookies(NextResponse.redirect(new URL("/quan-tri/dang-nhap?error=forbidden", request.url), 303));
  }
  return routeClient.applyCookies(NextResponse.redirect(new URL("/", request.url), 303));
}

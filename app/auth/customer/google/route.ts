import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route-client.ts";

function safeNext(value: string | null) {
  return value?.startsWith("/dat-ve") ? value : "/dat-ve";
}

export async function GET(request: NextRequest) {
  const routeClient = createSupabaseRouteClient(request);
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  if (!routeClient) {
    return NextResponse.redirect(new URL("/dat-ve/dang-nhap?error=auth-config", request.url));
  }

  const callback = new URL("/auth/customer/callback", request.url);
  callback.searchParams.set("next", next);
  const { data, error } = await routeClient.client.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: callback.toString() },
  });
  if (error || !data.url) {
    return NextResponse.redirect(new URL("/dat-ve/dang-nhap?error=google", request.url));
  }
  return routeClient.applyCookies(NextResponse.redirect(data.url));
}

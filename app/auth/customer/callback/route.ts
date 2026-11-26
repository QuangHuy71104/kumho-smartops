import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route-client.ts";

function safeNext(value: string | null) {
  return value?.startsWith("/dat-ve") ? value : "/dat-ve";
}

export async function GET(request: NextRequest) {
  const routeClient = createSupabaseRouteClient(request);
  const next = safeNext(request.nextUrl.searchParams.get("next"));
  const code = request.nextUrl.searchParams.get("code");
  if (!routeClient || !code) {
    return NextResponse.redirect(new URL("/dat-ve/dang-nhap?error=callback", request.url));
  }
  const { error } = await routeClient.client.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(new URL("/dat-ve/dang-nhap?error=callback", request.url));
  }
  return routeClient.applyCookies(NextResponse.redirect(new URL(next, request.url)));
}

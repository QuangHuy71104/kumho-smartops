import { NextRequest, NextResponse } from "next/server";
import { createSupabaseRouteClient } from "../../../../lib/supabase/route-client.ts";

export async function POST(request: NextRequest) {
  const routeClient = createSupabaseRouteClient(request);
  if (routeClient) await routeClient.client.auth.signOut();
  const response = NextResponse.redirect(new URL("/dat-ve", request.url), 303);
  return routeClient ? routeClient.applyCookies(response) : response;
}

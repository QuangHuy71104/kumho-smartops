import { createServerClient } from "@supabase/ssr";
import type { NextRequest, NextResponse } from "next/server";
import { getSupabasePublicConfig } from "./config.ts";

type CookieToSet = {
  name: string;
  value: string;
  options: Parameters<NextResponse["cookies"]["set"]>[2];
};

export function createSupabaseRouteClient(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) return null;
  const cookiesToSet: CookieToSet[] = [];
  const client = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(values) {
        cookiesToSet.push(...values as CookieToSet[]);
      },
    },
  });
  return { client, applyCookies(response: NextResponse) {
    cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
    return response;
  } };
}

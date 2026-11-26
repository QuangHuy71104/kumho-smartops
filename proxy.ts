import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { getAuth0Client } from "./lib/server/auth/auth0-client.ts";
import { getServerConfig } from "./lib/server/config.ts";
import { getSupabasePublicConfig } from "./lib/supabase/config.ts";

async function refreshSupabaseSession(request: NextRequest) {
  const config = getSupabasePublicConfig();
  if (!config) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(config.url, config.publishableKey, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getClaims();
  return response;
}

export async function proxy(request: NextRequest) {
  const serverConfig = getServerConfig();
  if (serverConfig.mode === "demo") return refreshSupabaseSession(request);
  return getAuth0Client().middleware(request);
}

// Auth0 requires a broad matcher so rolling sessions can be refreshed reliably.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

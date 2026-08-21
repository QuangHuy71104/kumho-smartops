import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { getAuth0Client } from "./lib/server/auth/auth0-client.ts";
import { getServerConfig } from "./lib/server/config.ts";

export async function proxy(request: NextRequest) {
  const serverConfig = getServerConfig();
  if (serverConfig.mode === "demo") return NextResponse.next();
  return getAuth0Client().middleware(request);
}

// Auth0 requires a broad matcher so rolling sessions can be refreshed reliably.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
  ],
};

import "server-only";

import { SessionDomainMismatchError } from "@auth0/nextjs-auth0/server";
import type { NextRequest } from "next/server";
import { requirePilotConfig } from "../config.ts";
import type { Auth0SessionVerifier } from "./contracts.ts";
import { getAuth0Client } from "./auth0-client.ts";
import {
  Auth0SdkSessionVerifier,
  type VerifiedAuth0SessionReader,
} from "./session-verifier-core.ts";

class Auth0EncryptedSessionReader implements VerifiedAuth0SessionReader {
  async readVerifiedSession(request: Request) {
    // getSession decrypts and verifies the SDK-managed server session cookie.
    let session;
    try {
      session = await getAuth0Client().getSession(request as NextRequest);
    } catch (error) {
      // This SDK error means the cookie is validly decoded but not valid for
      // the current application domain. Treat it as signed-out; configuration
      // and provider failures remain visible as server failures.
      if (error instanceof SessionDomainMismatchError) return null;
      throw error;
    }
    if (!session) return null;

    return Object.freeze({
      subject: session.user.sub,
      auth0OrganizationId: session.user.org_id ?? null,
      sessionId: session.internal.sid ?? null,
      authenticatedAt: session.internal.createdAt ?? null,
    });
  }
}

let sessionVerifier: Auth0SessionVerifier | undefined;

export function getAuth0SessionVerifier(): Auth0SessionVerifier {
  if (sessionVerifier) return sessionVerifier;

  const config = requirePilotConfig();
  sessionVerifier = new Auth0SdkSessionVerifier(
    new Auth0EncryptedSessionReader(),
    config.auth0.issuer,
  );
  return sessionVerifier;
}

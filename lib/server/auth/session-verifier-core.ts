import type { Auth0SessionVerifier } from "./contracts.ts";

export type VerifiedAuth0Session = Readonly<{
  subject: string;
  auth0OrganizationId: string | null;
  sessionId: string | null;
  authenticatedAt: number | null;
}>;

/** Implementations must read a session cryptographically verified by the IdP SDK. */
export interface VerifiedAuth0SessionReader {
  readVerifiedSession(request: Request): Promise<VerifiedAuth0Session | null>;
}

/**
 * Converts a verified SDK session to the minimal claim-shaped boundary used by
 * the mapper. The issuer is injected from trusted server configuration; no
 * external role or permission claim crosses this boundary.
 */
export class Auth0SdkSessionVerifier implements Auth0SessionVerifier {
  private readonly reader: VerifiedAuth0SessionReader;
  private readonly expectedIssuer: string;

  constructor(
    reader: VerifiedAuth0SessionReader,
    expectedIssuer: string,
  ) {
    this.reader = reader;
    this.expectedIssuer = expectedIssuer;
  }

  async getVerifiedClaims(
    request: Request,
  ): Promise<Readonly<Record<string, unknown>> | null> {
    const session = await this.reader.readVerifiedSession(request);
    if (!session) return null;

    return Object.freeze({
      iss: this.expectedIssuer,
      sub: session.subject,
      ...(session.auth0OrganizationId === null ? {} : { org_id: session.auth0OrganizationId }),
      ...(session.sessionId === null ? {} : { sid: session.sessionId }),
      ...(session.authenticatedAt === null ? {} : { auth_time: session.authenticatedAt }),
    });
  }
}

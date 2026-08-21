import { createHmac } from "node:crypto";
import type { SubjectLookupKey, VerifiedAuth0Identity } from "./contracts.ts";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const HEX_DIGEST_PATTERN = /^[a-f0-9]{64}$/u;

function boundedIdentityPart(value: string, maximum: number) {
  return value.length > 0
    && value.length <= maximum
    && Array.from(value).every((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint >= 32 && codePoint !== 127;
    });
}

export function isSubjectLookupKey(value: unknown): value is SubjectLookupKey {
  if (typeof value !== "object" || value === null) return false;
  const key = value as Record<string, unknown>;
  return typeof key.organizationId === "string"
    && UUID_PATTERN.test(key.organizationId)
    && typeof key.issuer === "string"
    && key.issuer.startsWith("https://")
    && typeof key.subjectHash === "string"
    && HEX_DIGEST_PATTERN.test(key.subjectHash);
}

export function createSubjectLookupKey(
  identity: VerifiedAuth0Identity,
  organizationId: string,
  secret: string,
): SubjectLookupKey {
  if (!UUID_PATTERN.test(organizationId)
    || !boundedIdentityPart(identity.issuer, 2048)
    || !boundedIdentityPart(identity.subject, 255)
    || Buffer.byteLength(secret, "utf8") < 32) {
    throw new TypeError("Identity lookup input is invalid");
  }

  const subjectHash = createHmac("sha256", secret)
    .update("ksops:auth0-subject:v1\0", "utf8")
    .update(organizationId.toLocaleLowerCase("en-US"), "utf8")
    .update("\0", "utf8")
    .update(identity.issuer, "utf8")
    .update("\0", "utf8")
    .update(identity.subject, "utf8")
    .digest("hex");

  return Object.freeze({
    organizationId: organizationId.toLocaleLowerCase("en-US"),
    issuer: identity.issuer,
    subjectHash,
  });
}

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export type RuntimeMode = "demo" | "pilot";

export type CapabilitySnapshot = {
  mode: RuntimeMode;
  durablePersistence: boolean;
  enterpriseIdentity: boolean;
  mutationApi: boolean;
  requestId: string;
};

/**
 * These values describe capabilities that are implemented and verified in this
 * release. They deliberately do not infer readiness from credential-shaped
 * environment variables: configuration presence is not deployment evidence.
 */
const verifiedCapabilities = Object.freeze({
  durablePersistence: false,
  enterpriseIdentity: false,
  mutationApi: false,
});

export function resolveRuntimeMode(configuredMode: unknown): RuntimeMode {
  if (typeof configuredMode !== "string") {
    return "demo";
  }

  return configuredMode.trim().toLowerCase() === "pilot" ? "pilot" : "demo";
}

export function buildCapabilitySnapshot(
  configuredMode: unknown,
  requestId: string,
): CapabilitySnapshot {
  return {
    mode: resolveRuntimeMode(configuredMode),
    ...verifiedCapabilities,
    requestId,
  };
}

function readConfiguredMode(): unknown {
  return process.env.KSOPS_MODE ?? process.env.APP_RUNTIME_MODE;
}

export function GET() {
  const snapshot = buildCapabilitySnapshot(
    readConfiguredMode(),
    globalThis.crypto.randomUUID(),
  );

  return Response.json(snapshot, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

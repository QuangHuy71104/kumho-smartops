import { z } from "zod";

const PILOT_REQUIRED_KEYS = [
  "DATABASE_URL",
  "AUTH0_DOMAIN",
  "AUTH0_CLIENT_ID",
  "AUTH0_CLIENT_SECRET",
  "AUTH0_SECRET",
  "APP_BASE_URL",
  "KSOPS_IDEMPOTENCY_SECRET",
  "KSOPS_ORGANIZATION_ID",
  "KSOPS_IDENTITY_LOOKUP_SECRET",
] as const;

type PilotRequiredKey = (typeof PILOT_REQUIRED_KEYS)[number];
type Environment = Readonly<Record<string, string | undefined>>;

const optionalNonEmpty = (maximum: number) => z.string().trim().min(1).max(maximum).optional();
const secretSchema = optionalNonEmpty(4096).refine(
  (value) => value === undefined || new TextEncoder().encode(value).byteLength >= 32,
  "must contain at least 32 bytes",
);

function isPostgresUrl(value: string) {
  try {
    const url = new URL(value);
    if ((url.protocol !== "postgres:" && url.protocol !== "postgresql:")
      || !url.hostname
      || !url.pathname
      || url.pathname === "/") {
      return false;
    }
    const loopback = url.hostname === "localhost"
      || url.hostname === ["127", "0", "0", "1"].join(".")
      || url.hostname === "[::1]";
    if (loopback) return true;

    const sslModes = url.searchParams.getAll("sslmode");
    return sslModes.length === 1
      && sslModes[0].toLocaleLowerCase("en-US") === "verify-full"
      && !url.searchParams.has("ssl");
  } catch {
    return false;
  }
}

function isAuth0Domain(value: string) {
  if (value.includes("://") || value.includes("/") || value.includes("@")) return false;
  try {
    const url = new URL(`https://${value}`);
    return url.hostname === value.toLocaleLowerCase("en-US")
      && url.pathname === "/"
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

function isSafeAppBaseUrl(value: string) {
  try {
    const url = new URL(value);
    const localHttp = url.protocol === "http:"
      && (url.hostname === "localhost"
        || url.hostname === ["127", "0", "0", "1"].join(".")
        || url.hostname === "[::1]");
    return (url.protocol === "https:" || localHttp)
      && url.pathname === "/"
      && !url.username
      && !url.password
      && !url.search
      && !url.hash;
  } catch {
    return false;
  }
}

const environmentSchema = z.object({
  KSOPS_MODE: z.enum(["demo", "pilot"]).default("demo"),
  DATABASE_URL: optionalNonEmpty(8192).refine(
    (value) => value === undefined || isPostgresUrl(value),
    "must be PostgreSQL; remote hosts require sslmode=verify-full",
  ),
  AUTH0_DOMAIN: optionalNonEmpty(253).refine(
    (value) => value === undefined || isAuth0Domain(value),
    "must be a hostname without a scheme or path",
  ),
  AUTH0_CLIENT_ID: optionalNonEmpty(1024),
  AUTH0_CLIENT_SECRET: optionalNonEmpty(4096),
  AUTH0_SECRET: optionalNonEmpty(128).refine(
    (value) => value === undefined || /^[a-f0-9]{64}$/iu.test(value),
    "must be exactly 64 hexadecimal characters",
  ),
  APP_BASE_URL: optionalNonEmpty(2048).refine(
    (value) => value === undefined || isSafeAppBaseUrl(value),
    "must be an HTTPS origin or a loopback HTTP origin",
  ),
  KSOPS_IDEMPOTENCY_SECRET: secretSchema,
  KSOPS_ORGANIZATION_ID: optionalNonEmpty(64).refine(
    (value) => value === undefined || z.uuid().safeParse(value).success,
    "must be a UUID",
  ),
  KSOPS_IDENTITY_LOOKUP_SECRET: secretSchema,
});

export type DemoServerConfig = Readonly<{
  mode: "demo";
}>;

export type PilotServerConfig = Readonly<{
  mode: "pilot";
  databaseUrl: string;
  appBaseUrl: string;
  organizationId: string;
  idempotencySecret: string;
  identityLookupSecret: string;
  auth0: Readonly<{
    domain: string;
    clientId: string;
    clientSecret: string;
    secret: string;
    issuer: string;
  }>;
}>;

export type ServerConfig = DemoServerConfig | PilotServerConfig;

export class ServerConfigurationError extends Error {
  readonly code = "SERVER_CONFIGURATION_INVALID";
  readonly variables: readonly string[];

  constructor(variables: readonly string[]) {
    const uniqueVariables = [...new Set(variables)].sort();
    super(`Invalid or missing server configuration: ${uniqueVariables.join(", ")}`);
    this.name = "ServerConfigurationError";
    this.variables = Object.freeze(uniqueVariables);
  }
}

function issueVariables(error: z.ZodError) {
  return error.issues.map((issue) => String(issue.path[0] ?? "KSOPS_MODE"));
}

export function parseServerConfig(environment: Environment): ServerConfig {
  if (environment.KSOPS_MODE === undefined || environment.KSOPS_MODE === "demo") {
    return Object.freeze({ mode: "demo" });
  }
  const parsed = environmentSchema.safeParse(environment);
  if (!parsed.success) throw new ServerConfigurationError(issueVariables(parsed.error));

  if (parsed.data.KSOPS_MODE === "demo") return Object.freeze({ mode: "demo" });

  const missing = PILOT_REQUIRED_KEYS.filter((key) => !parsed.data[key]);
  if (missing.length > 0) throw new ServerConfigurationError(missing);

  const data = parsed.data as typeof parsed.data & Record<PilotRequiredKey, string>;
  const auth0 = Object.freeze({
    domain: data.AUTH0_DOMAIN.toLocaleLowerCase("en-US"),
    clientId: data.AUTH0_CLIENT_ID,
    clientSecret: data.AUTH0_CLIENT_SECRET,
    secret: data.AUTH0_SECRET,
    issuer: `https://${data.AUTH0_DOMAIN.toLocaleLowerCase("en-US")}/`,
  });

  return Object.freeze({
    mode: "pilot",
    databaseUrl: data.DATABASE_URL,
    appBaseUrl: new URL(data.APP_BASE_URL).origin,
    organizationId: data.KSOPS_ORGANIZATION_ID.toLocaleLowerCase("en-US"),
    idempotencySecret: data.KSOPS_IDEMPOTENCY_SECRET,
    identityLookupSecret: data.KSOPS_IDENTITY_LOOKUP_SECRET,
    auth0,
  });
}

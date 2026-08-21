import "server-only";

import {
  parseServerConfig,
  ServerConfigurationError,
  type PilotServerConfig,
  type ServerConfig,
} from "./config-schema.ts";

let cachedConfig: ServerConfig | undefined;

/** Reads and validates process environment only on first runtime use. */
export function getServerConfig(): ServerConfig {
  cachedConfig ??= parseServerConfig(process.env);
  return cachedConfig;
}

export function requirePilotConfig(config: ServerConfig = getServerConfig()): PilotServerConfig {
  if (config.mode !== "pilot") {
    throw new ServerConfigurationError(["KSOPS_MODE=pilot"]);
  }
  return config;
}

export { ServerConfigurationError };
export type { DemoServerConfig, PilotServerConfig, ServerConfig } from "./config-schema.ts";

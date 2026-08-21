import "server-only";

import { Auth0Client } from "@auth0/nextjs-auth0/server";
import { requirePilotConfig } from "../config.ts";

let auth0Client: Auth0Client | undefined;

/**
 * Constructs the Auth0 SDK client only on the first explicit pilot request.
 * Importing this module in demo/build contexts neither reads credentials nor
 * initializes Auth0 network/session state.
 */
export function getAuth0Client(): Auth0Client {
  if (auth0Client) return auth0Client;

  const config = requirePilotConfig();
  auth0Client = new Auth0Client({
    domain: config.auth0.domain,
    clientId: config.auth0.clientId,
    clientSecret: config.auth0.clientSecret,
    secret: config.auth0.secret,
    appBaseUrl: config.appBaseUrl,
  });
  return auth0Client;
}

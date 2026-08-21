import { requireServerPrincipal } from "../../../../lib/server/auth/resolve-principal.ts";
import { errorProblemResponse } from "../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../lib/server/http/request-id.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const principal = await requireServerPrincipal(request);
    return Response.json(
      {
        data: {
          id: principal.id,
          organizationId: principal.organizationId,
          permissions: principal.permissions,
          permissionScopes: principal.permissionScopes,
          authenticationMethod: principal.authenticationMethod,
        },
        meta: { requestId },
      },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          vary: "Cookie",
          [REQUEST_ID_HEADER]: requestId,
        },
      },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

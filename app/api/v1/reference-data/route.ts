import { requireServerPrincipal } from "../../../../lib/server/auth/resolve-principal.ts";
import { errorProblemResponse } from "../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../lib/server/http/request-id.ts";
import { getCargoReferenceService } from "../../../../modules/cargo/infrastructure/reference-container.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const principal = await requireServerPrincipal(request);
    const referenceData = await getCargoReferenceService().list(principal);
    return Response.json(
      {
        data: referenceData,
        meta: {
          branchCount: referenceData.branches.length,
          locationCount: referenceData.locations.length,
          requestId,
        },
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

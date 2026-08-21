import { getServerConfig } from "../../../../../lib/server/config.ts";
import { getDatabasePool } from "../../../../../lib/server/db/pool.ts";
import { verifyPilotDatabaseReadiness } from "../../../../../lib/server/db/readiness-core.ts";
import { problemResponse } from "../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../lib/server/http/request-id.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const config = getServerConfig();
    if (config.mode === "demo") {
      return Response.json(
        { status: "ready", mode: "demo", durablePersistence: false, requestId },
        {
          headers: {
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }

    await verifyPilotDatabaseReadiness(getDatabasePool(), config.organizationId);
    return Response.json(
      { status: "ready", mode: "pilot", durablePersistence: true, requestId },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          [REQUEST_ID_HEADER]: requestId,
        },
      },
    );
  } catch {
    return problemResponse({
      status: 503,
      code: "READINESS_FAILED",
      detail: "Dịch vụ chưa sẵn sàng nhận lưu lượng vận hành.",
    }, requestId);
  }
}

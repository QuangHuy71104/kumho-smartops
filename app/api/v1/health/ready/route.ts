import { getServerConfig } from "../../../../../lib/server/config.ts";
import { getDatabasePool } from "../../../../../lib/server/db/pool.ts";
import { getWorkspacePool } from "../../../../../lib/server/db/workspace-pool.ts";
import { verifyPilotDatabaseReadiness } from "../../../../../lib/server/db/readiness-core.ts";
import { problemResponse } from "../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../lib/server/http/request-id.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const configuredMode = process.env.KSOPS_MODE?.trim().toLocaleLowerCase("en-US");
    if (configuredMode !== "pilot") {
      const durablePersistence = Boolean(process.env.DATABASE_URL?.trim());
      if (durablePersistence) {
        const result = await getWorkspacePool().query(
          "SELECT to_regclass('platform.workspace_state')::text AS table_name",
        );
        if (result.rows[0]?.table_name !== "platform.workspace_state") throw new Error("workspace table missing");
      }
      return Response.json(
        { status: "ready", mode: "demo", durablePersistence, requestId },
        {
          headers: {
            "cache-control": "no-store",
            "x-content-type-options": "nosniff",
            [REQUEST_ID_HEADER]: requestId,
          },
        },
      );
    }

    const config = getServerConfig();
    if (config.mode !== "pilot") throw new Error("pilot configuration unavailable");
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

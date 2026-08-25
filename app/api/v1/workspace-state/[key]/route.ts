import { ApplicationError } from "../../../../../modules/shared/application/errors.ts";
import { getWorkspacePool } from "../../../../../lib/server/db/workspace-pool.ts";
import { readBoundedJson } from "../../../../../lib/server/http/json-body.ts";
import { errorProblemResponse } from "../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../lib/server/http/request-id.ts";
import { decodeWorkspaceStateKey, isJsonValue } from "../../../../../lib/workspace-state.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ key: string }> };

function headers(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    [REQUEST_ID_HEADER]: requestId,
  };
}

function requireSameHost(request: Request) {
  const origin = request.headers.get("origin");
  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",", 1)[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  if (!origin || !host) throw new ApplicationError("FORBIDDEN", "Origin không hợp lệ.");
  try {
    if (new URL(origin).host.toLocaleLowerCase("en-US") !== host.toLocaleLowerCase("en-US")) {
      throw new Error("origin mismatch");
    }
  } catch {
    throw new ApplicationError("FORBIDDEN", "Origin không được phép cập nhật dữ liệu.");
  }
}

async function stateKey(context: RouteContext) {
  const key = decodeWorkspaceStateKey((await context.params).key);
  if (!key) throw new ApplicationError("NOT_FOUND", "Không tìm thấy phân hệ dữ liệu.");
  return key;
}

export async function GET(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const key = await stateKey(context);
    const result = await getWorkspacePool().query(
      `SELECT payload, version, updated_at
         FROM platform.workspace_state
        WHERE state_key = $1`,
      [key],
    );
    const row = result.rows[0];
    return Response.json(
      { data: row?.payload ?? null, meta: { key, version: Number(row?.version ?? 0), updatedAt: row?.updated_at ?? null, requestId } },
      { headers: headers(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

export async function PUT(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    requireSameHost(request);
    const key = await stateKey(context);
    const body = await readBoundedJson(request);
    if (typeof body !== "object" || body === null || Array.isArray(body) || !("data" in body)) {
      throw new ApplicationError("BAD_REQUEST", "Payload phải có trường data.");
    }
    const data = (body as { data: unknown }).data;
    if (!isJsonValue(data)) throw new ApplicationError("BAD_REQUEST", "Dữ liệu phân hệ không hợp lệ.");
    const result = await getWorkspacePool().query(
      `INSERT INTO platform.workspace_state (state_key, payload)
       VALUES ($1, $2::jsonb)
       ON CONFLICT (state_key) DO UPDATE
         SET payload = EXCLUDED.payload,
             version = platform.workspace_state.version + 1,
             updated_at = now()
       RETURNING version, updated_at`,
      [key, JSON.stringify(data)],
    );
    const row = result.rows[0];
    return Response.json(
      { data, meta: { key, version: Number(row.version), updatedAt: row.updated_at, requestId } },
      { headers: headers(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

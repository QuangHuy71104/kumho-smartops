import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../lib/server/http/request-id.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  return Response.json(
    { status: "ok", service: "ksops-web", requestId },
    {
      headers: {
        "cache-control": "no-store",
        "x-content-type-options": "nosniff",
        [REQUEST_ID_HEADER]: requestId,
      },
    },
  );
}

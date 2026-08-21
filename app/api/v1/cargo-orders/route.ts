import { requireServerPrincipal } from "../../../../lib/server/auth/resolve-principal.ts";
import { requirePilotConfig } from "../../../../lib/server/config.ts";
import { hashCanonicalRequest, hashIdempotencyKey } from "../../../../lib/server/idempotency.ts";
import { readBoundedJson } from "../../../../lib/server/http/json-body.ts";
import { requireSameOrigin } from "../../../../lib/server/http/origin.ts";
import { errorProblemResponse } from "../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../lib/server/http/request-id.ts";
import { getCargoOrderService } from "../../../../modules/cargo/infrastructure/container.ts";
import {
  cargoOrderEtag,
  parseCargoOrderListQuery,
  parseCreateCargoOrderBody,
  presentCargoOrder,
  requireIdempotencyKey,
} from "../../../../modules/cargo/presentation/http-contract.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function responseHeaders(requestId: string, replayed?: boolean) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    vary: "Cookie",
    [REQUEST_ID_HEADER]: requestId,
    ...(replayed === undefined ? {} : { "idempotency-replayed": String(replayed) }),
  };
}

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const principal = await requireServerPrincipal(request);
    const query = parseCargoOrderListQuery(request.url);
    const orders = await getCargoOrderService().list(principal, query);
    return Response.json(
      {
        data: orders.map(presentCargoOrder),
        meta: { count: orders.length, requestId },
      },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

export async function POST(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    requireSameOrigin(request);
    const principal = await requireServerPrincipal(request);
    const body = parseCreateCargoOrderBody(await readBoundedJson(request));
    const rawKey = requireIdempotencyKey(request.headers.get("idempotency-key"));
    const config = requirePilotConfig();
    const result = await getCargoOrderService().create(
      principal,
      { organizationId: principal.organizationId, ...body },
      {
        requestId,
        idempotency: {
          operation: "cargo-order:create",
          keyHash: hashIdempotencyKey(rawKey, config.idempotencySecret),
          requestHash: hashCanonicalRequest({
            operation: "cargo-order:create",
            organizationId: principal.organizationId,
            ...body,
          }),
        },
      },
    );
    const location = `/api/v1/cargo-orders/${result.order.id}`;
    return Response.json(
      { data: presentCargoOrder(result.order), meta: { replayed: result.replayed, requestId } },
      {
        status: 201,
        headers: {
          ...responseHeaders(requestId, result.replayed),
          etag: cargoOrderEtag(result.order.version),
          location,
        },
      },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

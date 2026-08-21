import { requireServerPrincipal } from "../../../../../../lib/server/auth/resolve-principal.ts";
import { requirePilotConfig } from "../../../../../../lib/server/config.ts";
import { hashCanonicalRequest, hashIdempotencyKey } from "../../../../../../lib/server/idempotency.ts";
import { readBoundedJson } from "../../../../../../lib/server/http/json-body.ts";
import { requireSameOrigin } from "../../../../../../lib/server/http/origin.ts";
import { errorProblemResponse } from "../../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../../lib/server/http/request-id.ts";
import { getCargoOrderService } from "../../../../../../modules/cargo/infrastructure/container.ts";
import {
  cargoOrderEtag,
  parseTransitionCargoOrderBody,
  presentCargoOrder,
  requireCargoOrderId,
  requireCargoOrderVersion,
  requireIdempotencyKey,
} from "../../../../../../modules/cargo/presentation/http-contract.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function POST(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    requireSameOrigin(request);
    const principal = await requireServerPrincipal(request);
    const orderId = requireCargoOrderId((await context.params).id);
    const expectedVersion = requireCargoOrderVersion(request.headers.get("if-match"));
    const body = parseTransitionCargoOrderBody(await readBoundedJson(request));
    const rawKey = requireIdempotencyKey(request.headers.get("idempotency-key"));
    const config = requirePilotConfig();
    const result = await getCargoOrderService().transition(
      principal,
      {
        organizationId: principal.organizationId,
        orderId,
        expectedVersion,
        ...body,
      },
      {
        requestId,
        idempotency: {
          operation: "cargo-order:transition",
          keyHash: hashIdempotencyKey(rawKey, config.idempotencySecret),
          requestHash: hashCanonicalRequest({
            operation: "cargo-order:transition",
            organizationId: principal.organizationId,
            orderId,
            expectedVersion,
            ...body,
          }),
        },
      },
    );
    return Response.json(
      { data: presentCargoOrder(result.order), meta: { replayed: result.replayed, requestId } },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          vary: "Cookie",
          [REQUEST_ID_HEADER]: requestId,
          "idempotency-replayed": String(result.replayed),
          etag: cargoOrderEtag(result.order.version),
        },
      },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

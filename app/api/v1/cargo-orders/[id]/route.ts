import { requireServerPrincipal } from "../../../../../lib/server/auth/resolve-principal.ts";
import { errorProblemResponse } from "../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../lib/server/http/request-id.ts";
import { getCargoOrderService } from "../../../../../modules/cargo/infrastructure/container.ts";
import {
  cargoOrderEtag,
  presentCargoOrder,
  requireCargoOrderId,
} from "../../../../../modules/cargo/presentation/http-contract.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const principal = await requireServerPrincipal(request);
    const orderId = requireCargoOrderId((await context.params).id);
    const order = await getCargoOrderService().get(principal, {
      organizationId: principal.organizationId,
      orderId,
    });
    return Response.json(
      { data: presentCargoOrder(order), meta: { requestId } },
      {
        headers: {
          "cache-control": "no-store",
          "x-content-type-options": "nosniff",
          vary: "Cookie",
          [REQUEST_ID_HEADER]: requestId,
          etag: cargoOrderEtag(order.version),
        },
      },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

import { ApplicationError } from "../../../../../../modules/shared/application/errors.ts";
import { performWorkItemAction } from "../../../../../../lib/server/db/work-center-repository.ts";
import { readBoundedJson } from "../../../../../../lib/server/http/json-body.ts";
import { errorProblemResponse } from "../../../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../../../lib/server/http/request-id.ts";
import {
  decodeWorkItemActionBody,
  decodeWorkItemId,
  requireSameHostMutation,
  resolveWorkCenterActor,
} from "../../../../../../lib/work-center.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type RouteContext = { params: Promise<{ id: string }> };

function responseHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    vary: "x-ksops-role",
    [REQUEST_ID_HEADER]: requestId,
  };
}

export async function POST(request: Request, context: RouteContext) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    requireSameHostMutation(request);
    const actor = resolveWorkCenterActor(request.headers);
    const id = decodeWorkItemId((await context.params).id);
    if (!id) throw new ApplicationError("NOT_FOUND", "Không tìm thấy công việc.");
    const body = decodeWorkItemActionBody(await readBoundedJson(request));
    const item = await performWorkItemAction({
      id,
      actorRole: actor.role,
      actorLabel: actor.actorLabel,
      action: body.action,
      note: body.note,
    });
    return Response.json(
      { data: item, meta: { requestId } },
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

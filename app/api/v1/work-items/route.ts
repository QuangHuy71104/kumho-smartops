import {
  createAssignedWorkItem,
  listWorkItemsForRole,
} from "../../../../lib/server/db/work-center-repository.ts";
import { readBoundedJson } from "../../../../lib/server/http/json-body.ts";
import { errorProblemResponse } from "../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../lib/server/http/request-id.ts";
import {
  decodeCreateWorkItemBody,
  requireSameHostMutation,
  requireWorkCenterRole,
  resolveWorkCenterActor,
} from "../../../../lib/work-center.ts";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function responseHeaders(requestId: string) {
  return {
    "cache-control": "no-store",
    "x-content-type-options": "nosniff",
    vary: "x-ksops-role",
    [REQUEST_ID_HEADER]: requestId,
  };
}

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const role = requireWorkCenterRole(request.headers);
    const result = await listWorkItemsForRole(role);
    return Response.json(
      {
        data: result.items,
        meta: {
          role,
          count: result.items.length,
          summary: result.summary,
          requestId,
        },
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
    requireSameHostMutation(request);
    const actor = resolveWorkCenterActor(request.headers);
    const data = decodeCreateWorkItemBody(await readBoundedJson(request));
    const item = await createAssignedWorkItem({
      actorRole: actor.role,
      actorLabel: actor.actorLabel,
      data,
    });
    return Response.json(
      { data: item, meta: { requestId } },
      {
        status: 201,
        headers: {
          ...responseHeaders(requestId),
          location: `/api/v1/work-items/${item.id}`,
        },
      },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

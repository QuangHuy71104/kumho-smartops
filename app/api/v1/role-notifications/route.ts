import {
  listRoleNotifications,
  markRoleNotificationsRead,
} from "../../../../lib/server/db/work-center-repository.ts";
import { readBoundedJson } from "../../../../lib/server/http/json-body.ts";
import { errorProblemResponse } from "../../../../lib/server/http/problem.ts";
import { requestIdFromHeaders, REQUEST_ID_HEADER } from "../../../../lib/server/http/request-id.ts";
import {
  decodeNotificationReadBody,
  requireSameHostMutation,
  requireWorkCenterRole,
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

function responsePayload(
  data: Awaited<ReturnType<typeof listRoleNotifications>>,
  role: ReturnType<typeof requireWorkCenterRole>,
  requestId: string,
) {
  return {
    data,
    meta: {
      role,
      count: data.length,
      unreadCount: data.filter((notification) => notification.readAt === null).length,
      requestId,
    },
  };
}

export async function GET(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    const role = requireWorkCenterRole(request.headers);
    const notifications = await listRoleNotifications(role);
    return Response.json(
      responsePayload(notifications, role, requestId),
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

export async function PUT(request: Request) {
  const requestId = requestIdFromHeaders(request.headers);
  try {
    requireSameHostMutation(request);
    const role = requireWorkCenterRole(request.headers);
    const input = decodeNotificationReadBody(await readBoundedJson(request));
    const notifications = await markRoleNotificationsRead(role, input);
    return Response.json(
      responsePayload(notifications, role, requestId),
      { headers: responseHeaders(requestId) },
    );
  } catch (error) {
    return errorProblemResponse(error, requestId);
  }
}

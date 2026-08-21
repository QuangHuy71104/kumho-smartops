import "server-only";

import { ApplicationError } from "../../../modules/shared/application/errors.ts";

const MAX_JSON_BYTES = 64 * 1024;

export async function readBoundedJson(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type")?.split(";", 1)[0]?.trim().toLowerCase();
  if (contentType !== "application/json") {
    throw new ApplicationError("BAD_REQUEST", "Content-Type phải là application/json.");
  }
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_JSON_BYTES) {
    throw new ApplicationError("BAD_REQUEST", "Payload vượt giới hạn 64 KiB.");
  }
  const source = await request.text();
  if (new TextEncoder().encode(source).byteLength > MAX_JSON_BYTES) {
    throw new ApplicationError("BAD_REQUEST", "Payload vượt giới hạn 64 KiB.");
  }
  try {
    return JSON.parse(source) as unknown;
  } catch {
    throw new ApplicationError("BAD_REQUEST", "Payload JSON không hợp lệ.");
  }
}

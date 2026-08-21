import "server-only";

import { ApplicationError } from "../../../modules/shared/application/errors.ts";
import { requirePilotConfig } from "../config.ts";

export function requireSameOrigin(request: Request) {
  const expectedOrigin = new URL(requirePilotConfig().appBaseUrl).origin;
  const origin = request.headers.get("origin");
  if (!origin) {
    throw new ApplicationError("FORBIDDEN", "Yêu cầu thay đổi dữ liệu phải có Origin hợp lệ.");
  }
  try {
    if (new URL(origin).origin !== expectedOrigin || new URL(origin).href !== `${expectedOrigin}/`) {
      throw new Error("origin mismatch");
    }
  } catch {
    throw new ApplicationError("FORBIDDEN", "Origin không được phép thực hiện thao tác này.");
  }
}

import { ApplicationError } from "../../shared/application/errors.ts";

export type ServerPrincipal = {
  id: string;
  organizationId: string;
  permissions: readonly string[];
  permissionScopes: Readonly<Record<string, "*" | readonly string[]>>;
  authenticationMethod: "oidc" | "service-token" | "test";
};

export function requirePermission(principal: ServerPrincipal, permission: string) {
  if (!principal.permissions.includes(permission)) {
    throw new ApplicationError("FORBIDDEN", "Bạn không có quyền thực hiện thao tác này.");
  }
}

export function requireOrganization(
  principal: ServerPrincipal,
  organizationId: string,
) {
  if (principal.organizationId !== organizationId) {
    throw new ApplicationError("NOT_FOUND", "Không tìm thấy tài nguyên.");
  }
}

export function scopeForPermission(
  principal: ServerPrincipal,
  permission: string,
): "*" | readonly string[] {
  requirePermission(principal, permission);
  const scope = principal.permissionScopes[permission];
  if (!scope) {
    throw new ApplicationError("FORBIDDEN", "Quyền chưa được gắn với phạm vi dữ liệu hợp lệ.");
  }
  return scope;
}

export function requirePermissionScope(
  principal: ServerPrincipal,
  permission: string,
  branchId: string,
) {
  const scope = scopeForPermission(principal, permission);
  if (scope !== "*" && !scope.includes(branchId)) {
    throw new ApplicationError("NOT_FOUND", "Không tìm thấy tài nguyên.");
  }
}

/**
 * Frontend capability model for the public KSOps demo.
 *
 * This module deliberately contains no authentication/session logic. The selected
 * role only changes the synthetic UI that is visible in this browser. A real
 * deployment must derive the principal on the server and authorize every query
 * and mutation at the API/application boundary.
 */

export const PERMISSIONS = [
  "dashboard:read",
  "work-item:read",
  "work-item:update",
  "work-item:approve",
  "work-item:audit",
  "cargo-order:read",
  "cargo-order:create",
  "cargo-order:transition",
  "cargo-order:resolve-exception",
  "dispatch:read",
  "dispatch:assign",
  "dispatch:auto-assign",
  "dispatch:override",
  "vehicle:read",
  "driver:read",
  "booking:read",
  "booking:create",
  "booking:cancel",
  "contract:read",
  "contract:create",
  "contract:transition",
  "contract:approve-quote",
  "customer:read",
  "maintenance:read",
  "maintenance:update-checklist",
  "maintenance:sign-off",
  "maintenance:block-vehicle",
  "invoice:read",
  "invoice:record-payment",
  "report:read",
  "report:export",
  "audit:read",
  "audit:export",
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export const PORTAL_SECTIONS = [
  { id: "operations", label: "Trung tâm vận hành" },
  { id: "commercial", label: "Kinh doanh & dịch vụ" },
  { id: "control", label: "Kiểm soát" },
] as const;

export type PortalSectionId = (typeof PORTAL_SECTIONS)[number]["id"];

export const PORTAL_ROUTES = [
  {
    path: "/",
    section: "operations",
    short: "TQ",
    label: "Tổng quan",
    viewPermission: "dashboard:read",
  },
  {
    path: "/cong-viec",
    section: "operations",
    short: "CV",
    label: "Công việc của tôi",
    viewPermission: "work-item:read",
    primaryActionPermission: "work-item:update",
  },
  {
    path: "/don-hang",
    section: "operations",
    short: "ĐH",
    label: "Đơn hàng",
    viewPermission: "cargo-order:read",
    primaryActionPermission: "cargo-order:create",
  },
  {
    path: "/dieu-phoi",
    section: "operations",
    short: "ĐP",
    label: "Điều phối",
    viewPermission: "dispatch:read",
    primaryActionPermission: "dispatch:assign",
  },
  {
    path: "/doi-xe",
    section: "operations",
    short: "DX",
    label: "Đội xe",
    viewPermission: "vehicle:read",
  },
  {
    path: "/tai-xe",
    section: "operations",
    short: "TX",
    label: "Tài xế",
    viewPermission: "driver:read",
  },
  {
    path: "/ve-xe",
    section: "commercial",
    short: "VX",
    label: "Vé hành khách",
    viewPermission: "booking:read",
    primaryActionPermission: "booking:create",
  },
  {
    path: "/hop-dong",
    section: "commercial",
    short: "HĐ",
    label: "Hợp đồng xe",
    viewPermission: "contract:read",
    primaryActionPermission: "contract:create",
  },
  {
    path: "/khach-hang",
    section: "commercial",
    short: "KH",
    label: "Khách hàng",
    viewPermission: "customer:read",
  },
  {
    path: "/bao-duong",
    section: "control",
    short: "BD",
    label: "Bảo dưỡng",
    viewPermission: "maintenance:read",
    primaryActionPermission: "maintenance:update-checklist",
  },
  {
    path: "/tai-chinh",
    section: "control",
    short: "TC",
    label: "Tài chính",
    viewPermission: "invoice:read",
    primaryActionPermission: "invoice:record-payment",
  },
  {
    path: "/bao-cao",
    section: "control",
    short: "BC",
    label: "Báo cáo",
    viewPermission: "report:read",
    primaryActionPermission: "report:export",
  },
] as const satisfies readonly {
  path: string;
  section: PortalSectionId;
  short: string;
  label: string;
  viewPermission: Permission;
  primaryActionPermission?: Permission;
}[];

export type PortalRoute = (typeof PORTAL_ROUTES)[number];
export type PortalPath = PortalRoute["path"];

export const DEMO_ROLE_IDS = [
  "dispatcher",
  "cargo-agent",
  "ticket-agent",
  "contract-sales",
  "maintenance-technician",
  "finance-officer",
  "operations-manager",
  "auditor",
] as const;

export type DemoRoleId = (typeof DEMO_ROLE_IDS)[number];

export type DemoRole = {
  id: DemoRoleId;
  label: string;
  short: string;
  department: string;
  scopeLabel: string;
  permissions: readonly Permission[];
};

export const DEMO_ROLES = {
  dispatcher: {
    id: "dispatcher",
    label: "Điều phối viên",
    short: "ĐP",
    department: "Phòng Điều hành / Khai thác",
    scopeLabel: "Ca và khu vực được phân công",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "cargo-order:read",
      "cargo-order:transition",
      "dispatch:read",
      "dispatch:assign",
      "dispatch:auto-assign",
      "vehicle:read",
      "driver:read",
      "booking:read",
      "contract:read",
      "maintenance:read",
    ],
  },
  "cargo-agent": {
    id: "cargo-agent",
    label: "Nhân viên hàng hóa",
    short: "HH",
    department: "Bộ phận Hàng hóa / Chi nhánh",
    scopeLabel: "Đơn thuộc điểm giao dịch",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "cargo-order:read",
      "cargo-order:create",
      "cargo-order:transition",
      "dispatch:read",
      "customer:read",
    ],
  },
  "ticket-agent": {
    id: "ticket-agent",
    label: "Nhân viên bán vé",
    short: "VX",
    department: "Dịch vụ Hành khách / Phòng vé",
    scopeLabel: "Phòng vé và chuyến được phục vụ",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "booking:read",
      "booking:create",
      "booking:cancel",
      "customer:read",
    ],
  },
  "contract-sales": {
    id: "contract-sales",
    label: "Kinh doanh hợp đồng",
    short: "KD",
    department: "Kinh doanh B2B / Chăm sóc khách hàng",
    scopeLabel: "Pipeline do nhóm phụ trách",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "dispatch:read",
      "vehicle:read",
      "contract:read",
      "contract:create",
      "contract:transition",
      "customer:read",
    ],
  },
  "maintenance-technician": {
    id: "maintenance-technician",
    label: "Kỹ thuật bảo dưỡng",
    short: "KT",
    department: "Phòng Kỹ thuật / Xưởng",
    scopeLabel: "Xe và work order tại xưởng",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "dispatch:read",
      "vehicle:read",
      "maintenance:read",
      "maintenance:update-checklist",
      "maintenance:sign-off",
      "maintenance:block-vehicle",
    ],
  },
  "finance-officer": {
    id: "finance-officer",
    label: "Kế toán vận tải",
    short: "TC",
    department: "Tài chính / Kế toán",
    scopeLabel: "Chứng từ thuộc đơn vị kế toán",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "invoice:read",
      "invoice:record-payment",
      "report:read",
      "report:export",
    ],
  },
  "operations-manager": {
    id: "operations-manager",
    label: "Quản lý vận hành",
    short: "QL",
    department: "Phòng Điều hành / Khai thác",
    scopeLabel: "Khu vực quản lý",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:update",
      "work-item:approve",
      "cargo-order:read",
      "cargo-order:transition",
      "cargo-order:resolve-exception",
      "dispatch:read",
      "dispatch:assign",
      "dispatch:auto-assign",
      "dispatch:override",
      "vehicle:read",
      "driver:read",
      "booking:read",
      "contract:read",
      "contract:transition",
      "contract:approve-quote",
      "customer:read",
      "maintenance:read",
      "maintenance:block-vehicle",
      "invoice:read",
      "report:read",
      "report:export",
    ],
  },
  auditor: {
    id: "auditor",
    label: "Kiểm soát nội bộ",
    short: "KS",
    department: "Kiểm soát nội bộ",
    scopeLabel: "Hồ sơ kiểm soát và bằng chứng được phân công",
    permissions: [
      "dashboard:read",
      "work-item:read",
      "work-item:audit",
      "cargo-order:read",
      "dispatch:read",
      "vehicle:read",
      "driver:read",
      "booking:read",
      "contract:read",
      "customer:read",
      "maintenance:read",
      "invoice:read",
      "report:read",
      "report:export",
      "audit:read",
      "audit:export",
    ],
  },
} as const satisfies Record<DemoRoleId, DemoRole>;

export const DEFAULT_DEMO_ROLE: DemoRoleId = "dispatcher";
export const DEMO_ROLE_STORAGE_KEY = "ksops:transport:demo-role:v1";

export function decodeDemoRole(value: unknown): DemoRoleId | null {
  if (typeof value !== "string") return null;
  return (DEMO_ROLE_IDS as readonly string[]).includes(value)
    ? value as DemoRoleId
    : null;
}

export function demoRoleCan(roleId: DemoRoleId, permission: Permission) {
  return (DEMO_ROLES[roleId].permissions as readonly Permission[]).includes(permission);
}

export function portalRouteFor(path: PortalPath): PortalRoute {
  const route = PORTAL_ROUTES.find((candidate) => candidate.path === path);
  if (!route) throw new Error(`Unknown portal path: ${path}`);
  return route;
}

export function accessiblePortalRoutes(roleId: DemoRoleId) {
  return PORTAL_ROUTES.filter((route) => demoRoleCan(roleId, route.viewPermission));
}

export function firstAccessiblePortalPath(roleId: DemoRoleId): PortalPath {
  return accessiblePortalRoutes(roleId)[0]?.path ?? "/";
}

import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  char,
  check,
  customType,
  date,
  foreignKey,
  index,
  integer,
  jsonb,
  numeric,
  pgSchema,
  smallint,
  timestamp,
  unique,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

/**
 * Runtime mappings for the first cargo application slice.
 *
 * Handwritten SQL migrations remain authoritative for RLS, GiST exclusion
 * constraints, immutable triggers, and provider provisioning. Keep column and
 * table names here synchronized with db/migrations rather than generating a
 * replacement migration from this file without review.
 */

export const orgSchema = pgSchema("org");
export const iamSchema = pgSchema("iam");
export const fleetSchema = pgSchema("fleet");
export const workforceSchema = pgSchema("workforce");
export const cargoSchema = pgSchema("cargo");
export const cargoPrivateSchema = pgSchema("cargo_private");
export const platformSchema = pgSchema("platform");
export const auditSchema = pgSchema("audit");

const bytea = customType<{ data: Buffer }>({
  dataType() {
    return "bytea";
  },
});

const mutableTimestamps = () => ({
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

const eventTimestamp = () => timestamp("occurred_at", { withTimezone: true }).notNull();

export const organizations = orgSchema.table(
  "organization",
  {
    id: uuid("id").primaryKey(),
    code: varchar("code", { length: 32 }).notNull(),
    legalName: varchar("legal_name", { length: 180 }).notNull(),
    defaultTimezone: varchar("default_timezone", { length: 64 })
      .notNull()
      .default("Asia/Ho_Chi_Minh"),
    status: varchar("status", { length: 20, enum: ["active", "suspended"] })
      .notNull()
      .default("active"),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    uniqueIndex("organization_code_unique_ci").on(sql`lower(${table.code})`),
    check("organization_version_positive", sql`${table.version} > 0`),
  ],
);

export const branches = orgSchema.table(
  "branch",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    parentBranchId: uuid("parent_branch_id"),
    code: varchar("code", { length: 32 }).notNull(),
    name: varchar("name", { length: 160 }).notNull(),
    kind: varchar("kind", {
      length: 20,
      enum: ["branch", "station", "office", "depot", "warehouse"],
    }).notNull(),
    timezone: varchar("timezone", { length: 64 }).notNull().default("Asia/Ho_Chi_Minh"),
    status: varchar("status", { length: 20, enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("branch_org_id_unique").on(table.organizationId, table.id),
    unique("branch_org_code_unique").on(table.organizationId, table.code),
    foreignKey({
      name: "branch_parent_same_org_fk",
      columns: [table.organizationId, table.parentBranchId],
      foreignColumns: [table.organizationId, table.id],
    }),
    index("branch_org_status_idx").on(table.organizationId, table.status, table.kind),
  ],
);

export const locations = orgSchema.table(
  "location",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    branchId: uuid("branch_id"),
    publicCode: varchar("public_code", { length: 40 }).notNull(),
    kind: varchar("kind", {
      length: 24,
      enum: ["branch", "station", "office", "depot", "warehouse", "service_zone"],
    }).notNull(),
    displayName: varchar("display_name", { length: 180 }).notNull(),
    latitude: numeric("latitude", { precision: 9, scale: 6 }),
    longitude: numeric("longitude", { precision: 9, scale: 6 }),
    status: varchar("status", { length: 20, enum: ["active", "inactive"] })
      .notNull()
      .default("active"),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("location_org_id_unique").on(table.organizationId, table.id),
    unique("location_org_code_unique").on(table.organizationId, table.publicCode),
    foreignKey({
      name: "location_branch_same_org_fk",
      columns: [table.organizationId, table.branchId],
      foreignColumns: [branches.organizationId, branches.id],
    }),
  ],
);

export const principals = iamSchema.table(
  "principal",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    kind: varchar("kind", { length: 16, enum: ["human", "service"] }).notNull(),
    identityProvider: varchar("identity_provider", { length: 120 }).notNull(),
    subjectHmac: bytea("subject_hmac").notNull(),
    displayAlias: varchar("display_alias", { length: 100 }).notNull(),
    status: varchar("status", {
      length: 20,
      enum: ["invited", "active", "suspended", "revoked"],
    }).notNull().default("active"),
    lastAuthenticatedAt: timestamp("last_authenticated_at", { withTimezone: true }),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("principal_org_id_unique").on(table.organizationId, table.id),
    unique("principal_subject_unique").on(
      table.organizationId,
      table.identityProvider,
      table.subjectHmac,
    ),
  ],
);

export const vehicles = fleetSchema.table(
  "vehicle",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    homeBranchId: uuid("home_branch_id").notNull(),
    publicCode: varchar("public_code", { length: 40 }).notNull(),
    vehicleType: varchar("vehicle_type", {
      length: 32,
      enum: ["coach", "minibus", "cargo_light", "cargo_medium", "cargo_heavy"],
    }).notNull(),
    seatCapacity: integer("seat_capacity").notNull().default(0),
    cargoCapacityGrams: bigint("cargo_capacity_grams", { mode: "bigint" })
      .notNull()
      .default(sql`0`),
    operationalStatus: varchar("operational_status", {
      length: 24,
      enum: ["available", "assigned", "in_service", "maintenance", "blocked", "retired"],
    }).notNull().default("available"),
    blockedReasonCode: varchar("blocked_reason_code", { length: 50 }),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("vehicle_org_id_unique").on(table.organizationId, table.id),
    unique("vehicle_org_code_unique").on(table.organizationId, table.publicCode),
    foreignKey({
      name: "vehicle_home_branch_same_org_fk",
      columns: [table.organizationId, table.homeBranchId],
      foreignColumns: [branches.organizationId, branches.id],
    }),
    index("vehicle_branch_status_idx").on(
      table.organizationId,
      table.homeBranchId,
      table.operationalStatus,
    ),
  ],
);

export const drivers = workforceSchema.table(
  "driver",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    homeBranchId: uuid("home_branch_id").notNull(),
    publicCode: varchar("public_code", { length: 40 }).notNull(),
    displayAlias: varchar("display_alias", { length: 100 }).notNull(),
    operationalStatus: varchar("operational_status", {
      length: 28,
      enum: ["available", "working", "leave", "verification_pending", "blocked", "retired"],
    }).notNull().default("verification_pending"),
    blockedReasonCode: varchar("blocked_reason_code", { length: 50 }),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("driver_org_id_unique").on(table.organizationId, table.id),
    unique("driver_org_code_unique").on(table.organizationId, table.publicCode),
    foreignKey({
      name: "driver_home_branch_same_org_fk",
      columns: [table.organizationId, table.homeBranchId],
      foreignColumns: [branches.organizationId, branches.id],
    }),
    index("driver_branch_status_idx").on(
      table.organizationId,
      table.homeBranchId,
      table.operationalStatus,
    ),
  ],
);

export const cargoOrders = cargoSchema.table(
  "cargo_order",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    owningBranchId: uuid("owning_branch_id").notNull(),
    assignedBranchId: uuid("assigned_branch_id"),
    publicCode: varchar("public_code", { length: 48 }).notNull(),
    serviceLevel: varchar("service_level", {
      length: 24,
      enum: ["standard", "same_day", "express", "full_trip"],
    }).notNull(),
    status: varchar("status", {
      length: 24,
      enum: [
        "draft",
        "quoted",
        "confirmed",
        "received",
        "loaded",
        "in_transit",
        "arrived",
        "delivered",
        "reconciled",
        "exception",
        "cancelled",
      ],
    }).notNull().default("draft"),
    originLocationId: uuid("origin_location_id").notNull(),
    destinationLocationId: uuid("destination_location_id").notNull(),
    packageCount: integer("package_count").notNull(),
    totalWeightGrams: bigint("total_weight_grams", { mode: "bigint" }).notNull(),
    declaredValueMinor: bigint("declared_value_minor", { mode: "bigint" }),
    currency: char("currency", { length: 3 }).notNull().default("VND"),
    slaDueAt: timestamp("sla_due_at", { withTimezone: true }).notNull(),
    createdByPrincipalId: uuid("created_by_principal_id").notNull(),
    version: bigint("version", { mode: "number" }).notNull().default(1),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("cargo_order_org_id_unique").on(table.organizationId, table.id),
    unique("cargo_order_org_code_unique").on(table.organizationId, table.publicCode),
    foreignKey({
      name: "cargo_order_owning_branch_same_org_fk",
      columns: [table.organizationId, table.owningBranchId],
      foreignColumns: [branches.organizationId, branches.id],
    }),
    foreignKey({
      name: "cargo_order_assigned_branch_same_org_fk",
      columns: [table.organizationId, table.assignedBranchId],
      foreignColumns: [branches.organizationId, branches.id],
    }),
    foreignKey({
      name: "cargo_order_origin_same_org_fk",
      columns: [table.organizationId, table.originLocationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "cargo_order_destination_same_org_fk",
      columns: [table.organizationId, table.destinationLocationId],
      foreignColumns: [locations.organizationId, locations.id],
    }),
    foreignKey({
      name: "cargo_order_creator_same_org_fk",
      columns: [table.organizationId, table.createdByPrincipalId],
      foreignColumns: [principals.organizationId, principals.id],
    }),
    index("cargo_order_branch_status_created_idx").on(
      table.organizationId,
      table.owningBranchId,
      table.status,
      table.createdAt,
      table.id,
    ),
    check("cargo_order_package_count_positive", sql`${table.packageCount} > 0`),
    check(
      "cargo_order_weight_bounded",
      sql`${table.totalWeightGrams} > 0 AND ${table.totalWeightGrams} <= 100000000`,
    ),
  ],
);

export const cargoPackages = cargoSchema.table(
  "cargo_package",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    cargoOrderId: uuid("cargo_order_id").notNull(),
    publicCode: varchar("public_code", { length: 64 }).notNull(),
    categoryCode: varchar("category_code", { length: 50 }).notNull(),
    quantity: integer("quantity").notNull(),
    unitWeightGrams: bigint("unit_weight_grams", { mode: "bigint" }).notNull(),
    lengthMm: integer("length_mm"),
    widthMm: integer("width_mm"),
    heightMm: integer("height_mm"),
    fragile: boolean("fragile").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("cargo_package_org_id_unique").on(table.organizationId, table.id),
    unique("cargo_package_order_code_unique").on(
      table.organizationId,
      table.cargoOrderId,
      table.publicCode,
    ),
    foreignKey({
      name: "cargo_package_order_same_org_fk",
      columns: [table.organizationId, table.cargoOrderId],
      foreignColumns: [cargoOrders.organizationId, cargoOrders.id],
    }),
  ],
);

export const cargoOrderContacts = cargoPrivateSchema.table(
  "order_contact",
  {
    cargoOrderId: uuid("cargo_order_id").primaryKey(),
    organizationId: uuid("organization_id").notNull(),
    senderContactCiphertext: bytea("sender_contact_ciphertext").notNull(),
    senderPhoneLookupHmac: bytea("sender_phone_lookup_hmac"),
    receiverContactCiphertext: bytea("receiver_contact_ciphertext").notNull(),
    receiverPhoneLookupHmac: bytea("receiver_phone_lookup_hmac"),
    originAddressCiphertext: bytea("origin_address_ciphertext"),
    destinationAddressCiphertext: bytea("destination_address_ciphertext"),
    keyVersion: smallint("key_version").notNull(),
    retentionUntil: date("retention_until").notNull(),
    ...mutableTimestamps(),
  },
  (table) => [
    unique("order_contact_org_order_unique").on(table.organizationId, table.cargoOrderId),
    foreignKey({
      name: "order_contact_order_same_org_fk",
      columns: [table.organizationId, table.cargoOrderId],
      foreignColumns: [cargoOrders.organizationId, cargoOrders.id],
    }),
  ],
);

export const cargoOrderEvents = cargoSchema.table(
  "cargo_order_event",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    cargoOrderId: uuid("cargo_order_id").notNull(),
    aggregateVersion: bigint("aggregate_version", { mode: "number" }).notNull(),
    fromStatus: varchar("from_status", { length: 24 }),
    toStatus: varchar("to_status", { length: 24 }).notNull(),
    reasonCode: varchar("reason_code", { length: 60 }).notNull(),
    actorPrincipalId: uuid("actor_principal_id").notNull(),
    occurredAt: eventTimestamp(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    safeMetadata: jsonb("safe_metadata").$type<Record<string, unknown>>().notNull().default({}),
  },
  (table) => [
    unique("cargo_order_event_org_id_unique").on(table.organizationId, table.id),
    unique("cargo_order_event_version_unique").on(
      table.organizationId,
      table.cargoOrderId,
      table.aggregateVersion,
    ),
    foreignKey({
      name: "cargo_order_event_order_same_org_fk",
      columns: [table.organizationId, table.cargoOrderId],
      foreignColumns: [cargoOrders.organizationId, cargoOrders.id],
    }),
    foreignKey({
      name: "cargo_order_event_actor_same_org_fk",
      columns: [table.organizationId, table.actorPrincipalId],
      foreignColumns: [principals.organizationId, principals.id],
    }),
  ],
);

export const auditEvents = auditSchema.table(
  "audit_event",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    occurredAt: eventTimestamp(),
    recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().defaultNow(),
    actorPrincipalId: uuid("actor_principal_id").notNull(),
    action: varchar("action", { length: 120 }).notNull(),
    resourceType: varchar("resource_type", { length: 60 }).notNull(),
    resourceId: uuid("resource_id").notNull(),
    outcome: varchar("outcome", {
      length: 16,
      enum: ["success", "denied", "failure"],
    }).notNull(),
    requestId: varchar("request_id", { length: 64 }).notNull(),
    reasonCode: varchar("reason_code", { length: 80 }),
    redactedChanges: jsonb("redacted_changes").$type<readonly Record<string, unknown>[]>().notNull().default([]),
    sourceIpHmac: bytea("source_ip_hmac"),
    contentHash: bytea("content_hash").notNull(),
  },
  (table) => [
    unique("audit_event_org_id_unique").on(table.organizationId, table.id),
    foreignKey({
      name: "audit_event_actor_same_org_fk",
      columns: [table.organizationId, table.actorPrincipalId],
      foreignColumns: [principals.organizationId, principals.id],
    }),
    index("audit_event_time_idx").on(table.organizationId, table.occurredAt, table.id),
  ],
);

export const idempotencyKeys = platformSchema.table(
  "idempotency_key",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    principalId: uuid("principal_id").notNull(),
    operation: varchar("operation", { length: 120 }).notNull(),
    keyHmac: bytea("key_hmac").notNull(),
    requestHash: bytea("request_hash").notNull(),
    state: varchar("state", {
      length: 16,
      enum: ["pending", "completed", "failed"],
    }).notNull().default("pending"),
    httpStatus: smallint("http_status"),
    safeResponse: jsonb("safe_response").$type<Record<string, unknown>>(),
    resourceType: varchar("resource_type", { length: 60 }),
    resourceId: uuid("resource_id"),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  },
  (table) => [
    unique("idempotency_org_id_unique").on(table.organizationId, table.id),
    unique("idempotency_request_unique").on(
      table.organizationId,
      table.principalId,
      table.operation,
      table.keyHmac,
    ),
    foreignKey({
      name: "idempotency_principal_same_org_fk",
      columns: [table.organizationId, table.principalId],
      foreignColumns: [principals.organizationId, principals.id],
    }),
    index("idempotency_expiry_idx").on(table.expiresAt),
  ],
);

export const outboxMessages = platformSchema.table(
  "outbox_message",
  {
    id: uuid("id").primaryKey(),
    organizationId: uuid("organization_id")
      .notNull()
      .references(() => organizations.id),
    aggregateType: varchar("aggregate_type", { length: 60 }).notNull(),
    aggregateId: uuid("aggregate_id").notNull(),
    aggregateVersion: bigint("aggregate_version", { mode: "number" }).notNull(),
    eventType: varchar("event_type", { length: 120 }).notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    occurredAt: eventTimestamp(),
    availableAt: timestamp("available_at", { withTimezone: true }).notNull().defaultNow(),
    attemptCount: integer("attempt_count").notNull().default(0),
    lockedUntil: timestamp("locked_until", { withTimezone: true }),
    publishedAt: timestamp("published_at", { withTimezone: true }),
    lastErrorCode: varchar("last_error_code", { length: 80 }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    unique("outbox_org_id_unique").on(table.organizationId, table.id),
    unique("outbox_aggregate_event_unique").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.aggregateVersion,
      table.eventType,
    ),
    index("outbox_aggregate_idx").on(
      table.organizationId,
      table.aggregateType,
      table.aggregateId,
      table.aggregateVersion,
    ),
  ],
);

export type CargoOrderRow = typeof cargoOrders.$inferSelect;
export type NewCargoOrderRow = typeof cargoOrders.$inferInsert;
export type CargoPackageRow = typeof cargoPackages.$inferSelect;
export type NewCargoPackageRow = typeof cargoPackages.$inferInsert;
export type CargoOrderEventRow = typeof cargoOrderEvents.$inferSelect;

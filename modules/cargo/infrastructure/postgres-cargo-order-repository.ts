import type { Pool, PoolClient, QueryResultRow } from "pg";
import { ApplicationError, isApplicationError } from "../../shared/application/errors.ts";
import {
  assertCargoOrderInvariants,
  CARGO_ORDER_STATUSES,
  CARGO_SERVICE_LEVELS,
  type CargoOrder,
  type CargoOrderStatus,
} from "../domain/cargo-order.ts";
import type {
  CargoOrderListQuery,
  CargoOrderRepository,
  CreateCargoOrderTransaction,
  IdempotencyContext,
  TransactionResult,
  TransitionCargoOrderTransaction,
} from "../application/ports.ts";

type CargoOrderRow = QueryResultRow & {
  id: string;
  organization_id: string;
  owning_branch_id: string;
  public_code: string;
  service_level: CargoOrder["serviceLevel"];
  status: CargoOrderStatus;
  origin_location_id: string;
  destination_location_id: string;
  package_count: number;
  total_weight_grams: string;
  declared_value_minor: string | null;
  currency: string;
  sla_due_at: Date;
  version: string;
  created_by_principal_id: string;
  created_at: Date;
  updated_at: Date;
};

type IdempotencyRow = QueryResultRow & {
  request_hash_hex: string;
  state: "pending" | "completed" | "failed";
  safe_response: { order?: unknown } | null;
  resource_type: string | null;
  resource_id: string | null;
};

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

const SELECT_ORDER_COLUMNS = `
  id, organization_id, owning_branch_id, public_code, service_level, status,
  origin_location_id, destination_location_id, package_count,
  total_weight_grams::text, declared_value_minor::text, currency, sla_due_at,
  version::text, created_by_principal_id, created_at, updated_at
`;

function toSafeInteger(value: string, field: string) {
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed)) {
    throw new ApplicationError("DATABASE_UNAVAILABLE", `Giá trị ${field} vượt giới hạn an toàn.`);
  }
  return parsed;
}

function rowToOrder(row: CargoOrderRow): CargoOrder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    owningBranchId: row.owning_branch_id,
    publicCode: row.public_code,
    serviceLevel: row.service_level,
    status: row.status,
    originLocationId: row.origin_location_id,
    destinationLocationId: row.destination_location_id,
    packageCount: row.package_count,
    totalWeightGrams: toSafeInteger(row.total_weight_grams, "total_weight_grams"),
    declaredValueMinor: row.declared_value_minor === null
      ? null
      : toSafeInteger(row.declared_value_minor, "declared_value_minor"),
    currency: row.currency,
    slaDueAt: row.sla_due_at.toISOString(),
    version: toSafeInteger(row.version, "version"),
    createdBy: row.created_by_principal_id,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
  };
}

function decodeSafeCargoOrder(
  value: unknown,
  organizationId: string,
  resourceId: string | null,
): CargoOrder | null {
  if (!value || typeof value !== "object") return null;
  const order = value as Partial<CargoOrder>;
  if (typeof order.id !== "string" || !UUID_PATTERN.test(order.id)
    || order.id !== resourceId
    || order.organizationId !== organizationId
    || typeof order.owningBranchId !== "string" || !UUID_PATTERN.test(order.owningBranchId)
    || typeof order.publicCode !== "string" || order.publicCode.length < 1 || order.publicCode.length > 64
    || !CARGO_SERVICE_LEVELS.includes(order.serviceLevel as CargoOrder["serviceLevel"])
    || !CARGO_ORDER_STATUSES.includes(order.status as CargoOrderStatus)
    || typeof order.originLocationId !== "string" || !UUID_PATTERN.test(order.originLocationId)
    || typeof order.destinationLocationId !== "string" || !UUID_PATTERN.test(order.destinationLocationId)
    || !Number.isInteger(order.packageCount)
    || !Number.isSafeInteger(order.totalWeightGrams)
    || (order.declaredValueMinor !== null && !Number.isSafeInteger(order.declaredValueMinor))
    || typeof order.currency !== "string"
    || typeof order.slaDueAt !== "string"
    || !Number.isInteger(order.version) || (order.version ?? 0) < 1
    || typeof order.createdBy !== "string" || !UUID_PATTERN.test(order.createdBy)
    || typeof order.createdAt !== "string" || Number.isNaN(Date.parse(order.createdAt))
    || typeof order.updatedAt !== "string" || Number.isNaN(Date.parse(order.updatedAt))) {
    return null;
  }
  try {
    assertCargoOrderInvariants(order as CargoOrder);
    return order as CargoOrder;
  } catch {
    return null;
  }
}

function mapDatabaseError(error: unknown): never {
  if (isApplicationError(error)) throw error;
  const code = typeof error === "object" && error !== null && "code" in error
    ? String(error.code)
    : "";
  if (["23503", "23514", "22P02", "22001", "22003"].includes(code)) {
    throw new ApplicationError("VALIDATION_FAILED", "Dữ liệu không đáp ứng ràng buộc nghiệp vụ.");
  }
  if (code === "23505") {
    throw new ApplicationError("DATABASE_UNAVAILABLE", "Xung đột định danh; vui lòng thử lại thao tác.");
  }
  throw new ApplicationError("DATABASE_UNAVAILABLE", "Cơ sở dữ liệu tạm thời không khả dụng.");
}

async function setTenantContext(
  client: PoolClient,
  organizationId: string,
  principalId: string,
) {
  await client.query(
    "SELECT set_config('app.organization_id', $1, true), set_config('app.principal_id', $2, true)",
    [organizationId, principalId],
  );
}

export class PostgresCargoOrderRepository implements CargoOrderRepository {
  constructor(
    private readonly pool: Pool,
    private readonly generateId: () => string,
  ) {}

  async list(query: CargoOrderListQuery) {
    const client = await this.pool.connect().catch(mapDatabaseError);
    try {
      await client.query("BEGIN READ ONLY");
      await setTenantContext(client, query.organizationId, query.principalId);
      const branchFilter = query.branchIds === "*" ? null : [...query.branchIds];
      const statuses = query.statuses?.length ? [...query.statuses] : null;
      const result = await client.query<CargoOrderRow>(
        `SELECT ${SELECT_ORDER_COLUMNS}
           FROM cargo.cargo_order
          WHERE organization_id = $1
            AND ($2::uuid[] IS NULL OR owning_branch_id = ANY($2::uuid[]))
            AND ($3::varchar[] IS NULL OR status = ANY($3::varchar[]))
          ORDER BY created_at DESC, id DESC
          LIMIT $4`,
        [query.organizationId, branchFilter, statuses, query.limit],
      );
      await client.query("COMMIT");
      return result.rows.map(rowToOrder);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async getById(organizationId: string, orderId: string, principalId: string) {
    const client = await this.pool.connect().catch(mapDatabaseError);
    try {
      await client.query("BEGIN READ ONLY");
      await setTenantContext(client, organizationId, principalId);
      const result = await client.query<CargoOrderRow>(
        `SELECT ${SELECT_ORDER_COLUMNS}
           FROM cargo.cargo_order
          WHERE organization_id = $1 AND id = $2`,
        [organizationId, orderId],
      );
      await client.query("COMMIT");
      return result.rows[0] ? rowToOrder(result.rows[0]) : null;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async findIdempotentResult(input: {
    organizationId: string;
    principalId: string;
    idempotency: IdempotencyContext;
  }) {
    const client = await this.pool.connect().catch(mapDatabaseError);
    try {
      await client.query("BEGIN READ ONLY");
      await setTenantContext(client, input.organizationId, input.principalId);
      const replay = await this.readIdempotency(
        client,
        input.organizationId,
        input.principalId,
        input.idempotency,
        false,
      );
      await client.query("COMMIT");
      return replay;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  async create(transaction: CreateCargoOrderTransaction): Promise<TransactionResult> {
    return this.inTransaction(
      transaction.order.organizationId,
      transaction.context.actor.id,
      async (client) => {
        const replay = await this.claimIdempotency(
          client,
          transaction.order.organizationId,
          transaction.context.actor.id,
          transaction.context.idempotency,
          transaction.context.occurredAt,
        );
        if (replay) return replay;

        const inserted = await client.query<CargoOrderRow>(
          `INSERT INTO cargo.cargo_order (
             id, organization_id, owning_branch_id, public_code, service_level,
             status, origin_location_id, destination_location_id, package_count,
             total_weight_grams, declared_value_minor, currency, sla_due_at,
             created_by_principal_id, version, created_at, updated_at
           ) VALUES (
             $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13,
             $14, $15, $16, $16
           ) RETURNING ${SELECT_ORDER_COLUMNS}`,
          [
            transaction.order.id,
            transaction.order.organizationId,
            transaction.order.owningBranchId,
            transaction.order.publicCode,
            transaction.order.serviceLevel,
            transaction.order.status,
            transaction.order.originLocationId,
            transaction.order.destinationLocationId,
            transaction.order.packageCount,
            transaction.order.totalWeightGrams,
            transaction.order.declaredValueMinor,
            transaction.order.currency,
            transaction.order.slaDueAt,
            transaction.order.createdBy,
            transaction.order.version,
            transaction.order.createdAt,
          ],
        );
        const order = rowToOrder(inserted.rows[0]);
        await this.writeEvidence(client, transaction);
        await this.completeIdempotency(client, transaction.order.organizationId, transaction.context, order, 201);
        return { order, replayed: false };
      },
    );
  }

  async transition(transaction: TransitionCargoOrderTransaction): Promise<TransactionResult> {
    return this.inTransaction(
      transaction.organizationId,
      transaction.context.actor.id,
      async (client) => {
        const replay = await this.claimIdempotency(
          client,
          transaction.organizationId,
          transaction.context.actor.id,
          transaction.context.idempotency,
          transaction.context.occurredAt,
        );
        if (replay) return replay;

        const updated = await client.query<CargoOrderRow>(
          `UPDATE cargo.cargo_order
              SET status = $1, version = version + 1, updated_at = $2
            WHERE organization_id = $3 AND id = $4
              AND version = $5 AND status = $6
          RETURNING ${SELECT_ORDER_COLUMNS}`,
          [
            transaction.toStatus,
            transaction.context.occurredAt,
            transaction.organizationId,
            transaction.orderId,
            transaction.expectedVersion,
            transaction.fromStatus,
          ],
        );
        if (!updated.rows[0]) {
          const current = await client.query<{ version: string; status: CargoOrderStatus }>(
            "SELECT version::text, status FROM cargo.cargo_order WHERE organization_id = $1 AND id = $2",
            [transaction.organizationId, transaction.orderId],
          );
          if (!current.rows[0]) {
            throw new ApplicationError("NOT_FOUND", "Không tìm thấy đơn hàng.");
          }
          throw new ApplicationError(
            "VERSION_MISMATCH",
            "Đơn hàng đã được cập nhật bởi một thao tác khác.",
            {
              expectedVersion: transaction.expectedVersion,
              currentVersion: toSafeInteger(current.rows[0].version, "version"),
            },
          );
        }
        const order = rowToOrder(updated.rows[0]);
        await this.writeEvidence(client, transaction);
        await this.completeIdempotency(client, transaction.organizationId, transaction.context, order, 200);
        return { order, replayed: false };
      },
    );
  }

  private async inTransaction<T>(
    organizationId: string,
    principalId: string,
    operation: (client: PoolClient) => Promise<T>,
  ): Promise<T> {
    const client = await this.pool.connect().catch(mapDatabaseError);
    try {
      await client.query("BEGIN");
      await setTenantContext(client, organizationId, principalId);
      const result = await operation(client);
      await client.query("COMMIT");
      return result;
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      return mapDatabaseError(error);
    } finally {
      client.release();
    }
  }

  private async claimIdempotency(
    client: PoolClient,
    organizationId: string,
    principalId: string,
    idempotency: IdempotencyContext,
    occurredAt: string,
  ) {
    await client.query(
      `DELETE FROM platform.idempotency_key
        WHERE organization_id = $1 AND principal_id = $2
          AND operation = $3 AND key_hmac = decode($4, 'hex')
          AND expires_at <= statement_timestamp()`,
      [organizationId, principalId, idempotency.operation, idempotency.keyHash],
    );
    const inserted = await client.query<{ id: string }>(
      `INSERT INTO platform.idempotency_key (
         id, organization_id, principal_id, operation, key_hmac, request_hash,
         state, created_at, expires_at
       ) VALUES (
         $1, $2, $3, $4, decode($5, 'hex'), decode($6, 'hex'),
         'pending', $7, $7::timestamptz + interval '24 hours'
       ) ON CONFLICT (organization_id, principal_id, operation, key_hmac)
         DO NOTHING
       RETURNING id`,
      [
        this.generateId(),
        organizationId,
        principalId,
        idempotency.operation,
        idempotency.keyHash,
        idempotency.requestHash,
        occurredAt,
      ],
    );
    if (inserted.rowCount) return null;
    return this.readIdempotency(client, organizationId, principalId, idempotency, true);
  }

  private async readIdempotency(
    client: PoolClient,
    organizationId: string,
    principalId: string,
    idempotency: IdempotencyContext,
    lock: boolean,
  ): Promise<TransactionResult | null> {
    const existing = await client.query<IdempotencyRow>(
      `SELECT encode(request_hash, 'hex') AS request_hash_hex, state, safe_response,
              resource_type, resource_id::text
         FROM platform.idempotency_key
        WHERE organization_id = $1 AND principal_id = $2
          AND operation = $3 AND key_hmac = decode($4, 'hex')
          AND expires_at > statement_timestamp()
        ${lock ? "FOR UPDATE" : ""}`,
      [organizationId, principalId, idempotency.operation, idempotency.keyHash],
    );
    const record = existing.rows[0];
    if (!record) return null;
    if (record.request_hash_hex !== idempotency.requestHash) {
      throw new ApplicationError("IDEMPOTENCY_CONFLICT", "Idempotency-Key đã được dùng cho payload khác.");
    }
    if (record.state !== "completed" || record.resource_type !== "cargo_order") {
      throw new ApplicationError("DATABASE_UNAVAILABLE", "Thao tác cùng khóa đang được xử lý; vui lòng thử lại.");
    }
    const order = decodeSafeCargoOrder(
      record.safe_response?.order,
      organizationId,
      record.resource_id,
    );
    if (!order) {
      throw new ApplicationError("DATABASE_UNAVAILABLE", "Kết quả lưu của thao tác không hợp lệ.");
    }
    return { order, replayed: true };
  }

  private async completeIdempotency(
    client: PoolClient,
    organizationId: string,
    context: CreateCargoOrderTransaction["context"],
    order: CargoOrder,
    httpStatus: number,
  ) {
    const completed = await client.query<{ id: string }>(
      `UPDATE platform.idempotency_key
          SET state = 'completed', http_status = $1, safe_response = $2::jsonb,
              resource_type = 'cargo_order', resource_id = $3,
              completed_at = $4, locked_until = NULL
        WHERE organization_id = $5 AND principal_id = $6
          AND operation = $7 AND key_hmac = decode($8, 'hex')
          AND state = 'pending' AND request_hash = decode($9, 'hex')
      RETURNING id`,
      [
        httpStatus,
        JSON.stringify({ order }),
        order.id,
        context.occurredAt,
        organizationId,
        context.actor.id,
        context.idempotency.operation,
        context.idempotency.keyHash,
        context.idempotency.requestHash,
      ],
    );
    if (completed.rowCount !== 1) {
      throw new ApplicationError("DATABASE_UNAVAILABLE", "Không thể hoàn tất bản ghi chống lặp.");
    }
  }

  private async writeEvidence(
    client: PoolClient,
    transaction: CreateCargoOrderTransaction | TransitionCargoOrderTransaction,
  ) {
    await client.query(
      `INSERT INTO cargo.cargo_order_event (
         id, organization_id, cargo_order_id, aggregate_version, from_status,
         to_status, reason_code, actor_principal_id, occurred_at, safe_metadata
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb)`,
      [
        transaction.event.id,
        transaction.event.organizationId,
        transaction.event.cargoOrderId,
        transaction.event.aggregateVersion,
        transaction.event.fromStatus,
        transaction.event.toStatus,
        transaction.event.reasonCode,
        transaction.event.actorPrincipalId,
        transaction.event.occurredAt,
        JSON.stringify({ requestId: transaction.context.requestId }),
      ],
    );
    await client.query(
      `INSERT INTO audit.audit_event (
         id, organization_id, occurred_at, actor_principal_id, action,
         resource_type, resource_id, outcome, request_id, redacted_changes,
         content_hash
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb,
         digest(convert_to($11, 'UTF8'), 'sha256')
       )`,
      [
        transaction.audit.id,
        transaction.audit.organizationId,
        transaction.audit.occurredAt,
        transaction.audit.actorPrincipalId,
        transaction.audit.action,
        transaction.audit.resourceType,
        transaction.audit.resourceId,
        transaction.audit.outcome,
        transaction.audit.requestId,
        JSON.stringify(transaction.audit.redactedChanges),
        JSON.stringify({
          action: transaction.audit.action,
          resourceId: transaction.audit.resourceId,
          changes: transaction.audit.redactedChanges,
          occurredAt: transaction.audit.occurredAt,
        }),
      ],
    );
    await client.query(
      `INSERT INTO platform.outbox_message (
         id, organization_id, aggregate_type, aggregate_id, aggregate_version,
         event_type, payload, occurred_at, available_at
       ) VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $8)`,
      [
        transaction.outbox.id,
        transaction.outbox.organizationId,
        transaction.outbox.aggregateType,
        transaction.outbox.aggregateId,
        transaction.outbox.aggregateVersion,
        transaction.outbox.eventType,
        JSON.stringify(transaction.outbox.payload),
        transaction.outbox.occurredAt,
      ],
    );
  }
}

import { ApplicationError } from "../../shared/application/errors.ts";
import type { CargoOrder } from "../domain/cargo-order.ts";
import type {
  AuditEvent,
  CargoOrderEvent,
  CargoOrderListQuery,
  CargoOrderRepository,
  CreateCargoOrderTransaction,
  OutboxMessage,
  TransactionResult,
  TransitionCargoOrderTransaction,
} from "../application/ports.ts";

type StoredIdempotencyResult = {
  requestHash: string;
  order: CargoOrder;
};

function copyOrder(order: CargoOrder): CargoOrder {
  return { ...order };
}

/**
 * Test/development adapter only. Production must use the PostgreSQL repository;
 * this adapter deliberately has no persistence across processes.
 */
export class InMemoryCargoOrderRepository implements CargoOrderRepository {
  private readonly orders = new Map<string, CargoOrder>();
  private readonly idempotency = new Map<string, StoredIdempotencyResult>();
  readonly events: CargoOrderEvent[] = [];
  readonly auditEvents: AuditEvent[] = [];
  readonly outboxMessages: OutboxMessage[] = [];

  async list(query: CargoOrderListQuery) {
    return [...this.orders.values()]
      .filter((order) => order.organizationId === query.organizationId)
      .filter((order) => query.branchIds === "*" || query.branchIds.includes(order.owningBranchId))
      .filter((order) => !query.statuses?.length || query.statuses.includes(order.status))
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
      .slice(0, query.limit)
      .map(copyOrder);
  }

  async getById(organizationId: string, orderId: string, principalId: string) {
    void principalId;
    const order = this.orders.get(orderId);
    return order?.organizationId === organizationId ? copyOrder(order) : null;
  }

  async findIdempotentResult(input: {
    organizationId: string;
    principalId: string;
    idempotency: CreateCargoOrderTransaction["context"]["idempotency"];
  }): Promise<TransactionResult | null> {
    return this.resolveIdempotency(input.organizationId, input.principalId, input.idempotency);
  }

  async create(transaction: CreateCargoOrderTransaction): Promise<TransactionResult> {
    const replay = this.resolveIdempotency(
      transaction.order.organizationId,
      transaction.context.actor.id,
      transaction.context.idempotency,
    );
    if (replay) return replay;
    if (this.orders.has(transaction.order.id)) {
      throw new ApplicationError("IDEMPOTENCY_CONFLICT", "Mã đơn hàng đã tồn tại.");
    }

    const order = copyOrder(transaction.order);
    this.orders.set(order.id, order);
    this.events.push({ ...transaction.event });
    this.auditEvents.push({ ...transaction.audit });
    this.outboxMessages.push({ ...transaction.outbox });
    this.rememberIdempotency(transaction.context, order.organizationId, order);
    return { order: copyOrder(order), replayed: false };
  }

  async transition(transaction: TransitionCargoOrderTransaction): Promise<TransactionResult> {
    const replay = this.resolveIdempotency(
      transaction.organizationId,
      transaction.context.actor.id,
      transaction.context.idempotency,
    );
    if (replay) return replay;
    const current = this.orders.get(transaction.orderId);
    if (!current || current.organizationId !== transaction.organizationId) {
      throw new ApplicationError("NOT_FOUND", "Không tìm thấy đơn hàng.");
    }
    if (current.version !== transaction.expectedVersion || current.status !== transaction.fromStatus) {
      throw new ApplicationError("VERSION_MISMATCH", "Đơn hàng đã được cập nhật bởi một thao tác khác.", {
        expectedVersion: transaction.expectedVersion,
        currentVersion: current.version,
      });
    }

    const updated: CargoOrder = {
      ...current,
      status: transaction.toStatus,
      version: current.version + 1,
      updatedAt: transaction.context.occurredAt,
    };
    this.orders.set(updated.id, updated);
    this.events.push({ ...transaction.event });
    this.auditEvents.push({ ...transaction.audit });
    this.outboxMessages.push({ ...transaction.outbox });
    this.rememberIdempotency(transaction.context, updated.organizationId, updated);
    return { order: copyOrder(updated), replayed: false };
  }

  private idempotencyMapKey(
    organizationId: string,
    principalId: string,
    operation: string,
    keyHash: string,
  ) {
    return `${organizationId}:${principalId}:${operation}:${keyHash}`;
  }

  private resolveIdempotency(
    organizationId: string,
    principalId: string,
    idempotency: CreateCargoOrderTransaction["context"]["idempotency"],
  ): TransactionResult | null {
    const key = this.idempotencyMapKey(
      organizationId,
      principalId,
      idempotency.operation,
      idempotency.keyHash,
    );
    const stored = this.idempotency.get(key);
    if (!stored) return null;
    if (stored.requestHash !== idempotency.requestHash) {
      throw new ApplicationError("IDEMPOTENCY_CONFLICT", "Idempotency-Key đã được dùng cho payload khác.");
    }
    return { order: copyOrder(stored.order), replayed: true };
  }

  private rememberIdempotency(
    context: CreateCargoOrderTransaction["context"],
    organizationId: string,
    order: CargoOrder,
  ) {
    const key = this.idempotencyMapKey(
      organizationId,
      context.actor.id,
      context.idempotency.operation,
      context.idempotency.keyHash,
    );
    this.idempotency.set(key, {
      requestHash: context.idempotency.requestHash,
      order: copyOrder(order),
    });
  }
}

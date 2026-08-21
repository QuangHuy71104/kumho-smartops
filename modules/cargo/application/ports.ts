import type { ServerPrincipal } from "../../identity/domain/principal.ts";
import type { CargoOrder, CargoOrderStatus } from "../domain/cargo-order.ts";

export type IdempotencyContext = {
  operation: string;
  keyHash: string;
  requestHash: string;
};

export type MutationContext = {
  actor: ServerPrincipal;
  requestId: string;
  occurredAt: string;
  idempotency: IdempotencyContext;
};

export type CargoOrderEvent = {
  id: string;
  organizationId: string;
  cargoOrderId: string;
  fromStatus: CargoOrderStatus | null;
  toStatus: CargoOrderStatus;
  reasonCode: string;
  actorPrincipalId: string;
  aggregateVersion: number;
  occurredAt: string;
};

export type AuditEvent = {
  id: string;
  organizationId: string;
  actorPrincipalId: string;
  action: string;
  resourceType: "cargo_order";
  resourceId: string;
  outcome: "success";
  requestId: string;
  redactedChanges: Readonly<Record<string, unknown>>;
  occurredAt: string;
};

export type OutboxMessage = {
  id: string;
  organizationId: string;
  aggregateType: "cargo_order";
  aggregateId: string;
  aggregateVersion: number;
  eventType: string;
  payload: Readonly<Record<string, unknown>>;
  occurredAt: string;
};

export type CreateCargoOrderTransaction = {
  order: CargoOrder;
  event: CargoOrderEvent;
  audit: AuditEvent;
  outbox: OutboxMessage;
  context: MutationContext;
};

export type TransitionCargoOrderTransaction = {
  organizationId: string;
  orderId: string;
  expectedVersion: number;
  fromStatus: CargoOrderStatus;
  toStatus: CargoOrderStatus;
  reasonCode: string;
  event: CargoOrderEvent;
  audit: AuditEvent;
  outbox: OutboxMessage;
  context: MutationContext;
};

export type TransactionResult = {
  order: CargoOrder;
  replayed: boolean;
};

export type CargoOrderListQuery = {
  organizationId: string;
  principalId: string;
  branchIds: "*" | readonly string[];
  statuses?: readonly CargoOrderStatus[];
  limit: number;
};

export interface CargoOrderRepository {
  list(query: CargoOrderListQuery): Promise<readonly CargoOrder[]>;
  getById(organizationId: string, orderId: string, principalId: string): Promise<CargoOrder | null>;
  findIdempotentResult(input: {
    organizationId: string;
    principalId: string;
    idempotency: IdempotencyContext;
  }): Promise<TransactionResult | null>;
  create(transaction: CreateCargoOrderTransaction): Promise<TransactionResult>;
  transition(transaction: TransitionCargoOrderTransaction): Promise<TransactionResult>;
}

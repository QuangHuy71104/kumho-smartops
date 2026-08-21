import {
  requireOrganization,
  requirePermission,
  requirePermissionScope,
  scopeForPermission,
  type ServerPrincipal,
} from "../../identity/domain/principal.ts";
import { ApplicationError } from "../../shared/application/errors.ts";
import {
  assertCargoOrderInvariants,
  assertCargoOrderTransition,
  type CargoOrder,
  type CargoOrderStatus,
  type CargoServiceLevel,
} from "../domain/cargo-order.ts";
import type {
  CargoOrderRepository,
  IdempotencyContext,
  MutationContext,
} from "./ports.ts";

export type CargoOrderServiceDependencies = {
  repository: CargoOrderRepository;
  now: () => Date;
  generateId: () => string;
  generatePublicCode: () => string;
};

export type CreateCargoOrderInput = {
  organizationId: string;
  owningBranchId: string;
  serviceLevel: CargoServiceLevel;
  originLocationId: string;
  destinationLocationId: string;
  packageCount: number;
  totalWeightGrams: number;
  declaredValueMinor?: number | null;
  currency: string;
  slaDueAt: string;
};

export type TransitionCargoOrderInput = {
  organizationId: string;
  orderId: string;
  expectedVersion: number;
  toStatus: CargoOrderStatus;
  reasonCode: string;
};

export class CargoOrderService {
  private readonly dependencies: CargoOrderServiceDependencies;

  constructor(dependencies: CargoOrderServiceDependencies) {
    this.dependencies = dependencies;
  }

  async list(
    principal: ServerPrincipal,
    input: { statuses?: readonly CargoOrderStatus[]; limit?: number } = {},
  ) {
    requirePermission(principal, "cargo-order:read");
    const limit = Math.min(100, Math.max(1, input.limit ?? 50));
    return this.dependencies.repository.list({
      organizationId: principal.organizationId,
      principalId: principal.id,
      branchIds: scopeForPermission(principal, "cargo-order:read"),
      statuses: input.statuses,
      limit,
    });
  }

  async get(
    principal: ServerPrincipal,
    input: { organizationId: string; orderId: string },
  ) {
    requirePermission(principal, "cargo-order:read");
    requireOrganization(principal, input.organizationId);
    const order = await this.dependencies.repository.getById(
      input.organizationId,
      input.orderId,
      principal.id,
    );
    if (!order) throw new ApplicationError("NOT_FOUND", "Không tìm thấy đơn hàng.");
    requirePermissionScope(principal, "cargo-order:read", order.owningBranchId);
    return order;
  }

  async create(
    principal: ServerPrincipal,
    input: CreateCargoOrderInput,
    request: { requestId: string; idempotency: IdempotencyContext },
  ) {
    requirePermission(principal, "cargo-order:create");
    requireOrganization(principal, input.organizationId);
    requirePermissionScope(principal, "cargo-order:create", input.owningBranchId);
    if (request.idempotency.operation !== "cargo-order:create") {
      throw new ApplicationError("VALIDATION_FAILED", "Namespace idempotency không hợp lệ.");
    }
    const replay = await this.dependencies.repository.findIdempotentResult({
      organizationId: input.organizationId,
      principalId: principal.id,
      idempotency: request.idempotency,
    });
    if (replay) {
      requirePermissionScope(principal, "cargo-order:create", replay.order.owningBranchId);
      return replay;
    }

    const occurredAt = this.dependencies.now().toISOString();
    const order: CargoOrder = {
      id: this.dependencies.generateId(),
      organizationId: input.organizationId,
      owningBranchId: input.owningBranchId,
      publicCode: this.dependencies.generatePublicCode(),
      serviceLevel: input.serviceLevel,
      status: "draft",
      originLocationId: input.originLocationId,
      destinationLocationId: input.destinationLocationId,
      packageCount: input.packageCount,
      totalWeightGrams: input.totalWeightGrams,
      declaredValueMinor: input.declaredValueMinor ?? null,
      currency: input.currency,
      slaDueAt: input.slaDueAt,
      version: 1,
      createdBy: principal.id,
      createdAt: occurredAt,
      updatedAt: occurredAt,
    };
    assertCargoOrderInvariants(order);

    const context: MutationContext = {
      actor: principal,
      requestId: request.requestId,
      occurredAt,
      idempotency: request.idempotency,
    };
    const eventId = this.dependencies.generateId();
    const result = await this.dependencies.repository.create({
      order,
      context,
      event: {
        id: eventId,
        organizationId: order.organizationId,
        cargoOrderId: order.id,
        fromStatus: null,
        toStatus: order.status,
        reasonCode: "ORDER_CREATED",
        actorPrincipalId: principal.id,
        aggregateVersion: order.version,
        occurredAt,
      },
      audit: {
        id: this.dependencies.generateId(),
        organizationId: order.organizationId,
        actorPrincipalId: principal.id,
        action: "cargo.order.created",
        resourceType: "cargo_order",
        resourceId: order.id,
        outcome: "success",
        requestId: request.requestId,
        redactedChanges: {
          status: order.status,
          owningBranchId: order.owningBranchId,
          packageCount: order.packageCount,
          totalWeightGrams: order.totalWeightGrams,
        },
        occurredAt,
      },
      outbox: {
        id: this.dependencies.generateId(),
        organizationId: order.organizationId,
        aggregateType: "cargo_order",
        aggregateId: order.id,
        aggregateVersion: order.version,
        eventType: "cargo.order.created",
        payload: {
          cargoOrderId: order.id,
          publicCode: order.publicCode,
          owningBranchId: order.owningBranchId,
          status: order.status,
          version: order.version,
        },
        occurredAt,
      },
    });

    return result;
  }

  async transition(
    principal: ServerPrincipal,
    input: TransitionCargoOrderInput,
    request: { requestId: string; idempotency: IdempotencyContext },
  ) {
    requireOrganization(principal, input.organizationId);
    if (request.idempotency.operation !== "cargo-order:transition") {
      throw new ApplicationError("VALIDATION_FAILED", "Namespace idempotency không hợp lệ.");
    }
    requirePermission(principal, "cargo-order:transition");
    const replay = await this.dependencies.repository.findIdempotentResult({
      organizationId: input.organizationId,
      principalId: principal.id,
      idempotency: request.idempotency,
    });
    if (replay) {
      requirePermissionScope(principal, "cargo-order:transition", replay.order.owningBranchId);
      return replay;
    }

    const current = await this.dependencies.repository.getById(
      input.organizationId,
      input.orderId,
      principal.id,
    );
    if (!current) throw new ApplicationError("NOT_FOUND", "Không tìm thấy đơn hàng.");
    const requiredPermission =
      current.status === "exception" ? "cargo-order:resolve-exception" : "cargo-order:transition";
    requirePermissionScope(principal, requiredPermission, current.owningBranchId);
    assertCargoOrderTransition(current.status, input.toStatus);

    if (!Number.isInteger(input.expectedVersion) || input.expectedVersion < 1) {
      throw new ApplicationError("VALIDATION_FAILED", "Phiên bản đơn hàng không hợp lệ.", { field: "expectedVersion" });
    }

    const occurredAt = this.dependencies.now().toISOString();
    const nextVersion = current.version + 1;
    const context: MutationContext = {
      actor: principal,
      requestId: request.requestId,
      occurredAt,
      idempotency: request.idempotency,
    };
    const result = await this.dependencies.repository.transition({
      organizationId: current.organizationId,
      orderId: current.id,
      expectedVersion: input.expectedVersion,
      fromStatus: current.status,
      toStatus: input.toStatus,
      reasonCode: input.reasonCode,
      context,
      event: {
        id: this.dependencies.generateId(),
        organizationId: current.organizationId,
        cargoOrderId: current.id,
        fromStatus: current.status,
        toStatus: input.toStatus,
        reasonCode: input.reasonCode,
        actorPrincipalId: principal.id,
        aggregateVersion: nextVersion,
        occurredAt,
      },
      audit: {
        id: this.dependencies.generateId(),
        organizationId: current.organizationId,
        actorPrincipalId: principal.id,
        action: "cargo.order.status_changed",
        resourceType: "cargo_order",
        resourceId: current.id,
        outcome: "success",
        requestId: request.requestId,
        redactedChanges: { fromStatus: current.status, toStatus: input.toStatus, reasonCode: input.reasonCode },
        occurredAt,
      },
      outbox: {
        id: this.dependencies.generateId(),
        organizationId: current.organizationId,
        aggregateType: "cargo_order",
        aggregateId: current.id,
        aggregateVersion: nextVersion,
        eventType: "cargo.order.status_changed",
        payload: {
          cargoOrderId: current.id,
          publicCode: current.publicCode,
          fromStatus: current.status,
          toStatus: input.toStatus,
          version: nextVersion,
        },
        occurredAt,
      },
    });

    return result;
  }
}

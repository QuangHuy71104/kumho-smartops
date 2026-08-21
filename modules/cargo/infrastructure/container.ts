import "server-only";

import { v7 as uuidv7 } from "uuid";
import { getDatabasePool } from "../../../lib/server/db/pool.ts";
import { CargoOrderService } from "../application/cargo-order-service.ts";
import { PostgresCargoOrderRepository } from "./postgres-cargo-order-repository.ts";

let service: CargoOrderService | undefined;

function publicCode() {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = uuidv7().replaceAll("-", "").slice(-10).toUpperCase();
  return `CGO-${date}-${suffix}`;
}

export function getCargoOrderService() {
  service ??= new CargoOrderService({
    repository: new PostgresCargoOrderRepository(getDatabasePool(), uuidv7),
    now: () => new Date(),
    generateId: uuidv7,
    generatePublicCode: publicCode,
  });
  return service;
}

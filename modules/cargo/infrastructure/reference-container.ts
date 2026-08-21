import "server-only";

import { getDatabasePool } from "../../../lib/server/db/pool.ts";
import { CargoReferenceService } from "../application/cargo-reference-service.ts";
import { PostgresCargoReferenceRepository } from "./postgres-cargo-reference-repository.ts";

let referenceService: CargoReferenceService | undefined;

export function getCargoReferenceService() {
  referenceService ??= new CargoReferenceService(
    new PostgresCargoReferenceRepository(getDatabasePool()),
  );
  return referenceService;
}

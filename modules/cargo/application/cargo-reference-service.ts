import {
  scopeForPermission,
  type ServerPrincipal,
} from "../../identity/domain/principal.ts";

export type CargoBranchReference = Readonly<{
  id: string;
  code: string;
  name: string;
  kind: "branch" | "station" | "office" | "depot" | "warehouse";
  timezone: string;
}>;

export type CargoLocationReference = Readonly<{
  id: string;
  branchId: string;
  publicCode: string;
  kind: "branch" | "station" | "office" | "depot" | "warehouse" | "service_zone";
  displayName: string;
}>;

export type CargoReferenceData = Readonly<{
  branches: readonly CargoBranchReference[];
  locations: readonly CargoLocationReference[];
}>;

export type CargoReferenceQuery = Readonly<{
  organizationId: string;
  principalId: string;
  branchIds: "*" | readonly string[];
}>;

export interface CargoReferenceRepository {
  listActiveForPrincipal(query: CargoReferenceQuery): Promise<CargoReferenceData>;
}

/**
 * Authorization stays in the application layer. The repository adds tenant RLS
 * as a database backstop and returns operational labels only, never private data.
 */
export class CargoReferenceService {
  private readonly repository: CargoReferenceRepository;

  constructor(repository: CargoReferenceRepository) {
    this.repository = repository;
  }

  async list(principal: ServerPrincipal): Promise<CargoReferenceData> {
    const branchIds = scopeForPermission(principal, "cargo-order:read");
    return this.repository.listActiveForPrincipal({
      organizationId: principal.organizationId,
      principalId: principal.id,
      branchIds,
    });
  }
}

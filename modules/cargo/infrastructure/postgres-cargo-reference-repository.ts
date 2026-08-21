import type { Pool, PoolClient, QueryResultRow } from "pg";
import { ApplicationError } from "../../shared/application/errors.ts";
import type {
  CargoBranchReference,
  CargoLocationReference,
  CargoReferenceData,
  CargoReferenceQuery,
  CargoReferenceRepository,
} from "../application/cargo-reference-service.ts";

type BranchRow = QueryResultRow & {
  id: string;
  code: string;
  name: string;
  kind: CargoBranchReference["kind"];
  timezone: string;
};

type LocationRow = QueryResultRow & {
  id: string;
  branch_id: string;
  public_code: string;
  kind: CargoLocationReference["kind"];
  display_name: string;
};

const MAX_REFERENCE_BRANCHES = 500;
const MAX_REFERENCE_LOCATIONS = 2_000;

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

function toReferenceData(
  branches: readonly BranchRow[],
  locations: readonly LocationRow[],
): CargoReferenceData {
  return Object.freeze({
    branches: Object.freeze(branches.map((branch) => Object.freeze({
      id: branch.id,
      code: branch.code,
      name: branch.name,
      kind: branch.kind,
      timezone: branch.timezone,
    }))),
    locations: Object.freeze(locations.map((location) => Object.freeze({
      id: location.id,
      branchId: location.branch_id,
      publicCode: location.public_code,
      kind: location.kind,
      displayName: location.display_name,
    }))),
  });
}

export class PostgresCargoReferenceRepository implements CargoReferenceRepository {
  private readonly pool: Pool;

  constructor(pool: Pool) {
    this.pool = pool;
  }

  async listActiveForPrincipal(query: CargoReferenceQuery): Promise<CargoReferenceData> {
    const client = await this.pool.connect().catch(() => {
      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Dữ liệu chi nhánh tạm thời chưa khả dụng.",
      );
    });

    try {
      await client.query("BEGIN READ ONLY");
      await setTenantContext(client, query.organizationId, query.principalId);
      const branchFilter = query.branchIds === "*" ? null : [...query.branchIds];
      const branchResult = await client.query<BranchRow>(
        `SELECT id, code, name, kind, timezone
           FROM org.branch
          WHERE organization_id = $1
            AND status = 'active'
            AND ($2::uuid[] IS NULL OR id = ANY($2::uuid[]))
          ORDER BY name, id
          LIMIT $3`,
        [query.organizationId, branchFilter, MAX_REFERENCE_BRANCHES + 1],
      );
      if (branchResult.rows.length > MAX_REFERENCE_BRANCHES) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Danh mục chi nhánh vượt giới hạn an toàn của pilot.",
        );
      }
      const returnedBranchIds = branchResult.rows.map((branch) => branch.id);
      const locationResult = await client.query<LocationRow>(
        `SELECT location.id, location.branch_id, location.public_code,
                location.kind, location.display_name
           FROM org.location AS location
           JOIN org.branch AS branch
             ON branch.organization_id = location.organization_id
            AND branch.id = location.branch_id
          WHERE location.organization_id = $1
            AND location.status = 'active'
            AND branch.status = 'active'
            AND location.branch_id = ANY($2::uuid[])
          ORDER BY location.display_name, location.id
          LIMIT $3`,
        [query.organizationId, returnedBranchIds, MAX_REFERENCE_LOCATIONS + 1],
      );
      if (locationResult.rows.length > MAX_REFERENCE_LOCATIONS) {
        throw new ApplicationError(
          "DATABASE_UNAVAILABLE",
          "Danh mục địa điểm vượt giới hạn an toàn của pilot.",
        );
      }
      await client.query("COMMIT");
      return toReferenceData(branchResult.rows, locationResult.rows);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      if (error instanceof ApplicationError) throw error;
      throw new ApplicationError(
        "DATABASE_UNAVAILABLE",
        "Dữ liệu chi nhánh tạm thời chưa khả dụng.",
      );
    } finally {
      client.release();
    }
  }
}

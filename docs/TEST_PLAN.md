# Kế hoạch kiểm thử KSOps

## 1. Trạng thái bằng chứng

Repository hiện có automated test cho demo UI/data helpers, server safety boundary, Auth0/internal authorization mapping, cargo domain/application/HTTP contract, SQL migration invariants và cargo transaction trên PostgreSQL thật.

Điều này chứng minh vertical slice trong phạm vi test, **không chứng minh hệ thống production-ready**. Chưa có môi trường doanh nghiệp để kiểm thử end-to-end Auth0 + Vercel + Neon, UAT, load, penetration test, alert/on-call hoặc restore drill.

## 2. Quality gate hiện hành

### Local/static suite

```bash
npm ci
npm run check
npm run build
npm audit --audit-level=high
```

`npm run check` chạy typecheck → lint → toàn bộ `tests/*.test.mjs`. `npm run build` và dependency audit là gate riêng.

### PostgreSQL integration

Các biến `MIGRATION_DATABASE_URL` và `TEST_DATABASE_URL` phải trỏ tới database local/test cô lập; không dùng pilot database:

```bash
docker compose up -d postgres
npm run db:migrate:status
npm run db:migrate
npm run db:check
```

Seed development chỉ chứa synthetic data và cần hai guard qua `PGOPTIONS`; lệnh/điều kiện chuẩn nằm tại [db/README.md](../db/README.md). Sau khi migrate + seed:

```bash
npm run test:integration:postgres
docker compose down
```

### CI

| Job | Bằng chứng |
|---|---|
| `quality` | forbidden tracked file guard, typecheck, lint, production build, source/unit/contract tests, dependency audit high |
| `database` | PostgreSQL 17 service, numbered migrations, guarded synthetic seed, real PostgreSQL cargo integration |

CI không sử dụng production credential/endpoint. Một pipeline xanh chỉ có giá trị cho đúng artifact SHA đã chạy.

## 3. Ma trận đã triển khai

| Lớp | Phạm vi đang có | Giới hạn |
|---|---|---|
| Demo/domain helpers | order, fleet/driver/maintenance, dispatch simulation, booking/contract/finance decoder, CSV safety | chứng minh fixture/local behavior, không phải backend các miền đó |
| Access demo | route/role registry, deny path, separation-of-duties minh họa | demo role switch không phải security boundary |
| Server config/HTTP | fail-closed mode, TLS DB config, request ID, Problem Details, origin/body/idempotency HMAC | chưa có deployed WAF/rate-limit test |
| Auth/IAM | Auth0 claim mapping, active internal directory, tenant context, permission-specific scopes, cross-role negative case | cần end-to-end test với tenant/IdP doanh nghiệp |
| Cargo domain/application | create, list/get scope, transition matrix, exception permission, idempotency replay/conflict, evidence atomicity | adapter in-memory không thay PostgreSQL evidence |
| HTTP cargo contract | strict body/query/UUID, body bounds, ETag/If-Match, safe presenter | source/handler contract; chưa có browser/deployed API E2E |
| Database source | migration order/checksum, tenant FK, RLS, immutable audit/event, dispatch exclusion, guarded seed, Drizzle mapping | parser invariants không thay migration execution |
| PostgreSQL integration | principal directory/RLS, atomic order+event+audit+outbox, replay/conflict, expired-key reuse và concurrent optimistic update | chưa có failover, large dataset hoặc long-running soak |
| Resilience/UI | loading/error/not-found, capability honesty, bounded pilot response decoders | chưa có real-browser accessibility/network fault suite |

## 4. Invariant cargo bắt buộc

Mọi thay đổi cargo phải giữ các case sau:

1. Create hợp lệ sinh `draft` version 1; order, cargo event, audit, outbox và idempotency result cùng commit hoặc cùng rollback.
2. Cùng `Idempotency-Key` + payload replay cùng resource; key giống/payload khác trả `409`; record hết hạn được thu hồi atomically và key có thể dùng lại mà không replay stale resource.
3. `cargo-order:create/read/transition/resolve-exception` kiểm tra scope riêng của chính permission đó; role khác có org scope không được mở rộng cargo scope.
4. Read ngoài tenant/object scope không làm lộ resource tồn tại.
5. Hai transition đồng thời với cùng ETag chỉ có một thành công; request còn lại trả version conflict/`412`.
6. Thiếu `If-Match` trả `428`; transition sai state machine trả `422`; terminal state không cập nhật.
7. Resolve từ `exception` yêu cầu đồng thời `cargo-order:transition` và `cargo-order:resolve-exception`; scope riêng của cả hai permission phải bao phủ branch.
8. Public response không có `organizationId`, actor, Auth0 subject, raw idempotency key hoặc PII.
9. RLS deny khi thiếu/sai tenant context; runtime role không update/delete audit/event.
10. Query/body ngoài allowlist, JSON quá 64 KiB, Origin sai và request ID không an toàn đều bị từ chối.

## 5. Database và migration test

### Mỗi migration PR

- tên file tăng tuần tự; checksum mới được review, không sửa migration đã áp dụng;
- chạy từ database rỗng và database ở phiên bản N-1;
- chạy `db:migrate` hai lần để chứng minh idempotent runner/status;
- kiểm tra composite FK chặn cross-tenant;
- kiểm tra `ENABLE` + `FORCE RLS`, context deny-by-default và grants của runtime role;
- kiểm tra audit/cargo event append-only;
- kiểm tra GiST exclusion cho vehicle/driver với interval `[start,end)` và hai transaction cạnh tranh;
- kiểm tra migration lock/checksum khi hai runner đồng thời hoặc source drift.

### Trước pilot

- test expand → compatible deploy → backfill → contract trên bản sao synthetic gần quy mô dự kiến;
- đo lock duration, query plan/index và connection pool saturation;
- PITR/restore vào môi trường cô lập; kiểm tra count, FK/RLS, cargo event/version, audit/idempotency/outbox;
- chứng minh runtime/migration identity tách quyền; break-glass có MFA/time limit/audit.

## 6. API và identity test trước pilot

- Auth0 login/callback/logout, rolling session, timeout/revoke và MFA với exact origin; reject issuer/subject/session giả.
- Unknown/suspended/unlinked principal fail closed; external role/permission claims không cấp quyền.
- Ma trận allow/deny theo named pilot user, permission và branch/object scope; IDOR enumeration.
- Mutation kiểm tra same-origin, cookie/session, JSON content type/limit, mass assignment và injection.
- Headers `Cache-Control`, `Vary`, `ETag`, `Location`, replay flag, request ID và `application/problem+json` khớp [API Spec](API_SPEC.md).
- Log/trace/metric redaction: không token, contact/address, document, raw GPS/payment, SQL hoặc secret.
- Logout/revoke/secret rotation và credential compromise tabletop theo [Pilot Runbook](RUNBOOK_PILOT.md).

## 7. UI, accessibility và browser

Route public demo cần giữ honest labeling và không gọi backend thật. Trước pilot, cargo UI phải được test trên đúng mode/API:

- Chrome/Edge/Safari hoặc browser matrix được phê duyệt; 390×844, 768×1024, 1366×768 và 1440×900;
- loading/empty/error/unauthenticated/forbidden/conflict/offline/stale state;
- keyboard-only, focus order/return, label/name, live region, zoom 200%, reduced motion, contrast;
- automated axe không có serious/critical và screen-reader critical journey;
- retry create không nhân đôi order; `412` refresh đúng aggregate mới nhất;
- client decoder fail closed khi server payload sai/oversized; không render HTML không tin cậy.

Hiện chưa có Playwright/Cypress hoặc deployed browser suite; các mục này là blocker, không được đánh dấu đạt từ source tests.

## 8. Performance, resilience và security

Ngưỡng chính thức phải được Product/SRE chốt từ lưu lượng pilot. Baseline đề xuất để đo ở staging synthetic:

- list/get cargo p95 ≤ 500 ms; create/transition p95 ≤ 800 ms tại concurrency pilot đã thỏa thuận;
- 100 request cạnh tranh cùng expected version: đúng một update thành công;
- DB failure/timeouts không tạo partial evidence; pool không cạn dưới burst bounded;
- outbox backlog phục hồi sau worker outage mà không nhân đôi side effect;
- restore đạt RPO/RTO đã được Data Owner phê duyệt.

Security release gate gồm threat model review, SAST/dependency/secret scan, IDOR/CSRF/session/injection test, WAF/rate-limit validation và penetration test theo phạm vi. Finding critical/high = release blocker; medium cần owner/deadline/risk acceptance.

Outbox worker, rate limit, integration adapter và observability chưa triển khai, nên các test tương ứng hiện là backlog chứ không phải bằng chứng đạt.

## 9. UAT cargo pilot

Cargo Operations thực hiện script bằng dữ liệu synthetic trên staging:

1. đăng nhập named user; xác nhận đúng chi nhánh và thao tác được cấp;
2. tạo đơn ở từng service level/biên validation;
3. tìm/list/get và chuyển toàn bộ happy path;
4. exception → resolve bằng đúng role; user thường bị từ chối;
5. retry, double-click và hai điều phối viên cập nhật cùng đơn;
6. session hết hạn, DB/API lỗi, rollback/khôi phục UI;
7. đối chiếu aggregate với event, audit và outbox;
8. xác nhận thuật ngữ, SLA, thông báo lỗi và quy trình support.

Evidence gồm case ID, build SHA, environment, named test role, kết quả, request ID và defect; screenshot/log phải không có PII/secret. Operations, Product, Security/Data và Platform cùng sign-off.

## 10. Exit criteria

Cargo pilot chỉ được đề xuất `GO` khi:

- mọi automated gate trên đúng release SHA xanh, không quarantine test quan trọng;
- invariant cargo/RLS/permission-specific scope/concurrency đạt trên PostgreSQL;
- UI/API Auth0 E2E, accessibility và UAT được ký;
- migration, application rollback, backup/restore và rotation rehearsal đạt;
- observability/SLO/alert/on-call được test;
- không còn defect Sev-1/2 hoặc finding security critical/high;
- limitation, owner, RPO/RTO, support/cutover/abort criteria và external integration exclusion được ghi rõ;
- toàn bộ gate tương ứng trong [Production Readiness](PRODUCTION_READINESS.md) có evidence.

Kết quả cargo không được dùng để tuyên bố dispatch, booking, maintenance, contract hoặc finance đã sẵn sàng; mỗi tranche cần test plan và sign-off riêng.

# KSOps — Transport Control

KSOps là dự án thực tập lập trình viên mô phỏng một nền tảng điều hành vận tải hợp nhất cho đội xe, tài xế, đơn vận chuyển hàng hóa, điều phối, vé hành khách, thuê xe, bảo dưỡng, tài chính và báo cáo.

> **Trạng thái an toàn:** [bản Vercel công khai](https://kumho-smartops.vercel.app) vẫn chạy ở chế độ `demo`, chỉ dùng fixture synthetic và trạng thái trình duyệt. Đây không phải hệ thống chính thức, không kết nối dữ liệu hoặc tài khoản doanh nghiệp và chưa được phép vận hành nghiệp vụ thật.

## Hiện trạng triển khai

Repository hiện có hai lớp khác nhau:

| Lớp | Đã có | Chưa được tuyên bố |
|---|---|---|
| Demo công khai | 11 màn hình responsive, 8 vai trò minh họa, dữ liệu giả lập, một số thao tác `localStorage` | đăng nhập thật, dữ liệu bền vững hoặc security boundary |
| Nền tảng pilot trong mã nguồn | PostgreSQL migrations, RLS tenant, Auth0 session boundary, principal/role/scope nội bộ, cargo API, idempotency, optimistic concurrency, audit và outbox | đã provision production, đã kết nối bản Vercel công khai hoặc đã qua go-live gate |

Lát cắt hàng hóa đã được triển khai theo cấu trúc domain → application service → PostgreSQL repository → HTTP API và có integration test với PostgreSQL thật trong CI. Route `/don-hang` đã có nhánh pilot gọi API thật khi runtime chọn pilot; deployment Vercel công khai vẫn chọn workspace demo.

Trạng thái từng miền:

- **Cargo:** có vertical slice backend đầu tiên cho list/get/create/transition.
- **Organization/IAM/Fleet/Driver/Dispatch:** đã có schema nền tảng; Auth0 và principal directory có adapter server-side; dispatch có constraint chống trùng lịch ở database.
- **Dispatch UI, vé, hợp đồng, CRM, bảo dưỡng, tài chính và báo cáo:** vẫn dùng fixture hoặc `localStorage`; chưa có application/API production tương ứng.
- **GPS, payment, e-invoice, ERP, notification và object storage:** chưa tích hợp.

Vì vậy dự án **chưa production-ready**. Xem [Production Readiness](docs/PRODUCTION_READINESS.md) để biết blocker và gate bắt buộc.

## Năng lực giao diện

| Route | Năng lực demo |
|---|---|
| `/` | trung tâm điều hành và KPI theo ca |
| `/don-hang` | đơn hàng hóa, tìm kiếm/lọc, chi tiết và workflow mô phỏng |
| `/dieu-phoi` | bàn điều phối xe, tài xế và cảnh báo xung đột |
| `/doi-xe` | danh mục xe, tải/ghế và trạng thái khai thác |
| `/tai-xe` | ca làm, mức sẵn sàng và tuân thủ |
| `/ve-xe` | tra cứu chuyến, sơ đồ ghế và đặt chỗ mô phỏng |
| `/hop-dong` | pipeline báo giá và thuê xe |
| `/khach-hang` | CRM tổng hợp bằng dữ liệu giả lập |
| `/bao-duong` | work order, lịch và checklist mô phỏng |
| `/tai-chinh` | hóa đơn, công nợ và chỉ số mô phỏng |
| `/bao-cao` | KPI đa kỳ và xuất CSV an toàn |

Bộ chuyển vai trò trên giao diện chỉ minh họa UX. Khi chạy pilot, quyền được lấy từ Auth0 session đã xác minh rồi ánh xạ tới principal, permission và scope trong PostgreSQL; client không được tự khai role hoặc tenant.

## API đã triển khai

Base path: `/api/v1`.

| Endpoint | Chế độ | Mục đích |
|---|---|---|
| `GET /health/live` | demo và pilot | process liveness |
| `GET /health/ready` | demo và pilot | pilot kiểm tra migration checksum, runtime grants, tenant context và RLS read |
| `GET /system/capabilities` | demo và pilot | snapshot bảo thủ về capability đã xác minh |
| `GET /me` | pilot | principal, permission và scope phía server |
| `GET /reference-data` | pilot | chi nhánh/địa điểm cargo active theo scope đọc |
| `GET /cargo-orders` | pilot | danh sách theo scope và bộ lọc allowlist |
| `GET /cargo-orders/{id}` | pilot | chi tiết đơn theo object-level scope |
| `POST /cargo-orders` | pilot | tạo đơn idempotent trong transaction |
| `POST /cargo-orders/{id}/transitions` | pilot | chuyển trạng thái bằng `If-Match` và idempotency |

Ở chế độ demo, các API nghiệp vụ không âm thầm dùng dữ liệu giả; chúng fail closed vì thiếu cấu hình pilot. Contract đầy đủ nằm tại [API Spec](docs/API_SPEC.md).

## Công nghệ và kiến trúc

- Next.js 16 App Router, React 19, TypeScript và Node.js 22.
- Modular monolith với module identity, cargo và shared application errors.
- PostgreSQL 16+; local/CI dùng PostgreSQL 17.
- Drizzle schema cho runtime mapping; migration SQL được review là nguồn schema có thẩm quyền.
- Auth0 SDK server-side; permission/scope cuối cùng lấy từ directory nội bộ.
- UUIDv7, public code không chứa PII, RLS theo organization, composite FK chặn cross-tenant.
- Transactional audit/outbox và HMAC-scoped idempotency.
- Vercel Functions được cấu hình tại Singapore (`sin1`).

Xem [Architecture](docs/ARCHITECTURE.md) để biết trust boundary và luồng giao dịch.

## Chạy demo cục bộ

Yêu cầu Node.js `22.x` và npm:

```bash
npm ci
npm run dev
```

Không cần credential cho chế độ demo. Cấu hình mặc định fail closed về `demo`.

Quality gate:

```bash
npm run check
npm run build
npm audit --audit-level=high
```

## PostgreSQL cục bộ và integration test

Các lệnh dưới đây giả định `MIGRATION_DATABASE_URL` và `TEST_DATABASE_URL` đã được đặt trong terminal cục bộ; không ghi giá trị vào source hoặc lịch sử shell dùng chung.

```bash
docker compose up -d postgres
npm run db:migrate:status
npm run db:migrate
npm run db:check
```

Seed chỉ chứa dữ liệu synthetic và sẽ từ chối chạy nếu thiếu hai guard development. Thiết lập `PGOPTIONS` theo [hướng dẫn database](db/README.md), sau đó:

```bash
psql "$MIGRATION_DATABASE_URL" -X -v ON_ERROR_STOP=1 -f db/seeds/dev/001_synthetic_pilot.sql
npm run test:integration:postgres
docker compose down
```

`db:migrate` chỉ chấp nhận `MIGRATION_DATABASE_URL`; nó cố ý không dùng `DATABASE_URL` của runtime.

Runtime role phải được tạo ngoài migration rồi nhận đúng bộ quyền cargo qua `db/admin/grant_runtime_role.sql` theo [hướng dẫn admin](db/admin/README.md). `DATABASE_URL` tới host từ xa bắt buộc dùng TLS hostname/certificate verification với `sslmode=verify-full`; runtime không được dùng owner/migration credential.

## Biến môi trường

Chỉ lưu trong secret manager của từng môi trường. Repository không cung cấp hoặc commit giá trị.

| Nhóm | Tên biến |
|---|---|
| Chế độ/runtime | `KSOPS_MODE`, `APP_BASE_URL` |
| Runtime database | `DATABASE_URL` |
| Migration/test | `MIGRATION_DATABASE_URL`, `TEST_DATABASE_URL`, `PGOPTIONS` |
| Auth0 | `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET` |
| Tenant và HMAC | `KSOPS_ORGANIZATION_ID`, `KSOPS_IDEMPOTENCY_SECRET`, `KSOPS_IDENTITY_LOOKUP_SECRET` |
| URL công khai | `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL` |

Khi `KSOPS_MODE` chọn chế độ pilot, toàn bộ cấu hình server phải hợp lệ; thiếu bất kỳ thành phần bắt buộc nào sẽ trả lỗi cấu hình an toàn thay vì tự hạ cấp sang backend giả.

## Cấu trúc repository

```text
app/                    # UI routes và /api/v1 route handlers
lib/server/             # config, Auth0, DB pool và HTTP safety boundary
modules/                # identity/cargo domain, application và infrastructure
db/                     # Drizzle mapping, SQL migrations và guarded dev seed
scripts/                # checksum/advisory-lock migration runner
tests/                  # unit, contract, schema và PostgreSQL integration
docs/                   # blueprint, API, security, readiness và runbook
.github/workflows/      # quality gate và PostgreSQL integration CI
```

## Triển khai đề xuất cho pilot

- Vercel project riêng cho staging và pilot, compute `sin1`.
- Neon project/branch riêng tại AWS Asia Pacific Singapore, cùng vùng với compute sau khi Data Owner phê duyệt residency.
- Auth0 tenant/application do doanh nghiệp sở hữu, Universal Login, MFA theo rủi ro và callback/logout/origin chính xác, không wildcard.
- Runtime DB role và migration DB role tách biệt; preview, staging và pilot dùng database, key và Auth0 application riêng.
- Migration chạy trước promotion bằng identity chuyên dụng; runtime không có DDL privilege.

Đây mới là topology khuyến nghị. Tài khoản, billing, DPA, IdP và backup production chưa được provision trong repository.

## Quyền riêng tư

- Chỉ sử dụng fixture do nhóm tự tạo; không nhập dữ liệu từ tài liệu thực tập hoặc hệ thống nội bộ.
- Không commit danh sách khách hàng, số giấy tờ, điện thoại, biển số, GPS, vé, hóa đơn, credential hay database dump thật.
- Schema dành cho PII được tách riêng với cột ciphertext/HMAC; KMS/envelope encryption và API PII chưa được triển khai, là gate trước khi xử lý dữ liệu thật.
- Audit, outbox, logs và dashboard projection không chứa contact/address/token/raw GPS.
- Ứng dụng không lưu PAN/CVV; payment thật phải dùng provider/tokenization và reconciliation.

## Tài liệu

- [Enterprise Blueprint 12–15 tháng](docs/ENTERPRISE_BLUEPRINT.md)
- [Kế hoạch pilot](docs/DEVELOPMENT_PLAN.md)
- [Ma trận RBAC](docs/RBAC_MATRIX.md)
- [Kiến trúc hiện tại và mục tiêu](docs/ARCHITECTURE.md)
- [API v1](docs/API_SPEC.md)
- [Chiến lược kiểm thử](docs/TEST_PLAN.md)
- [Production Readiness](docs/PRODUCTION_READINESS.md)
- [Pilot Runbook](docs/RUNBOOK_PILOT.md)
- [Bảo mật và threat model](docs/SECURITY.md)

## Quy trình đóng góp

1. Pull request phải có acceptance criteria, dữ liệu synthetic và hướng dẫn kiểm thử.
2. CI typecheck, lint, test, build, dependency audit và PostgreSQL integration phải đạt.
3. Thay đổi permission, migration, Auth0 hoặc workflow cần review độc lập.
4. Không merge khi có security finding critical/high, thiếu authorization negative test hoặc thiếu rollback plan.
5. Không sửa migration đã được áp dụng; dùng migration mới theo expand → migrate → contract.

## Giới hạn sử dụng

Dự án chưa được phê duyệt để thay thế hệ thống doanh nghiệp. Go-live chỉ được xem xét sau khi hoàn tất toàn bộ gate trong [Production Readiness](docs/PRODUCTION_READINESS.md), diễn tập [Pilot Runbook](docs/RUNBOOK_PILOT.md) và có chữ ký của Product, Operations, Security/Data, Legal và Platform owner.

# Đánh giá mức sẵn sàng production

## Kết luận hiện tại: NO-GO

KSOps **chưa production-ready và chưa được phép xử lý nghiệp vụ hoặc dữ liệu thật**. Bản Vercel công khai vẫn là `demo`: dùng fixture synthetic và trạng thái trình duyệt. Nhánh pilot của `/don-hang` đã nối API trong mã nhưng chưa có hạ tầng/tài khoản doanh nghiệp được provision.

Repository đã có một nền tảng production-shaped cho Auth0, PostgreSQL và cargo order, nhưng chưa có hạ tầng doanh nghiệp, kiểm soát vận hành và bằng chứng go-live. “Production-shaped” không đồng nghĩa “đã vận hành production”.

## Phạm vi đã có bằng chứng trong mã nguồn

| Hạng mục | Trạng thái | Bằng chứng/giới hạn |
|---|---|---|
| Cargo vertical slice | Đã triển khai | UI theo runtime mode; list/get/create/transition; permission/scope; transaction; idempotency; optimistic concurrency |
| PostgreSQL foundation | Đã triển khai | migration có checksum/advisory lock; organization/IAM/fleet/driver/cargo/dispatch/audit/outbox/reporting; RLS |
| Identity boundary | Đã triển khai trong mã | Auth0 session đã xác minh được ánh xạ tới principal/role/scope nội bộ; chưa có tenant/connection doanh nghiệp |
| Bằng chứng database | Đã có trong CI/local | integration test với PostgreSQL thật cho RLS, atomic write, replay/conflict và concurrent transition |
| Dispatch | Chỉ có schema | có GiST exclusion constraint chống chồng lịch; chưa có service/API/UI pilot |
| Outbox | Chỉ có transactional writer | chưa có publisher, retry, dead-letter handling hoặc cảnh báo backlog |
| Booking/contract/maintenance/CRM/finance/reporting | Demo/local | chưa có backend production tương ứng |
| Public deployment | Demo | không phải pilot; capability enterprise giữ `false`; API nghiệp vụ fail closed |

## Blocker bắt buộc trước pilot

Các mục dưới đây là hard blocker; không được bỏ qua bằng cách đổi `KSOPS_MODE`:

1. **Ownership và thương mại:** Vercel, Neon và Auth0 tenant do doanh nghiệp sở hữu; owner dự phòng, billing, quota và quy trình offboarding được phê duyệt.
2. **Pháp lý và dữ liệu:** DPA/subprocessor, data residency, data inventory, mục đích xử lý, retention/deletion và privacy notice được Legal/Data Owner phê duyệt.
3. **Danh tính doanh nghiệp:** kết nối IdP, MFA theo rủi ro, session/revoke policy, callback/logout/web-origin chính xác; có danh sách người dùng pilot đích danh.
4. **Phân quyền:** role/scope binding do nghiệp vụ phê duyệt; access review định kỳ; maker-checker cho thao tác nhạy cảm nếu đưa vào phạm vi.
5. **Khôi phục:** RPO/RTO được chấp thuận; backup/PITR thực sự được provision; restore drill trong môi trường cô lập có evidence.
6. **Quan sát và hỗ trợ:** structured logs/metrics/traces có redaction; SLO, alert, on-call, escalation và dashboard vận hành có owner.
7. **Security gate:** threat review, WAF/rate limit, dependency/secret scan, penetration test theo phạm vi và không còn finding critical/high.
8. **Tích hợp:** contract, sandbox, credential/certificate, idempotency và reconciliation cho GPS, payment, e-invoice, ERP, notification hoặc object storage nếu nằm trong pilot.
9. **Sản phẩm và vận hành:** UI cargo/API được kiểm chứng end-to-end trên hạ tầng pilot; UAT, accessibility, đào tạo, support, shadow mode/cutover, rollback rehearsal và sign-off liên phòng ban.
10. **Xử lý bất đồng bộ:** outbox publisher, bounded retry, dead-letter workflow, retention/cleanup và backlog alert được triển khai nếu có side effect bên ngoài.
11. **PII/key management:** data classification hoàn tất; KMS/envelope encryption, key version/rotation, private-schema privilege và redaction test được triển khai trước mọi PII thật.

## Topology pilot khuyến nghị

- Vercel project riêng cho `staging` và `pilot`, Functions đặt tại Singapore (`sin1`).
- Neon project/branch riêng tại AWS Asia Pacific Singapore sau khi Data Owner chấp thuận residency; preview không dùng chung dữ liệu hoặc credential với pilot.
- Auth0 tenant/application do doanh nghiệp sở hữu, dùng Universal Login; callback, logout URL và web origin là exact allowlist, không wildcard production.
- Secret chỉ nằm trong secret manager của đúng môi trường. Không copy database hoặc session secret giữa preview, staging và pilot.
- Migration chạy như release step được phê duyệt trước khi promote application; không chạy migration từ request handler.

Khuyến nghị đặt compute gần database dựa trên tài liệu [Vercel Regions](https://vercel.com/docs/regions). Neon công bố AWS Singapore trong [Regional availability](https://neon.com/docs/introduction/status). Cấu hình Auth0 phải theo [Application Settings](https://auth0.com/docs/get-started/applications/application-settings) và [Universal Login](https://auth0.com/docs/authenticate/login/auth0-universal-login/universal-login-vs-classic-login/universal-experience). Quyết định cuối cùng vẫn cần Data Owner, Security và Legal phê duyệt.

## Tách quyền database

| Identity | Mục đích | Quyền tối đa |
|---|---|---|
| Runtime role | `DATABASE_URL` | connect, usage và DML cần thiết; chịu RLS; không DDL, không bypass RLS, không ownership |
| Migration role | `MIGRATION_DATABASE_URL` | DDL/migration theo quy trình release; không dùng cho traffic ứng dụng |
| Integration-test role | `TEST_DATABASE_URL` | database test cô lập, được phép tạo/xóa dữ liệu synthetic trong phạm vi test |
| Human break-glass | sự cố được phê duyệt | time-bound, MFA, audit; không dùng hàng ngày |

Migration tạo schema/policy nhưng việc tạo database identity, cấp ownership và lưu credential phải do IaC hoặc platform runbook của doanh nghiệp thực hiện. Reviewed template `db/admin/grant_runtime_role.sql` được mô tả tại [db/admin](../db/admin/README.md); không cấp `BYPASSRLS` hoặc superuser cho runtime. Runtime `DATABASE_URL` tới host từ xa bắt buộc có `sslmode=verify-full`.

## Danh mục cấu hình

Chỉ nêu tên; giá trị phải nằm trong secret manager:

- Runtime/mode: `KSOPS_MODE`, `APP_BASE_URL`, `NEXT_PUBLIC_SITE_URL`, `VERCEL_PROJECT_PRODUCTION_URL`.
- Database: `DATABASE_URL`, `MIGRATION_DATABASE_URL`, `TEST_DATABASE_URL`, `PGOPTIONS`.
- Auth0: `AUTH0_DOMAIN`, `AUTH0_CLIENT_ID`, `AUTH0_CLIENT_SECRET`, `AUTH0_SECRET`.
- Tenant/HMAC: `KSOPS_ORGANIZATION_ID`, `KSOPS_IDEMPOTENCY_SECRET`, `KSOPS_IDENTITY_LOOKUP_SECRET`.

Khi `KSOPS_MODE` chọn pilot, hệ thống phải fail closed nếu thiếu cấu hình. Không ghi giá trị vào repository, log, screenshot, tài liệu UAT hoặc ticket.

## Go-live gate

| Gate | Owner phải chỉ định | Evidence tối thiểu | Hiện tại |
|---|---|---|---|
| Phạm vi và acceptance criteria | Product + Operations | pilot charter, excluded scope, success/abort criteria | Chờ |
| Tenant/billing/DPA/residency | Platform + Legal + Data Owner | account ownership, DPA, region decision | Chờ |
| IdP và named users | IAM + Operations | connection/MFA/session policy, user roster, revoke drill | Chờ |
| RBAC/scope | Process Owner + Security | approved matrix, allow/deny evidence, access review | Chờ |
| Hạ tầng và secret | Platform | IaC/change record, separation, rotation rehearsal | Chờ |
| Migration và compatibility | Engineering + DBA | status/checksum, N-1 compatibility, forward-fix plan | Một phần trong mã |
| Backup/PITR và DR | Platform + Data Owner | configured retention, isolated restore, measured RPO/RTO | Chờ |
| Security | Security | threat review, scan/pentest, zero critical/high | Chờ |
| Observability/on-call | SRE/Platform + Operations | SLO, dashboard, alert test, roster/escalation | Chờ |
| Cargo UAT | Cargo Operations | signed scripts trên staging, dữ liệu synthetic | Chờ |
| UI/API integration | Product + Engineering | `/don-hang` dùng API pilot, error/offline/accessibility evidence | Chờ |
| Outbox/external integrations | Integration Owner | contract, replay/reconciliation, DLQ/backlog drill | Chờ hoặc loại khỏi scope |
| Cutover/rollback | Release Manager | rehearsal theo runbook, immutable artifact SHA | Chờ |
| Final approval | Product, Operations, Security/Data, Legal, Platform | biên bản GO và named incident owner | Chờ |

Chỉ Release Manager được đổi quyết định từ `NO-GO` sang `GO` sau khi mọi gate trong phạm vi đều có owner và evidence; mục loại khỏi scope phải được ghi rõ, không đánh dấu đạt giả tạo.

## Tranche tiếp theo

1. Kiểm chứng UI cargo/API trên staging; hoàn thiện pagination/telemetry/rate limit và outbox worker.
2. Chạy staging provisioning, UAT, security và restore drill.
3. Sau khi cargo pilot ổn định mới mở dispatch service; giữ overlap constraint làm safety net.
4. Booking, maintenance, contract, finance và integration được phát triển thành các tranche riêng, có domain invariant và go-live gate riêng.

Runbook triển khai và xử lý sự cố nằm tại [RUNBOOK_PILOT.md](RUNBOOK_PILOT.md). Kiến trúc hiện tại nằm tại [ARCHITECTURE.md](ARCHITECTURE.md).

# Kiến trúc KSOps Transport Control

## 1. Trạng thái và nguyên tắc

- Đây là kiến trúc mục tiêu cho pilot, không mô tả hạ tầng doanh nghiệp hiện tại.
- Bản repository là frontend demo Next.js với fixture synthetic và localStorage.
- Không kết nối GPS, bán vé, thanh toán, kế toán, kho hàng hoặc danh tính thật.
- Không đưa biển số, số giấy tờ, vị trí GPS, PII, topology hay credential thật vào mã nguồn.

Kiến trúc mục tiêu là **modular monolith**: một deployable web/API để giảm chi phí vận hành nhưng có ranh giới domain rõ. Chỉ tách service khi có nhu cầu scale, availability, security boundary hoặc ownership độc lập được đo bằng bằng chứng.

## 2. System context

```mermaid
flowchart LR
    Passenger["Hành khách"]
    Sender["Khách gửi hàng"]
    Corporate["Khách thuê xe"]
    Dispatcher["Điều phối viên"]
    Driver["Tài xế"]
    Ops["Bảo dưỡng / Tài chính / Quản lý"]
    IdP["OIDC Identity Provider"]
    Payment["Payment provider qua token"]
    GPS["GPS/telemetry adapter"]
    Notify["SMS/email/app adapter"]
    Accounting["Kế toán/ERP adapter"]
    KSOps["KSOps Transport Control"]

    Passenger -->|"tìm chuyến, đặt/hủy vé"| KSOps
    Sender -->|"tạo và theo dõi đơn"| KSOps
    Corporate -->|"yêu cầu báo giá/hợp đồng"| KSOps
    Dispatcher -->|"lập chuyến, phân công"| KSOps
    Driver -->|"nhận chuyến, cập nhật mốc"| KSOps
    Ops -->|"bảo dưỡng, đối soát, báo cáo"| KSOps
    KSOps <-->|"SSO và claim tối thiểu"| IdP
    KSOps <-->|"payment intent/callback"| Payment
    GPS -->|"vị trí chuẩn hóa + freshness"| KSOps
    KSOps -->|"thông báo đã redact"| Notify
    KSOps -->|"bút toán/reference đã duyệt"| Accounting
```

Adapter bên ngoài mặc định là mock. Tích hợp thật cần data-flow review, least-privilege service account, allowlist egress, timeout, circuit breaker, reconciliation và cơ chế thu hồi quyền.

## 3. Container mục tiêu

```mermaid
flowchart TB
    Browser["Web/PWA"]
    Edge["CDN · WAF · TLS · rate limit"]
    Web["Next.js Web + API\nmodular monolith"]
    Worker["Background workers\nidempotent jobs"]
    DB[("Managed PostgreSQL\ntransactional source of truth")]
    Redis["Managed Redis\nseat hold, rate limit, short cache"]
    Queue["Queue / scheduler"]
    Object["Object storage\nattachment scanned"]
    IdP["OIDC provider"]
    Adapters["Payment · GPS · Notify · ERP adapters"]
    Obs["Logs · metrics · traces · alerts"]

    Browser -->|"HTTPS"| Edge --> Web
    Web <-->|"Authorization Code + PKCE"| IdP
    Web --> DB
    Web --> Redis
    Web -->|"transactional outbox"| Queue --> Worker
    Worker --> DB
    Worker --> Adapters
    Web -->|"signed URL"| Object
    Web --> Obs
    Worker --> Obs
```

Web/API chạy gần database; edge chỉ cache asset/read model an toàn. Preview/staging/production dùng project, database, key và adapter sandbox riêng. Không clone production PII về preview.

## 4. Module boundaries

| Module | Sở hữu | Không được làm |
|---|---|---|
| Identity & Access | user mapping, role, permission, scope, session | tin role/tenant gửi từ browser |
| Fleet | vehicle, type, capacity, document, status history | lưu credential thiết bị hoặc GPS thô không cần thiết |
| Driver & Workforce | qualification, availability, shift, assignment constraint | lưu bản chụp giấy tờ ngoài retention/purpose |
| Cargo Order | parcel, sender/receiver ref, pricing snapshot, SLA, status | tự quyết định dispatch hoặc sửa audit history |
| Trip & Dispatch | route, schedule, vehicle/driver assignment, manifest, capacity | bypass maintenance/qualification policy |
| Passenger Booking | inventory, seat hold, booking, cancel/refund state | lưu PAN/CVV hoặc bán ghế ngoài transaction |
| Contract Rental | lead, quote revision, approval, contract | thay giá đã chấp nhận mà không tạo revision |
| Maintenance | trigger, work order, checklist, downtime, part usage | tự xóa lịch sử xe |
| CRM | customer identity tối thiểu, consent/purpose, timeline | cung cấp PII ngoài scope role |
| Billing | invoice snapshot, receivable, payment reference, reconciliation | xử lý dữ liệu thẻ trực tiếp |
| Reporting | metric definition và read model | truy vấn OLTP không giới hạn |
| Notification | template, preference, delivery job | giữ DB transaction khi gọi dịch vụ ngoài |
| Audit | append-only security/business event | endpoint update/delete thông thường |

Module trao đổi qua application service và domain event/outbox; không import repository của module khác. Mọi authorization quyết định ở server/application boundary.

## 5. Cấu trúc mã

Bản demo:

```text
app/
  _components/          # shell và control dùng chung
  _hooks/               # local browser-state adapter
  <feature>/
    page.tsx             # metadata + server composition
    <Feature>Client.tsx  # state/event orchestration khi cần
    _components/         # presentation components
    _lib/                # type, fixture, decoder, pure helper
lib/                     # dashboard aggregate synthetic
tests/                   # helper, config và regression
```

Khi có backend:

```text
app/(authenticated)/
app/api/v1/              # parse → validate → authorize → invoke → map
modules/
  fleet/ driver/ order/ dispatch/ booking/ contract/
  maintenance/ crm/ billing/ reporting/ identity/ audit/
    domain/              # entity, value object, invariant
    application/         # use case, port, policy
    infrastructure/      # repository, outbox, adapter
lib/auth/ validation/ errors/ observability/
db/schema/ migrations/ seeds/
tests/unit/ integration/ contract/ e2e/
```

## 6. Mô hình dữ liệu logic

```mermaid
erDiagram
    VEHICLE_TYPE ||--o{ VEHICLE : classifies
    VEHICLE ||--o{ VEHICLE_DOCUMENT : has
    VEHICLE ||--o{ MAINTENANCE_ORDER : receives
    DRIVER ||--o{ DRIVER_QUALIFICATION : has
    DRIVER ||--o{ DRIVER_SHIFT : works
    ROUTE ||--o{ TRIP : schedules
    VEHICLE ||--o{ TRIP : assigned
    DRIVER ||--o{ TRIP : drives
    TRIP ||--o{ SEAT_INVENTORY : offers
    CUSTOMER ||--o{ BOOKING : creates
    BOOKING ||--|{ BOOKING_SEAT : reserves
    SEAT_INVENTORY ||--o| BOOKING_SEAT : allocated
    CUSTOMER ||--o{ CARGO_ORDER : requests
    CARGO_ORDER ||--|{ PARCEL : contains
    TRIP ||--o{ MANIFEST_ITEM : carries
    CARGO_ORDER ||--o{ MANIFEST_ITEM : loaded_as
    CUSTOMER ||--o{ RENTAL_REQUEST : submits
    RENTAL_REQUEST ||--o{ QUOTATION_REVISION : quoted
    QUOTATION_REVISION ||--o| CONTRACT : accepted_as
    BOOKING ||--o| INVOICE : billed
    CARGO_ORDER ||--o| INVOICE : billed
    CONTRACT ||--o{ INVOICE : billed
    USER ||--o{ AUDIT_EVENT : acts
```

Quy ước:

- UUIDv7/ULID server-side làm primary key; mã hiển thị là key riêng không chứa PII.
- Timestamp UTC; UI hiển thị timezone người dùng.
- Entity mutable có `version`; update cần optimistic concurrency.
- Tiền lưu integer minor unit + currency; giá/cước/thuế snapshot bất biến.
- PII tách khỏi event/log/read model rộng; field encryption theo threat model.
- Attachment nằm object storage, quét malware, MIME sniffing, signed URL ngắn hạn.
- Audit lưu actor/action/resource/outcome/requestId/time/diff đã redact; không lưu token/raw payload.

## 7. Luồng tạo đơn hàng hóa

```mermaid
sequenceDiagram
    actor U as Nhân viên tiếp nhận
    participant A as API
    participant P as Policy/Pricing
    participant D as PostgreSQL
    participant Q as Outbox
    participant W as Notification worker

    U->>A: POST /api/v1/cargo-orders + Idempotency-Key
    A->>A: validate, normalize, classify data
    A->>P: authorize + quote snapshot
    P-->>A: allow + price/version
    A->>D: transaction order + parcels + event + audit + outbox
    D-->>A: commit + version
    A-->>U: 201 + Location + requestId
    Q->>W: order.confirmed
    W->>W: redact + deliver + retry bounded
```

## 8. Luồng giữ và bán ghế

```mermaid
sequenceDiagram
    actor U as Hành khách
    participant A as Booking API
    participant R as Redis hold store
    participant D as Database
    participant P as Payment provider

    U->>A: POST /seat-holds + Idempotency-Key
    A->>R: atomic hold(seat, ttl, principal)
    R-->>A: holdId + expiresAt
    A-->>U: 201 hold
    U->>A: POST /bookings {holdId}
    A->>D: transaction validate hold + booking pending + outbox
    A->>P: create payment intent (outside DB transaction)
    P-->>A: token/reference
    P-->>A: signed callback
    A->>D: idempotent finalize booking + invoice + audit
```

Unique constraint trên `(trip_id, seat_code)` cho state booked và transaction/lock phù hợp là lớp cuối chống double-booking; UI disable ghế không phải cơ chế bảo vệ.

## 9. Dispatch consistency

- Assignment kiểm tra overlap xe/tài xế bằng transaction và constraint/exclusion phù hợp.
- `version` + `If-Match` cho thay đổi chuyến; bản cũ trả `412`.
- Capacity tính từ manifest/booking active trong cùng transaction.
- Xe bảo dưỡng/blocked/document-expired hoặc tài xế không qualification bị policy từ chối.
- Manual override yêu cầu permission riêng, reason, expiry và audit; không cho override safety invariant cứng.
- Mốc GPS/scan xử lý at-least-once, có event key idempotent và device timestamp sanity check.

## 10. API và async work

- REST JSON `/api/v1`, cursor pagination, sort ổn định `(created_at,id)`.
- Runtime schema validation; TypeScript không thay thế validation boundary.
- `Idempotency-Key` cho create/payment callback; scope theo principal+route, có TTL.
- Error envelope ổn định, không trả stack/SQL/PII.
- Transaction ngắn; không gọi payment/SMS/GPS/ERP khi đang giữ DB transaction.
- Transactional outbox bảo đảm entity và event cùng commit; consumer idempotent, retry exponential+jitter, DLQ và replay có permission/audit.

## 11. Availability, performance và overload

Mục tiêu pilot: availability 99,5%/tháng; API read p95 <500ms; write p95 <800ms; valid error <1%/5 phút; dashboard LCP p75 <2,5s trên profile thống nhất; RPO 24h/RTO 4h được restore drill xác nhận.

Giới hạn bắt buộc: body/page/file/query complexity; rate limit principal/IP trusted; DB pool/timeout; external adapter timeout+circuit breaker; stale indicator cho GPS; queue max attempts/DLQ; report chạy read model/batch thay vì OLTP path.

## 12. Observability

Log JSON gồm timestamp, level, service/environment, route template, status, latency, requestId, traceId và actor pseudonymous. Không log cookie/token, CCCD/bằng lái, số điện thoại đầy đủ, raw location, comment/attachment hoặc payment payload.

Golden signals và business signals:

- traffic, latency p50/p95/p99, error, saturation, DB pool, queue depth;
- order backlog, delivery SLA, booking conflict, hold expiry, trip delay;
- fleet utilization, maintenance overdue, driver/vehicle conflict;
- payment callback/reconciliation mismatch, export volume, permission change;
- adapter freshness/error và alert có owner+runbook.

## 13. CI/CD và data migration

```mermaid
flowchart LR
    PR["Pull request"] --> CI["type · lint · test · build · audit"]
    CI --> Review["review · branch protection"]
    Review --> Artifact["immutable artifact · SBOM"]
    Artifact --> Staging["staging · migration preflight · smoke"]
    Staging --> Approval["change approval"]
    Approval --> Prod["canary/promote same digest"]
    Prod --> Verify["SLO · business reconciliation · audit"]
    Verify -->|"fail"| Recovery["rollback / forward-fix"]
```

Migration dùng expand→migrate→contract, advisory lock và backup/preflight. Không destructive migration tự động. Build provenance, dependency scan, least-privilege GitHub Actions và OIDC federation khi nền tảng hỗ trợ.

## 14. ADR cần chốt

| ADR | Quyết định | Hạn |
|---|---|---|
| ADR-001 | modular monolith và boundaries | tuần 2 |
| ADR-002 | hosting/runtime/region/data residency | tuần 2 |
| ADR-003 | PostgreSQL, pooling, backup | tuần 3 |
| ADR-004 | OIDC/session/claim mapping | tuần 3 |
| ADR-005 | permission + data scope | tuần 3 |
| ADR-006 | seat hold/booking concurrency | trước tuần 7 |
| ADR-007 | attachment scanning/retention | trước tuần 8 |
| ADR-008 | payment/ERP/GPS adapter contracts | trước tuần 8 |
| ADR-009 | observability/redaction vendor | trước tuần 9 |
| ADR-010 | migration/promotion/rollback | trước tuần 10 |

## 15. Tiến hóa

Chỉ tách service khi có ownership, tải/availability, scaling hoặc security boundary rõ. Khi tách phải version contract, consumer test, idempotency, trace, replay và migration plan. Không biến dashboard thành cơ chế tự động điều khiển xe; automation có tác động cần approval, dry-run, audit và kill switch.

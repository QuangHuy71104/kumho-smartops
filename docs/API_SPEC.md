# KSOps API v1

## 1. Trạng thái contract

Base path: `/api/v1`. Contract hiện hành chỉ gồm health, capability, identity/reference data và cargo order.

- Bản Vercel công khai chạy `demo`: health hoạt động; capability enterprise giữ `false`; API `/me`, `/reference-data` và `/cargo-orders` fail closed với `503 PILOT_NOT_CONFIGURED`.
- Ở `pilot`, Auth0 session đã xác minh được ánh xạ tới principal, permission và scope nội bộ trước khi gọi PostgreSQL.
- Route `/don-hang` chọn workspace pilot đã nối API khi runtime chọn pilot; deployment công khai hiện chọn workspace demo và chưa có hạ tầng pilot được provision.
- API dispatch, booking, contract, maintenance, CRM, finance, reporting và integration **chưa triển khai**.

JSON dùng UTF-8; timestamp là ISO-8601 có offset; tiền là integer minor unit + mã ISO 4217; identifier nghiệp vụ là UUID và response public không chứa tenant/actor internals.

## 2. Trust boundary và header

API browser dùng Auth0 session cookie do SDK xác minh; không nhận role, permission, organization hoặc branch scope do client tự khai. Principal phải active và có binding nội bộ còn hiệu lực.

| Header | Contract |
|---|---|
| `Cookie` | Auth0 session ở pilot; response nghiệp vụ đặt `Vary: Cookie` và `Cache-Control: no-store` |
| `Origin` | bắt buộc cho mutation và phải trùng origin chuẩn hóa từ `APP_BASE_URL` |
| `Content-Type` | mutation chỉ nhận `application/json`; body tối đa 64 KiB |
| `Idempotency-Key` | bắt buộc cho create/transition; 16–200 ký tự thuộc `[A-Za-z0-9._:-]` |
| `If-Match` | bắt buộc cho transition, đúng dạng `"cargo-order-vN"` |
| `X-Request-Id` | client ID chỉ được giữ nếu khớp allowlist; server luôn trả ID trusted |

Raw idempotency key không lưu trong database. Server HMAC key và fingerprint canonical request trong scope principal + operation. Cùng key/cùng request replay kết quả; cùng key/khác request trả `409 IDEMPOTENCY_CONFLICT`. Record hiện hết hạn sau 24 giờ; lần claim sau expiry thu hồi record cũ atomically và không replay resource stale.

Response cargo trả `ETag: "cargo-order-vN"`. Optimistic update so sánh version trong câu lệnh ghi; thiếu `If-Match` trả `428`, version cũ trả `412`.

## 3. Endpoint hiện hành

| Method | Path | Auth/permission | Trạng thái |
|---|---|---|---|
| `GET` | `/health/live` | public | đã triển khai |
| `GET` | `/health/ready` | public | đã triển khai |
| `GET` | `/system/capabilities` | public | đã triển khai, snapshot bảo thủ |
| `GET` | `/me` | session + internal principal | đã triển khai cho pilot |
| `GET` | `/reference-data` | `cargo-order:read` + scope của permission | đã triển khai cho pilot |
| `GET` | `/cargo-orders` | `cargo-order:read` + scope của permission | đã triển khai cho pilot |
| `GET` | `/cargo-orders/{id}` | `cargo-order:read` + object scope | đã triển khai cho pilot |
| `POST` | `/cargo-orders` | `cargo-order:create` + branch scope của permission | đã triển khai cho pilot |
| `POST` | `/cargo-orders/{id}/transitions` | luôn cần `cargo-order:transition`; từ exception cần thêm `cargo-order:resolve-exception`; cả hai scope phải bao phủ branch | đã triển khai cho pilot |

Authorization theo từng permission; một role không liên quan có scope rộng hơn không được mở rộng scope của cargo permission.

## 4. Health, capability và identity

### `GET /health/live`

Chỉ chứng minh process đang trả request; không chứng minh database hoặc Auth0 sẵn sàng.

```json
{
  "status": "ok",
  "service": "ksops-web",
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

### `GET /health/ready`

Demo trả:

```json
{
  "status": "ready",
  "mode": "demo",
  "durablePersistence": false,
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

Pilot chạy read-only transaction bằng runtime identity để xác minh đúng tập migration/checksum đã review, schema/table grants cần thiết, tenant GUC và read qua RLS trên IAM/cargo. Bất kỳ bước nào lỗi đều trả `503 READINESS_FAILED`. Check này chưa thay thế synthetic mutation, Auth0 end-to-end hoặc outbox publisher smoke.

### `GET /system/capabilities`

```json
{
  "mode": "demo",
  "durablePersistence": false,
  "enterpriseIdentity": false,
  "mutationApi": false,
  "requestId": "00000000-0000-4000-8000-000000000001"
}
```

Các cờ hiện cố ý giữ `false` cho đến khi môi trường được provision và xác minh; không dùng endpoint này để tự động mở traffic pilot.

### `GET /me`

Trả principal phía server, permission và scope đã ánh xạ từ directory nội bộ; không phản chiếu role claim của browser/token.

```json
{
  "data": {
    "id": "10000000-0000-7000-8000-000000000001",
    "organizationId": "20000000-0000-7000-8000-000000000001",
    "permissionScopes": {
      "cargo-order:read": ["30000000-0000-7000-8000-000000000001"]
    },
    "permissions": ["cargo-order:read"],
    "authenticationMethod": "oidc"
  },
  "meta": { "requestId": "00000000-0000-4000-8000-000000000001" }
}
```

`permissionScopes` có giá trị `"*"` cho organization scope hoặc mảng branch UUID cho scope hẹp. Client có thể dùng nó để ẩn/hiện UX, nhưng server vẫn là nơi ra quyết định authorization cuối cùng.

### `GET /reference-data`

Trả chi nhánh và địa điểm active được phép dùng cho cargo, không trả PII:

```json
{
  "data": {
    "branches": [
      {
        "id": "30000000-0000-7000-8000-000000000001",
        "code": "BR-SYN-01",
        "name": "Chi nhánh synthetic 01",
        "kind": "branch",
        "timezone": "Asia/Ho_Chi_Minh"
      }
    ],
    "locations": [
      {
        "id": "40000000-0000-7000-8000-000000000001",
        "branchId": "30000000-0000-7000-8000-000000000001",
        "publicCode": "LOC-SYN-01",
        "kind": "warehouse",
        "displayName": "Kho synthetic 01"
      }
    ]
  },
  "meta": {
    "branchCount": 1,
    "locationCount": 1,
    "requestId": "00000000-0000-4000-8000-000000000001"
  }
}
```

## 5. Cargo order representation

```json
{
  "id": "50000000-0000-7000-8000-000000000001",
  "publicCode": "CG-SYN-000001",
  "owningBranchId": "30000000-0000-7000-8000-000000000001",
  "serviceLevel": "same_day",
  "status": "draft",
  "originLocationId": "40000000-0000-7000-8000-000000000001",
  "destinationLocationId": "40000000-0000-7000-8000-000000000002",
  "packageCount": 3,
  "totalWeightGrams": 12500,
  "declaredValueMinor": 24000000,
  "currency": "VND",
  "slaDueAt": "2026-08-22T10:00:00.000+07:00",
  "version": 1,
  "createdAt": "2026-08-21T08:00:00.000Z",
  "updatedAt": "2026-08-21T08:00:00.000Z"
}
```

Service levels: `standard`, `same_day`, `express`, `full_trip`.

Statuses: `draft`, `quoted`, `confirmed`, `received`, `loaded`, `in_transit`, `arrived`, `delivered`, `reconciled`, `exception`, `cancelled`.

## 6. List và get cargo

### `GET /cargo-orders`

Query allowlist:

- `status` lặp lại tối đa 20 lần, mỗi giá trị thuộc enum trên;
- `limit` là integer `1..100`, mặc định `50`;
- mọi query key khác, kể cả `organizationId`, bị từ chối `400`.

Ví dụ: `GET /api/v1/cargo-orders?status=draft&status=confirmed&limit=25`.

```json
{
  "data": [{ "id": "50000000-0000-7000-8000-000000000001", "publicCode": "CG-SYN-000001", "version": 1 }],
  "meta": {
    "count": 1,
    "requestId": "00000000-0000-4000-8000-000000000001"
  }
}
```

Đoạn JSON được rút gọn; mỗi phần tử thực tế có representation đầy đủ ở mục 5. Phiên bản hiện tại **chưa có cursor pagination**; không dùng list này cho export hoặc dataset lớn.

### `GET /cargo-orders/{id}`

`id` phải là UUID. Trả `{ data, meta }` và `ETag`. Caller không có object scope nhận response không làm lộ resource ngoài phạm vi.

## 7. Tạo cargo order

### `POST /cargo-orders`

Header bắt buộc: Auth0 session, `Origin`, `Content-Type: application/json`, `Idempotency-Key`.

Body là strict object; field ngoài allowlist bị từ chối:

```json
{
  "owningBranchId": "30000000-0000-7000-8000-000000000001",
  "serviceLevel": "same_day",
  "originLocationId": "40000000-0000-7000-8000-000000000001",
  "destinationLocationId": "40000000-0000-7000-8000-000000000002",
  "packageCount": 3,
  "totalWeightGrams": 12500,
  "declaredValueMinor": 24000000,
  "currency": "VND",
  "slaDueAt": "2026-08-22T10:00:00.000+07:00"
}
```

Ràng buộc:

- các ID là UUID; branch phải nằm trong scope của `cargo-order:create`;
- điểm đi và điểm đến khác nhau;
- `packageCount` từ 1 đến 10.000;
- `totalWeightGrams` từ 1 đến 100.000.000;
- `declaredValueMinor` optional/null hoặc safe integer không âm;
- `currency` đúng ba chữ hoa, mặc định `VND`;
- `slaDueAt` có offset và phải sau thời điểm tạo.

Success trả `201`, aggregate ở status `draft`, version `1`, cùng `Location`, `ETag`, `Idempotency-Replayed` và `X-Request-Id`. Order, cargo event, audit, outbox và idempotency result commit trong một transaction.

## 8. Chuyển trạng thái

### `POST /cargo-orders/{id}/transitions`

Header bắt buộc: Auth0 session, `Origin`, JSON, `Idempotency-Key`, `If-Match: "cargo-order-vN"`.

```json
{
  "toStatus": "confirmed",
  "reasonCode": "CUSTOMER_CONFIRMED"
}
```

`reasonCode` dài 3–60, bắt đầu bằng chữ hoa và chỉ có chữ hoa, số, `_`, `:`, `-`. Server tạo authoritative timestamp/actor. Transition hợp lệ:

| Từ | Đến |
|---|---|
| `draft` | `quoted`, `confirmed`, `cancelled` |
| `quoted` | `confirmed`, `cancelled` |
| `confirmed` | `received`, `exception`, `cancelled` |
| `received` | `loaded`, `exception`, `cancelled` |
| `loaded` | `in_transit`, `exception` |
| `in_transit` | `arrived`, `exception` |
| `arrived` | `delivered`, `exception` |
| `delivered` | `reconciled`, `exception` |
| `exception` | `confirmed`, `received`, `loaded`, `in_transit`, `arrived`, `delivered`, `cancelled` |
| `reconciled`, `cancelled` | không có transition |

Mọi transition đều yêu cầu `cargo-order:transition` và scope của permission này phải bao phủ branch sở hữu đơn. Nếu trạng thái hiện tại là `exception`, caller còn phải có `cargo-order:resolve-exception` với scope cũng bao phủ branch đó; permission bổ sung không thay thế permission transition. Success trả `200`, version tăng một, `ETag`, `Idempotency-Replayed` và envelope cargo.

## 9. Problem response

Lỗi dùng `application/problem+json`, `Cache-Control: no-store`, `X-Content-Type-Options: nosniff` và `X-Request-Id`:

```json
{
  "type": "urn:ksops:problem:version-mismatch",
  "title": "Phiên bản dữ liệu đã thay đổi",
  "status": 412,
  "code": "VERSION_MISMATCH",
  "detail": "Đơn hàng đã được cập nhật bởi một yêu cầu khác.",
  "requestId": "00000000-0000-4000-8000-000000000001",
  "errors": [
    { "field": "packageCount", "code": "INVALID" }
  ]
}
```

`detail`/`errors` chỉ xuất hiện khi phù hợp. Không trả stack, SQL, secret, PII hoặc existence detail ngoài scope.

| Status | Code điển hình |
|---|---|
| `400` | `BAD_REQUEST` |
| `401` | `AUTHENTICATION_REQUIRED` |
| `403` | `FORBIDDEN` |
| `404` | `NOT_FOUND` |
| `409` | `IDEMPOTENCY_CONFLICT` |
| `412` | `VERSION_MISMATCH` |
| `422` | `INVALID_TRANSITION`, `VALIDATION_FAILED` |
| `428` | `PRECONDITION_REQUIRED` |
| `500` | `INTERNAL_ERROR` |
| `503` | `DATABASE_UNAVAILABLE`, `PILOT_NOT_CONFIGURED`, `READINESS_FAILED` |

`429` đã có title chuẩn trong problem helper nhưng rate limiter production chưa được triển khai; không coi đó là năng lực hiện tại.

## 10. Consistency, audit và privacy

- Tenant context được set trong transaction; RLS là backstop, application service vẫn kiểm tra permission-specific scope và object scope.
- Create/transition ghi aggregate + immutable event + append-only audit + outbox atomically.
- Public presenter loại `organizationId`, `createdBy`, Auth0 subject và contact/address.
- PII mục tiêu nằm ở private schema dạng ciphertext/HMAC; API hiện không expose read/write PII.
- Outbox publisher/retry/DLQ chưa có; chưa hứa side effect asynchronous.
- Record cùng idempotency key đã hết hạn được thu hồi atomically khi key được dùng lại; scheduled retention cleanup cho row hết hạn còn lại, rate limit, cursor pagination và telemetry/SLO vẫn là gate trước pilot.

## 11. Resource tương lai — chưa triển khai

Các path `/vehicles`, `/drivers`, `/trips`, `/assignments`, `/bookings`, `/seat-holds`, `/rental-requests`, `/contracts`, `/maintenance-orders`, `/invoices`, `/payments`, `/reports`, `/exports` và `/audit-events` chỉ là roadmap. Không tạo client hoặc integration dựa trên chúng cho đến khi có route, authorization/concurrency test và versioned contract.

Thứ tự dự kiến: hoàn thiện cargo UI/operability → dispatch application/API → booking/maintenance/contract/finance theo tranche độc lập. Xem [Production Readiness](PRODUCTION_READINESS.md).

## 12. Compatibility

- Breaking change cần version mới hoặc compatibility window được phê duyệt.
- Field mới phải optional; client xử lý enum chưa biết theo hướng an toàn.
- Không drop/rename schema trong cùng release với client migration; dùng expand → migrate → contract.
- Contract test phải khóa body/header/error và permission-specific scope trước khi mở pilot traffic.

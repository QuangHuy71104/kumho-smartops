# KSOps API v1 — đặc tả mục tiêu

## 1. Trạng thái

API này là contract đề xuất cho pilot; repository demo hiện không chạy backend. Base path: `/api/v1`. JSON UTF-8, timestamp ISO-8601 UTC, tiền là integer minor unit + ISO currency, ID nội bộ UUIDv7/ULID và public code riêng.

## 2. Quy ước HTTP

- `Authorization: Bearer <access token>`; authorization server-side theo permission và data scope.
- `Idempotency-Key` bắt buộc cho create order/booking/invoice/payment/refund có retry.
- `If-Match: "<version>"` bắt buộc cho update mutable resource.
- `X-Request-Id` đầu vào chỉ nhận nếu hợp lệ; server luôn trả request ID trusted.
- Cursor pagination: `?limit=50&after=<opaque>&sort=-createdAt`; limit tối đa cấu hình.
- Filter allowlist, không cho client gửi SQL/expression tùy ý.
- `application/problem+json` cho lỗi.

Status chính: `200`, `201`, `202`, `204`, `400`, `401`, `403`, `404`, `409`, `412`, `422`, `429`, `503`.

```json
{
  "type": "https://errors.example.invalid/dispatch-conflict",
  "title": "Không thể phân công chuyến",
  "status": 409,
  "code": "DISPATCH_CONFLICT",
  "detail": "Xe hoặc tài xế đã có lịch chồng lấn.",
  "requestId": "req_demo_01",
  "errors": [{ "field": "driverId", "code": "OVERLAP" }]
}
```

Không trả stack trace, SQL, policy internals, PII của resource khác hoặc existence detail khi caller không có quyền.

## 3. Resource map

| Domain | Endpoint chính |
|---|---|
| Fleet | `/vehicle-types`, `/vehicles`, `/vehicles/{id}/documents`, `/vehicles/{id}/history` |
| Driver | `/drivers`, `/drivers/{id}/qualifications`, `/driver-shifts` |
| Cargo | `/cargo-orders`, `/cargo-orders/{id}/events`, `/cargo-orders/{id}/proof-of-delivery` |
| Dispatch | `/routes`, `/trips`, `/trips/{id}/assignments`, `/trips/{id}/manifest` |
| Passenger | `/trip-search`, `/seat-holds`, `/bookings`, `/bookings/{id}/cancel` |
| Contract | `/rental-requests`, `/quotations`, `/contracts` |
| Maintenance | `/maintenance-orders`, `/maintenance-schedules`, `/parts` |
| CRM | `/customers`, `/customers/{id}/timeline`, `/complaints` |
| Billing | `/invoices`, `/payments`, `/refunds`, `/reconciliation-runs` |
| Reporting | `/reports/operations`, `/reports/finance`, `/exports` |
| Identity/Audit | `/me`, `/roles`, `/permissions`, `/audit-events` |

## 4. Fleet

### `POST /vehicles`

Permission `vehicle:create`; idempotent.

```json
{
  "displayCode": "VEH-DEMO-0048",
  "vehicleTypeId": "vtype_01",
  "registrationRef": "encrypted-or-tokenized-reference",
  "seatCapacity": 45,
  "cargoCapacityKg": 1200,
  "status": "available",
  "homeDepotId": "depot_demo_01"
}
```

Server kiểm tra public code, type/capacity, trạng thái và reference uniqueness. Response `201` có `Location`, `version`, timestamps.

### `PATCH /vehicles/{id}`

`If-Match` bắt buộc. Cho phép trường allowlist. Status transition theo policy; không cho `maintenance → available` nếu work order chưa sign-off.

### `GET /vehicles?status=available&type=coach&availableFrom=...&availableTo=...`

Kết quả availability phải tính trip overlap, maintenance downtime, document policy và lock; không chỉ đọc cột status.

## 5. Driver và ca

### `POST /driver-shifts`

```json
{
  "driverId": "drv_01",
  "startsAt": "2026-08-22T00:00:00Z",
  "endsAt": "2026-08-22T08:00:00Z",
  "baseLocationId": "depot_demo_01"
}
```

Validation: `endsAt > startsAt`, max duration/rest policy, no overlap, qualification/document validity. PII hồ sơ tài xế không nằm trong response danh sách mặc định.

## 6. Cargo order

### `POST /cargo-orders`

Permission `cargo-order:create`; `Idempotency-Key` bắt buộc.

```json
{
  "customerId": "cus_demo_12",
  "senderContactRef": "contact_token_sender",
  "receiverContactRef": "contact_token_receiver",
  "originLocationId": "loc_demo_origin",
  "destinationLocationId": "loc_demo_destination",
  "serviceLevel": "same-day",
  "paymentMethod": "prepaid",
  "declaredValue": { "amount": 240000000, "currency": "VND" },
  "parcels": [
    {
      "category": "consumer-goods",
      "quantity": 2,
      "weightGrams": 12500,
      "dimensionsMm": { "length": 500, "width": 350, "height": 300 },
      "fragile": false
    }
  ],
  "prohibitedItemAcknowledged": true
}
```

Response chứa `pricingSnapshot`, volumetric weight, SLA, public code và status `draft|quoted|confirmed`. Không echo contact plaintext nếu caller thiếu `cargo-order:read-pii`.

### `POST /cargo-orders/{id}/transitions`

```json
{ "to": "loaded", "reasonCode": "MANIFEST_CONFIRMED", "occurredAt": "2026-08-21T10:20:00Z" }
```

Server quyết định allowed transition, actor, authoritative timestamp và trip/manifest condition. Event history immutable.

### `POST /cargo-orders/{id}/proof-of-delivery`

Hai bước: xin signed upload → scan/quarantine → commit metadata. Không nhận raw file trong JSON. POD reveal có permission và retention.

## 7. Trip và dispatch

### `POST /trips`

```json
{
  "routeId": "route_demo_01",
  "serviceType": "cargo",
  "plannedDepartureAt": "2026-08-22T01:00:00Z",
  "plannedArrivalAt": "2026-08-22T09:00:00Z",
  "vehicleId": "veh_48",
  "primaryDriverId": "drv_17"
}
```

Transaction kiểm tra vehicle/driver overlap, availability, qualification, maintenance/documents và capacity. Conflict trả `409 DISPATCH_CONFLICT` kèm field/retryable detail không lộ lịch ngoài scope.

### `PATCH /trips/{id}/assignments`

`If-Match` bắt buộc. Override mềm:

```json
{ "vehicleId": "veh_42", "override": { "reasonCode": "MANAGER_APPROVED_SWAP", "expiresAt": "..." } }
```

Server yêu cầu `trip:override`; hard safety constraint không override được.

### `POST /trips/{id}/manifest-items`

Idempotent theo order/booking+trip. Capacity/seat inventory update cùng transaction; load/unload/check-in tạo audit.

## 8. Passenger booking

### `GET /trip-search?origin=...&destination=...&date=2026-08-22&passengers=2`

Chỉ trả inventory aggregate và ghế/giá khả dụng theo scope công khai, không trả hành khách khác.

### `POST /seat-holds`

```json
{ "tripId": "trip_demo_01", "seatCodes": ["A01", "A02"] }
```

Atomic hold trong store có TTL. Response:

```json
{ "holdId": "hold_demo_01", "expiresAt": "2026-08-21T11:10:00Z", "priceSnapshot": { "amount": 76000000, "currency": "VND" } }
```

### `POST /bookings`

```json
{
  "holdId": "hold_demo_01",
  "customerId": "cus_demo_09",
  "passengers": [{ "seatCode": "A01", "displayName": "Hành khách 1" }],
  "paymentMethod": "provider-token"
}
```

Transaction xác nhận hold/pricing/seat; booking ban đầu `payment_pending`. Payment callback signed/idempotent chuyển `confirmed`; unique constraint chống double sale.

### `POST /bookings/{id}/cancel`

Snapshot policy quyết định fee/refund. High-value/manual refund dùng maker-checker.

## 9. Rental request, quote và contract

### `POST /rental-requests`

```json
{
  "customerId": "cus_demo_22",
  "purpose": "employee-shuttle",
  "pickupLocationId": "loc_demo_a",
  "destinationLocationId": "loc_demo_b",
  "startsAt": "2026-09-01T00:00:00Z",
  "endsAt": "2026-09-30T12:00:00Z",
  "passengerCount": 40,
  "vehicleNeeds": [{ "type": "coach-45", "quantity": 1 }]
}
```

### `POST /quotations`

Tạo revision bất biến với line items/tax/validity/terms snapshot. `POST /quotations/{id}/approve` theo threshold. Accept tạo contract; không update revision đã gửi.

## 10. Maintenance

### `POST /maintenance-orders`

Trigger `scheduled|odometer|inspection|defect`. Khi open/in-progress, downtime cập nhật availability. Checklist definition versioned; result có actor/time/evidence metadata. Close yêu cầu sign-off và điều kiện an toàn.

### `POST /vehicles/{id}/odometer-readings`

Idempotent theo source/event ID; kiểm tra timestamp, monotonic/anomaly. Odometer không giảm nếu không có correction permission+audit.

## 11. Billing và payment

### `POST /invoices`

Invoice lines snapshot từ order/booking/contract; tổng tiền server tính. Issued invoice không sửa line trực tiếp, dùng credit/debit adjustment.

### `POST /payment-webhooks/{provider}`

Không dùng bearer user token. Xác minh provider signature, timestamp, event ID, amount/currency/reference; log redact; xử lý idempotent; luôn đối soát asynchronous.

### `POST /refunds`

Permission, limit, maker-checker và idempotency. Response có trạng thái `requested|approved|processing|succeeded|failed`, không giả định synchronous.

## 12. Reporting và export

`GET /reports/operations?from=...&to=...&timezone=Asia/Ho_Chi_Minh` trả metric cùng `definitionVersion`, `generatedAt`, `freshness` và filter đã chuẩn hóa.

Bulk export dùng `POST /exports` → `202`; job giới hạn cột/scope/time range, tạo file CSV đã chống formula injection, mã hóa, signed URL ngắn hạn, retention ngắn và audit download.

## 13. Audit

`GET /audit-events` chỉ cho auditor/admin scope. Cursor pagination, filter allowlist. Không có endpoint update/delete. Export audit là audit event mới.

Event mẫu:

```json
{
  "id": "aud_demo_01",
  "occurredAt": "2026-08-21T10:20:00Z",
  "actorId": "usr_pseudo_17",
  "action": "trip.assignment.changed",
  "resource": { "type": "trip", "id": "trip_demo_01" },
  "outcome": "success",
  "requestId": "req_demo_01",
  "changes": [{ "field": "vehicleId", "from": "veh_pseudo_40", "to": "veh_pseudo_42" }]
}
```

## 14. Compatibility và deprecation

- Breaking change tạo API version mới hoặc compatibility window đã công bố.
- Field mới optional; enum mở rộng cần client xử lý unknown an toàn.
- Deprecation có header/tài liệu/telemetry và sunset date.
- Consumer contract tests cho payment/GPS/ERP/notification adapter.
- Không xóa field/schema trong cùng release với client migration; dùng expand→migrate→contract.

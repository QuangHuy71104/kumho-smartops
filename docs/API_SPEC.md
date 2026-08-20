# Đặc tả API KSOps v1 (đề xuất)

## 1. Trạng thái và quy ước

API dưới đây là contract mục tiêu cho giai đoạn pilot, **chưa được triển khai đầy đủ trong bản demo**. Khi bắt đầu backend, OpenAPI 3.1 phải trở thành nguồn chuẩn và được kiểm tra breaking change trong CI.

- Base path: `/api/v1`
- Giao thức: HTTPS; JSON UTF-8
- Media type: `application/json`
- Timestamp: RFC 3339 UTC, ví dụ `2026-08-21T03:15:00Z`
- ID: UUID/ULID opaque; client không suy luận thông tin từ ID
- Mã hiển thị: synthetic trong demo, ví dụ `INC-DEMO-0001`
- Field name: `camelCase`; enum là `snake_case`
- Không truyền secret, IP, hostname, MAC, VLAN hoặc dữ liệu nội bộ thật trong fixture/example.

## 2. Authentication, authorization và header

Ứng dụng browser ưu tiên session `HttpOnly` same-origin. Machine integration dùng OAuth2 access token có audience/scope hẹp khi được phê duyệt. API không chấp nhận role/scope do client tự khai.

### Request header

| Header | Bắt buộc | Mục đích |
|---|---:|---|
| `Accept: application/json` | nên có | content negotiation |
| `Content-Type: application/json` | với body JSON | kiểu payload |
| `X-Request-ID` | tùy chọn | correlation ID hợp lệ; server có thể thay thế |
| `Idempotency-Key` | create/action có retry | ngăn xử lý lặp; UUID ngẫu nhiên |
| `If-Match` | update mutable resource | optimistic concurrency bằng ETag/version |
| `X-CSRF-Token` | write dùng cookie session | chống CSRF |

### Response header

| Header | Ý nghĩa |
|---|---|
| `X-Request-ID` | ID dùng khi hỗ trợ/tra log |
| `ETag` | version của resource, ví dụ `"7"` |
| `Location` | URI resource vừa tạo |
| `Retry-After` | thời gian retry với `429`/`503` khi xác định được |

Authorization chạy ở object/action/scope level. Record ngoài scope trả `404` khi cần tránh existence oracle; `403` dành cho tài nguyên đã công khai sự tồn tại nhưng caller thiếu hành động.

## 3. Response chuẩn

### Một resource

```json
{
  "data": {
    "id": "01KSO...DEMO",
    "displayId": "INC-DEMO-0001",
    "version": 3
  },
  "meta": {
    "requestId": "req_demo_01"
  }
}
```

### Danh sách phân trang cursor

```json
{
  "data": [],
  "page": {
    "nextCursor": null,
    "hasMore": false,
    "limit": 25
  },
  "meta": {
    "requestId": "req_demo_02"
  }
}
```

Quy ước query:

- `limit`: mặc định 25, tối đa 100;
- `cursor`: opaque, không sửa/giải mã phía client;
- `sort`: allowlist, ví dụ `-createdAt,displayId` (`-` là giảm dần);
- filter rõ tên, ví dụ `status=open&priority=high`; không hỗ trợ SQL-like expression tùy ý;
- date range có giới hạn; tìm kiếm `q` được normalize và giới hạn độ dài.

### Error envelope

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dữ liệu gửi lên chưa hợp lệ.",
    "details": [
      {
        "field": "priority",
        "code": "invalid_enum",
        "message": "Giá trị không được hỗ trợ."
      }
    ]
  },
  "meta": {
    "requestId": "req_demo_03"
  }
}
```

Client message không chứa stack, SQL, path, secret hoặc chi tiết object ngoài quyền. `details` chỉ trả field caller đã gửi/được phép biết.

### Status và error code

| HTTP | Code điển hình | Khi dùng |
|---:|---|---|
| 200 | — | đọc/cập nhật/action thành công |
| 201 | — | tạo resource; có `Location` |
| 202 | — | job/export được nhận |
| 204 | — | thao tác thành công không body |
| 400 | `INVALID_REQUEST` | JSON/query/header sai định dạng |
| 401 | `AUTHENTICATION_REQUIRED`, `SESSION_EXPIRED` | chưa/xác thực không còn hợp lệ |
| 403 | `FORBIDDEN` | thiếu permission đã xác định |
| 404 | `NOT_FOUND` | không tồn tại hoặc bị che theo scope |
| 409 | `CONFLICT`, `INVALID_TRANSITION`, `DUPLICATE_RESOURCE` | xung đột trạng thái/unique |
| 412 | `VERSION_MISMATCH` | `If-Match` cũ/thiếu theo policy |
| 413 | `PAYLOAD_TOO_LARGE` | body/file vượt giới hạn |
| 415 | `UNSUPPORTED_MEDIA_TYPE` | kiểu nội dung không hỗ trợ |
| 422 | `VALIDATION_ERROR` | schema hợp lệ cú pháp nhưng sai rule |
| 429 | `RATE_LIMITED` | vượt hạn mức |
| 500 | `INTERNAL_ERROR` | lỗi không dự kiến, message tổng quát |
| 503 | `DEPENDENCY_UNAVAILABLE` | dependency tạm thời unavailable |

## 4. Idempotency và concurrency

- `POST` tạo incident, maintenance, import, export và notification retry dùng `Idempotency-Key`.
- Server lưu fingerprint method/path/principal/body cùng response trong TTL. Cùng key + cùng payload trả lại kết quả; cùng key + payload khác trả `409 IDEMPOTENCY_KEY_REUSED`.
- Resource mutable trả `ETag: "<version>"`. `PATCH/PUT/transition` bắt buộc `If-Match`; mismatch trả `412` kèm current version nhưng không lộ field ngoài quyền.
- Bulk operation là job; mỗi item có kết quả riêng, không hứa transaction toàn bộ nếu contract không ghi rõ.

## 5. User/session

### `GET /me`

Trả identity tối thiểu và effective permissions để dựng UI. Không dùng response này thay authorization server-side.

```json
{
  "data": {
    "id": "usr_demo_01",
    "displayName": "Demo User",
    "email": "user@example.invalid",
    "roles": ["service_agent"],
    "permissions": ["incident:read", "incident:update"],
    "scopes": [{ "type": "team", "id": "team_demo_01" }]
  },
  "meta": { "requestId": "req_demo_04" }
}
```

### `POST /session/logout`

Thu hồi session hiện tại, trả `204`. Với cookie session cần CSRF protection.

## 6. Asset/CMDB

### Asset representation

```json
{
  "id": "ast_demo_01",
  "displayId": "AST-DEMO-0001",
  "name": "Thiết bị mẫu 01",
  "type": { "id": "aty_demo_01", "name": "Thiết bị đầu cuối" },
  "status": "in_service",
  "criticality": "medium",
  "ownerTeamId": "team_demo_01",
  "siteId": "site_demo_01",
  "tags": ["demo"],
  "attributes": {},
  "version": 4,
  "createdAt": "2026-08-01T00:00:00Z",
  "updatedAt": "2026-08-20T08:30:00Z"
}
```

`attributes` phải được validate theo asset type schema, có allowlist và giới hạn dung lượng. Demo không thêm field định danh hạ tầng nhạy cảm.

| Method/path | Permission | Mô tả |
|---|---|---|
| `GET /assets` | `asset:read` | list/filter `q,typeId,status,criticality,ownerTeamId,siteId` |
| `POST /assets` | `asset:create` | tạo asset; idempotent |
| `GET /assets/{assetId}` | `asset:read` + scope | chi tiết và link được phép |
| `PATCH /assets/{assetId}` | `asset:update` + scope | partial update, cần `If-Match` |
| `POST /assets/{assetId}/archive` | `asset:archive` | chuyển trạng thái, không hard delete |
| `GET /assets/{assetId}/history` | `asset:history:read` | lịch sử thay đổi đã redact |
| `GET /asset-types` | `asset:read` | danh mục type/schema |
| `POST /asset-types` | `asset_type:manage` | tạo type có schema version |

### Relationship

```json
{
  "sourceAssetId": "ast_demo_01",
  "targetAssetId": "ast_demo_02",
  "relationshipType": "depends_on",
  "validFrom": "2026-08-21T00:00:00Z",
  "note": "Quan hệ mô phỏng"
}
```

| Method/path | Permission | Ghi chú |
|---|---|---|
| `GET /assets/{assetId}/relationships` | `asset:read` | chỉ trả target caller được xem |
| `POST /assets/{assetId}/relationships` | `asset_relationship:create` | chặn self-link/duplicate/cycle theo loại |
| `DELETE /asset-relationships/{relationshipId}` | `asset_relationship:delete` | ghi audit, trả `204` |

### Import

`POST /asset-imports` tạo job import synthetic CSV sau upload/quarantine. Body gồm `objectKey`, `dryRun` và `mappingVersion`. Trả `202` cùng job URI. `GET /asset-imports/{jobId}` trả counts `received/valid/invalid/created/updated` và error file ngắn hạn đã phân quyền. Không hỗ trợ `upsert` mặc định nếu unique key chưa rõ.

## 7. Incident và service request

### Incident representation

```json
{
  "id": "inc_demo_01",
  "displayId": "INC-DEMO-0001",
  "type": "incident",
  "title": "Yêu cầu hỗ trợ mô phỏng",
  "description": "Nội dung chỉ dùng cho demo.",
  "priority": "medium",
  "status": "triaged",
  "requesterId": "usr_demo_01",
  "assigneeId": null,
  "assignmentGroupId": "team_demo_01",
  "affectedAssetIds": ["ast_demo_01"],
  "sla": {
    "responseDueAt": "2026-08-21T06:00:00Z",
    "resolutionDueAt": "2026-08-22T03:00:00Z",
    "state": "running"
  },
  "version": 2,
  "createdAt": "2026-08-21T03:00:00Z",
  "updatedAt": "2026-08-21T03:10:00Z"
}
```

Priority enum: `low | medium | high | critical`. Status tối thiểu: `new | triaged | in_progress | pending | resolved | closed | cancelled`. Transition matrix là rule server-side; `closed` không quay lại nếu không có action `reopen` được phép.

| Method/path | Permission | Mô tả |
|---|---|---|
| `GET /incidents` | `incident:read` | list theo own/scope; filter status/priority/team/date/SLA |
| `POST /incidents` | `incident:create` | tạo ticket; idempotent; server đặt requester từ session |
| `GET /incidents/{incidentId}` | `incident:read` + object scope | chi tiết đã lọc field |
| `PATCH /incidents/{incidentId}` | `incident:update` + scope | sửa field allowlist; `If-Match` |
| `POST /incidents/{incidentId}/transitions` | `incident:transition` | action explicit, không PATCH status trực tiếp |
| `POST /incidents/{incidentId}/assignments` | `incident:assign` | gán user/team hợp lệ trong scope |
| `GET /incidents/{incidentId}/events` | `incident:history:read` | timeline immutable, phân trang |
| `GET /incidents/{incidentId}/comments` | `incident:read` | lọc internal/public theo permission |
| `POST /incidents/{incidentId}/comments` | `incident:comment` | plain text/markdown sanitize, idempotent |

Transition request:

```json
{
  "action": "start_progress",
  "reason": "Bắt đầu xử lý bản ghi demo"
}
```

Assignment request không cho caller chỉ định arbitrary scope:

```json
{
  "assigneeId": "usr_demo_02",
  "assignmentGroupId": "team_demo_01",
  "reason": "Phân công theo queue mô phỏng"
}
```

## 8. Maintenance

```json
{
  "title": "Bảo trì định kỳ mô phỏng",
  "description": "Checklist demo, không chứa cấu hình thật.",
  "assetIds": ["ast_demo_01"],
  "ownerTeamId": "team_demo_01",
  "scheduledStartAt": "2026-08-24T02:00:00Z",
  "scheduledEndAt": "2026-08-24T04:00:00Z",
  "timezone": "Asia/Ho_Chi_Minh",
  "checklist": [
    { "id": "step_demo_01", "title": "Xác nhận phạm vi demo", "required": true }
  ]
}
```

| Method/path | Permission | Mô tả |
|---|---|---|
| `GET /maintenance` | `maintenance:read` | list/calendar, range bị giới hạn |
| `POST /maintenance` | `maintenance:create` | tạo lịch; cảnh báo conflict |
| `GET /maintenance/{maintenanceId}` | `maintenance:read` | chi tiết/checklist/result |
| `PATCH /maintenance/{maintenanceId}` | `maintenance:update` | cần `If-Match` |
| `POST /maintenance/{maintenanceId}/transitions` | `maintenance:transition` | schedule/start/complete/cancel |
| `POST /maintenance/{maintenanceId}/checklist/{itemId}/complete` | `maintenance:execute` | actor/time/result immutable event |

## 9. Knowledge base

Status: `draft | in_review | published | archived`. Revision đã publish là immutable; edit tạo revision mới.

| Method/path | Permission | Mô tả |
|---|---|---|
| `GET /knowledge-articles` | public/internal theo policy | list/search published; agent thấy draft trong scope |
| `POST /knowledge-articles` | `knowledge:create` | tạo draft |
| `GET /knowledge-articles/{articleId}` | `knowledge:read` | revision phù hợp quyền |
| `PATCH /knowledge-articles/{articleId}` | `knowledge:update` | cập nhật draft, `If-Match` |
| `POST /knowledge-articles/{articleId}/submit-review` | `knowledge:submit` | gửi duyệt |
| `POST /knowledge-articles/{articleId}/publish` | `knowledge:publish` | publish revision, audit |
| `POST /knowledge-articles/{articleId}/archive` | `knowledge:archive` | ngừng công bố |
| `GET /knowledge-articles/{articleId}/revisions` | `knowledge:history:read` | lịch sử phiên bản |

Nội dung markdown có size limit, sanitize phía render và không hỗ trợ HTML/script tùy ý.

## 10. Service health và dashboard

Đây là read model; mọi metric trả `observedAt`, `freshness` và nguồn dạng logical name, không lộ endpoint monitoring.

### `GET /service-health`

Filter: `serviceId`, `from`, `to`; range mặc định/ngưỡng tối đa theo policy.

```json
{
  "data": [
    {
      "serviceId": "svc_demo_01",
      "name": "Dịch vụ mô phỏng",
      "status": "healthy",
      "score": 99.6,
      "freshness": "fresh",
      "observedAt": "2026-08-21T03:10:00Z"
    }
  ],
  "meta": { "requestId": "req_demo_05" }
}
```

Status: `healthy | degraded | unavailable | unknown`; `unknown` được dùng khi nguồn stale/unavailable, không tái sử dụng giá trị cũ mà thiếu nhãn.

### `GET /dashboard/summary`

Query `from`, `to`, `scopeId` (scopeId vẫn được kiểm tra quyền). Trả KPI kèm `definitionVersion`, `calculatedAt`, `dataThrough` và filter đã áp dụng để có thể đối soát.

## 11. Admin, role và audit

| Method/path | Permission | Mô tả |
|---|---|---|
| `GET /admin/users` | `identity:read` | user mapping tối thiểu; không trả token |
| `GET /admin/roles` | `role:read` | role/permission catalog |
| `POST /admin/user-role-assignments` | `role:assign` | assignment có scope/expiry; re-auth |
| `DELETE /admin/user-role-assignments/{id}` | `role:revoke` | revoke và invalidation session/policy |
| `GET /audit-events` | `audit:read` | filter actor/action/resource/time/outcome theo mandate |
| `POST /exports` | permission theo resource | tạo export job, có justification |
| `GET /exports/{exportId}` | requester + scope | trạng thái và signed download URL ngắn hạn |

Role assignment request:

```json
{
  "userId": "usr_demo_02",
  "roleId": "role_service_agent",
  "scope": { "type": "team", "id": "team_demo_01" },
  "expiresAt": "2026-09-30T17:00:00Z",
  "justification": "Phân quyền cho pilot mô phỏng"
}
```

Audit API là read-only; không cung cấp update/delete. Export audit phải có mandate, giới hạn thời gian, row cap và event audit riêng.

## 12. Job và attachment

### Job

`GET /jobs/{jobId}` trả:

```json
{
  "data": {
    "id": "job_demo_01",
    "type": "asset_import",
    "status": "completed",
    "progress": { "processed": 10, "total": 10 },
    "result": { "created": 9, "invalid": 1 },
    "createdAt": "2026-08-21T03:00:00Z",
    "completedAt": "2026-08-21T03:01:00Z"
  },
  "meta": { "requestId": "req_demo_06" }
}
```

Status: `queued | running | completed | failed | cancelled`. Error được sanitize; retry nội bộ không tạo duplicate nhờ idempotency.

### Attachment two-step flow

1. `POST /attachments/intents`: khai metadata filename/size/mediaType/resource type; server validate permission và trả signed quarantine upload URL.
2. Client upload trực tiếp.
3. `POST /attachments/{attachmentId}/complete`: xác nhận checksum; server enqueue scan.
4. `GET /attachments/{attachmentId}`: chỉ trả signed download khi status `available` và caller còn quyền resource.

Status: `pending_upload | quarantined | scanning | available | rejected | expired`. Không cho client tự đặt object key/status.

## 13. Webhook/integration (sau pilot)

Nếu cần outbound webhook:

- endpoint do admin chọn từ allowlist/integration catalog, không nhận URL tùy ý từ ticket;
- payload versioned, ID opaque, dữ liệu tối thiểu; HMAC signature có timestamp và replay window;
- retry exponential backoff, DLQ, delivery log đã redact và manual replay có audit;
- event ví dụ: `incident.created.v1`, `incident.status_changed.v1`, `maintenance.scheduled.v1`;
- không bảo đảm exactly-once; consumer deduplicate theo `eventId`.

Inbound integration dùng OAuth client credential/mTLS khi được duyệt, scope riêng cho từng adapter, rate limit và schema validation. Không dùng shared admin API key.

## 14. Versioning và compatibility

- Breaking change tạo major base path mới (`/api/v2`) hoặc theo policy OpenAPI được duyệt.
- Additive optional field là compatible; client phải bỏ qua field không biết.
- Không đổi semantics enum hiện có. Thêm enum value được coi là có rủi ro và cần consumer review.
- Deprecation công bố trong tài liệu/header, có telemetry consumer và tối thiểu một chu kỳ release được thống nhất.
- Database schema không phải public contract; response DTO tách khỏi ORM entity.

## 15. Contract verification

CI tương lai cần:

- validate/lint OpenAPI và generate type ở chế độ kiểm tra drift;
- breaking-change diff với version trên nhánh chính;
- request/response schema test cho success và mọi error quan trọng;
- consumer contract test cho adapter;
- authorization matrix test, IDOR, pagination stability, idempotency và ETag;
- fuzz/property test cho filter, transition và payload boundary;
- đảm bảo example chỉ dùng domain `.invalid` và ID synthetic.

# Chiến lược kiểm thử KSOps Transport Control

## 1. Mục tiêu

Chứng minh các luồng vận tải quan trọng hoạt động đúng, không tạo double booking/dispatch conflict/over-capacity, không lộ dữ liệu, có thể vận hành và rollback. Bản demo kiểm thử fixture/UI/config; pilot phải bổ sung backend integration, concurrency, payment/GPS contract, performance, security và UAT.

## 2. Nguyên tắc

- Test theo rủi ro, không theo số lượng case.
- Mọi fixture synthetic, deterministic và không giống record thật.
- Business rule nằm trong pure/domain helper để unit test được.
- UI test critical journey; không snapshot toàn trang dễ vỡ.
- Allow và deny path đều bắt buộc cho authorization.
- Concurrency/idempotency là acceptance criteria, không phải kiểm thử “nâng cao”.
- Test environment tách biệt; không gọi endpoint production.

## 3. Test pyramid

| Lớp | Mục tiêu | Chạy |
|---|---|---|
| Static | TypeScript, ESLint, secret/data pattern, dependency audit | mọi PR |
| Unit | pricing, volumetric weight, transition, capacity, overlap, decoder, CSV safety | mọi PR |
| Integration | DB constraint, transaction, repository, outbox, RBAC policy | mọi PR có backend |
| Contract | payment/GPS/ERP/notify adapter và API schema | PR + nightly |
| Component | form validation, filter, table, modal, seat map, keyboard/focus | PR theo feature |
| E2E | critical user journeys xuyên module | PR smoke + staging regression |
| Non-functional | a11y, security, load, restore, resilience | staging/release gate |
| UAT | đúng nghiệp vụ và vận hành | trước pilot |

## 4. Critical journeys

### Cargo order → delivery → billing

1. Nhân viên tạo đơn với kiện hàng hợp lệ.
2. Server tính cân nặng quy đổi và snapshot giá.
3. Điều phối gán đơn vào chuyến đủ tải.
4. Scan/mốc trạng thái theo transition matrix.
5. POD được quét, phân quyền và gắn retention.
6. Invoice sinh đúng snapshot; payment/COD được đối soát.

Case âm: prohibited item, sai kích thước, duplicate idempotency, xe quá tải, transition nhảy bước, POD độc hại, caller ngoài scope, payment mismatch.

### Passenger search → seat hold → booking → cancel/refund

1. Tìm chuyến theo ngày/tuyến.
2. Hai ghế được hold atomically có TTL.
3. Booking tạo với cùng price snapshot.
4. Signed payment callback xác nhận.
5. Cancel theo policy snapshot; refund idempotent.

Case âm: hai client giữ cùng ghế, hold hết hạn, callback replay/invalid signature, amount mismatch, booking retry, refund vượt quyền.

### Contract request → quote → trip

1. Tiếp nhận nhu cầu đoàn/loại xe/lịch.
2. Tạo quotation revision và approval đúng threshold.
3. Accept tạo contract, invoice schedule và nhu cầu fleet.
4. Điều phối chuyến không trùng xe/tài xế.

Case âm: quote expired, sửa revision đã gửi, thiếu approval, fleet không đủ, lịch chồng lấn.

### Maintenance safety gate

1. Odometer/schedule tạo work order.
2. Xe chuyển unavailable trong cửa sổ.
3. Checklist/evidence/sign-off đầy đủ.
4. Xe chỉ trở lại available khi policy đạt.

Case âm: odometer giảm bất thường, đóng thiếu checklist, dispatch xe đang bảo dưỡng/giấy tờ hết hạn.

## 5. Unit test matrix

| Nhóm | Case bắt buộc |
|---|---|
| Pricing | weight vs volumetric, min fee, surcharge, rounding, currency |
| Capacity | exact boundary, over, cancel/unload release, concurrent manifest |
| Time overlap | adjacent allowed, overlap denied, timezone/DST policy, overnight |
| Transition | allowed, denied, terminal state, actor/reason required |
| Seat hold | acquire, contention, expiry, release, confirm, retry |
| Idempotency | same key/same body, same key/different body, TTL/replay |
| Money | integer only, negative deny, sum/tax/adjustment |
| PII masking | role/scope variants, log/redact, export columns |
| CSV | comma/quote/newline/BOM và formula prefixes `= + - @` |
| localStorage demo | malformed JSON, wrong schema, blocked storage fallback, reset |

## 6. Integration và database

- Unique public code và booking seat constraint.
- Vehicle/driver schedule overlap constraint hoặc serialized policy transaction.
- Optimistic version conflict trả `412`.
- Entity + event history + audit + outbox commit/rollback cùng nhau.
- Worker at-least-once không nhân đôi notification/payment/manifest.
- Migration tiến trên schema N-1; app N tương thích trong rollout; forward-fix/rollback evidence.
- Application role không update/delete audit; PII column/table permission tối thiểu.
- Cursor pagination ổn định khi insert concurrent.

## 7. API/contract

- Request/response khớp OpenAPI/JSON Schema; unknown enum xử lý an toàn.
- Error envelope không lộ stack, SQL, PII/existence ngoài scope.
- Provider callbacks: signature, timestamp tolerance, replay, retry, out-of-order.
- GPS: stale timestamp, impossible jump, duplicate event, missing device, adapter timeout.
- ERP: partial failure, duplicate posting, rounding mismatch, reconciliation retry.
- Notification: template escaping, opt-out/purpose, invalid destination, DLQ.

Consumer-driven contract chạy với sandbox/stub versioned; production endpoint bị deny trong test.

## 8. UI, responsive và accessibility

Viewports tối thiểu: 390×844, 768×1024, 1366×768, 1440×900. Không horizontal overflow ngoài table scroller có chủ đích; touch target và sticky/fixed UI không che nội dung.

Kiểm tra:

- navigation, active route, Ctrl/Meta+K, back/forward;
- loading/empty/error/success/stale/offline state;
- label/input association, table caption/header, button accessible name;
- keyboard hoàn toàn cho modal, filters, seat map; focus trap/return/Escape;
- live region cho create/update/export; reduced motion; zoom 200%; contrast;
- screen reader critical journey; automated axe không serious/critical.

## 9. Security testing

- RBAC matrix allow/deny và object-level scope; IDOR enumeration.
- CSRF, CORS, cookie/session rotation/revoke, open redirect.
- injection (SQL/HTML/CSV), mass assignment, oversized body/page/file.
- upload polyglot/double extension/magic mismatch/malware fixture/path traversal.
- payment webhook spoof/replay/tamper; rate-limit bypass; trusted proxy headers.
- logs/metrics/traces không chứa token, contact, document, raw GPS/payment payload.
- dependency/secret scan, SBOM, CI permissions, artifact provenance.
- CSP/security headers validated trên production build/deployment.

Finding critical/high block release. Medium cần owner/deadline và risk acceptance nếu chưa sửa.

## 10. Performance và capacity

Scenario pilot dùng dataset synthetic gần quy mô dự kiến:

- trip search p95 <500ms ở concurrency thỏa thuận;
- create order/booking p95 <800ms không tính redirect provider;
- 100 client tranh một ghế: tối đa một booking thành công;
- dispatch board ngày cao điểm, fleet/order list với pagination;
- report/export chạy read model/job, không làm cạn DB pool;
- payment/GPS burst qua queue, kiểm tra backlog recovery/DLQ.

Đo latency/error/saturation/DB wait/queue depth; ramp có kiểm soát, timeout rõ, không load-test production khi chưa được phép.

## 11. Resilience và DR

Fault injection staging: payment/GPS/notify timeout/5xx, queue delay, DB failover, object scan unavailable, duplicate/out-of-order events. Xác nhận UI hiển thị stale/pending, retry bounded và không mất/nhân đôi transaction.

Backup/restore drill: restore vào môi trường cô lập; checksum/count/business invariant; rotate restored secret; ghi thời gian đạt RPO/RTO; destroy môi trường theo retention.

## 12. UAT

Đại diện phòng vé, hàng hóa, điều phối, bảo dưỡng, tài chính và quản lý thực hiện script với dữ liệu synthetic. Evidence gồm case ID, actor, environment/build SHA, steps, result, screenshot không PII, defect link và sign-off.

UAT xác nhận: thuật ngữ dễ hiểu, số liệu đối soát, cảnh báo có thể hành động, exception path thực tế, quyền đúng vai trò, runbook/support đủ dùng.

## 13. CI và lịch chạy

- PR: typecheck, lint, unit, component chọn lọc, build, security config, audit.
- Merge main: integration/contract, smoke deployment.
- Nightly: full E2E, adapter contract, synthetic data safety.
- Release candidate: regression, a11y, security, load baseline, migration/restore, UAT evidence.
- Post-deploy: route/API smoke, SLO, queue, audit write và business reconciliation.

Test flaky bị quarantine có owner/deadline; không rerun mù để “xanh”.

## 14. Exit criteria

Pilot chỉ đạt khi:

- Must stories và critical journeys đạt;
- Sev-1/2 = 0, critical/high security = 0;
- double booking/dispatch conflict/over-capacity invariant đạt dưới concurrency;
- RBAC negative test, audit, payment reconciliation, migration và restore đạt;
- WCAG 2.2 AA luồng chính, performance budget và production smoke đạt;
- known limitations, owner, support/runbook/rollback và sign-off đầy đủ.

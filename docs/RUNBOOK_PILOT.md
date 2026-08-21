# Runbook triển khai và vận hành pilot

## 1. Phạm vi và điều kiện sử dụng

Runbook này chỉ áp dụng cho **cargo vertical slice** trong một pilot đã được phê duyệt. Nó không biến bản Vercel công khai thành production và không cấp phép dùng dữ liệu thật. Dispatch, booking, maintenance, contract, finance và external integration chỉ được đưa vào nếu có runbook/gate riêng.

Điều kiện bắt đầu:

- mọi hard blocker và chữ ký tương ứng trong [Production Readiness](PRODUCTION_READINESS.md) đã đạt;
- có Release Manager, Incident Commander, Platform/DB owner, Security/Data contact và Cargo Operations owner đích danh;
- artifact/commit SHA bất biến đã qua CI, staging UAT và security gate;
- backup/PITR, observability, on-call và kênh thông báo đã được kiểm tra;
- toàn bộ thao tác dùng tài khoản cá nhân có MFA; không dùng shared admin hằng ngày.

## 2. Chuẩn bị release

1. Ghi change record: artifact SHA, migration list/checksum, phạm vi, thời điểm, owner, abort criteria và deployment trước đó.
2. Xác nhận health/SLO của phiên bản hiện hành, queue/outbox backlog và không có incident đang mở.
3. Xác nhận PITR/backup gần nhất và restore point; không coi “đã bật backup” là bằng chứng nếu chưa diễn tập restore.
4. Kiểm tra migration là expand-compatible với application hiện hành; không sửa file migration đã áp dụng.
5. Xác nhận runtime identity khác migration identity và runtime không có DDL/`BYPASSRLS`.
6. Chạy quality gate trên đúng artifact:

```bash
npm ci
npm run check
npm run build
npm audit --audit-level=high
```

7. Trên database staging cô lập, dùng biến `MIGRATION_DATABASE_URL` của staging:

```bash
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
npm run test:integration:postgres
```

`TEST_DATABASE_URL` phải trỏ tới database integration test riêng. Không chạy suite destructive trên pilot database. Seed development chỉ được dùng ở local/staging synthetic theo guard trong [db/README.md](../db/README.md).

## 3. Triển khai

1. Deploy artifact vào staging với cấu hình staging; không copy secret pilot sang preview.
2. Chạy smoke ở mục 4 và UAT synthetic; ghi request ID/evidence, không ghi token hoặc PII.
3. Lấy phê duyệt Release Manager + Operations + Platform; recheck abort criteria.
4. Chạy migration pilot bằng migration identity trong maintenance/change window:

```bash
npm run db:migrate:status
npm run db:migrate
npm run db:migrate:status
```

5. Platform owner áp dụng/review lại `db/admin/grant_runtime_role.sql` theo [database admin template](../db/admin/README.md); runtime URL không được dùng owner/migration identity và remote `DATABASE_URL` phải có `sslmode=verify-full`.
6. Promote đúng Vercel deployment bất biến đã được kiểm thử; không rebuild từ working tree khác.
7. Chạy smoke read-only trước, sau đó một synthetic canary đã được cho phép. Theo dõi error rate, DB connection/wait, latency, auth failure, audit write và outbox backlog.
8. Giữ cửa sổ quan sát theo change record rồi mới tuyên bố release hoàn tất.

## 4. Health và smoke test

Không in response chứa session/principal vào log công khai. Các request pilot cần browser/session Auth0 hợp lệ; ví dụ dưới đây chỉ dùng endpoint không yêu cầu nghiệp vụ mutation:

```bash
curl --fail-with-body "$APP_BASE_URL/api/v1/health/live"
curl --fail-with-body "$APP_BASE_URL/api/v1/health/ready"
curl --fail-with-body "$APP_BASE_URL/api/v1/system/capabilities"
```

Xác nhận:

- liveness trả tiến trình sống; readiness pilot xác minh migration checksum, runtime grants, tenant context và protected read, đồng thời không trả `demo`;
- capability chỉ được dùng làm snapshot bảo thủ, không thay thế health/UAT;
- `/api/v1/me` với người dùng thử đích danh trả đúng principal và scope riêng của từng permission;
- caller ngoài scope bị từ chối và không suy ra resource tồn tại;
- create cargo synthetic được phép trả `201`, `Location`, `ETag`, `X-Request-Id`; retry cùng key/body replay, cùng key/body khác trả `409`;
- transition đúng `If-Match` tăng version; version cũ trả `412`; resolve exception chỉ thành công khi cả transition và resolve-exception scope bao phủ branch; order/event/audit/outbox xuất hiện atomically;
- không có stack, SQL, token, contact/address hoặc organization internals trong response/log.

Bản public demo được kỳ vọng báo không có durable persistence và API nghiệp vụ fail closed. Không dùng public demo làm smoke proof cho pilot.

## 5. Abort và rollback

Abort khi có một trong các dấu hiệu: auth/scope bypass, mất hoặc sai dữ liệu, migration không rõ trạng thái, error/latency vượt ngưỡng, audit/outbox không ghi, secret lộ, hoặc alert/owner không phản hồi.

### Application rollback

1. Incident Commander dừng promotion và hạn chế mutation/traffic theo cơ chế đã phê duyệt.
2. Roll back alias/traffic về Vercel deployment bất biến trước đó đã biết tốt.
3. Smoke read-only, xác nhận version compatibility và theo dõi phục hồi.
4. Ghi timeline, request ID, artifact SHA; không xóa evidence.

Không âm thầm chuyển pilot đang chạy sang `demo`: việc đó có thể che mất ghi dữ liệu và tạo hai nguồn sự thật. Nếu cần cô lập, dùng maintenance/read-only/traffic block đã phê duyệt và thông báo rõ cho người vận hành.

### Database rollback

- Migration theo hướng **expand → migrate → contract**, ưu tiên forward-fix; không có “down migration” mù.
- Nếu migration lỗi trong transaction trước khi mở traffic, xác minh rollback transaction và migration checksum/status rồi dừng release.
- Nếu đã có write trên schema mới, không tự phục hồi database về quá khứ. Cô lập write, đánh giá compatibility và dùng forward-fix hoặc quy trình restore có phê duyệt.
- Contract/drop chỉ chạy ở release sau khi application cũ, job cũ và rollback window đã hết.

## 6. Khôi phục database

1. Incident Commander đóng băng write và giữ nguyên audit/log/evidence; ghi thời điểm sự cố và restore objective.
2. Data Owner + Platform chọn restore point phù hợp với RPO, xác định giao dịch có thể mất và kế hoạch reconciliation.
3. Restore/PITR vào Neon branch/project **cô lập**; không overwrite pilot tự động.
4. Dùng credential cô lập để kiểm tra migration status/checksum, row count theo tenant, FK/RLS, cargo version/event sequence, audit, idempotency và outbox.
5. Chạy smoke và reconciliation bằng dữ liệu được phép; không gửi side effect từ outbox của bản restore.
6. Rotate credential/secret có khả năng nằm trong snapshot; kiểm tra integration destination vẫn bị vô hiệu hóa.
7. Ghi thời gian thực tế để đối chiếu RPO/RTO. Data Owner, Security và Release Manager phê duyệt cutover hoặc phương án merge/forward recovery.
8. Sau cutover, quan sát tăng cường; hủy môi trường restore theo retention và lưu evidence không PII.

Restore drill phải được thực hiện trước pilot và định kỳ theo chính sách. Backup chưa từng restore không đủ để đóng gate DR.

## 7. Xử lý incident

1. **Phân loại:** Sev-1 cho rò rỉ/cross-tenant, mất dữ liệu hoặc ngừng toàn bộ; Sev-2 cho suy giảm nghiêm trọng/không có workaround; các mức còn lại theo policy doanh nghiệp.
2. **Contain:** thu hồi session/credential, block mutation/integration hoặc cô lập deployment/database trong phạm vi được phê duyệt. Ưu tiên an toàn và tính toàn vẹn hơn tốc độ khôi phục.
3. **Preserve evidence:** timeline UTC, artifact/migration version, request ID, alert và hành động. Không paste token, PII, raw GPS/payment/contact vào chat/ticket.
4. **Escalate:** Security/Privacy và Legal được gọi ngay khi nghi ngờ truy cập trái phép hoặc dữ liệu cá nhân; notification deadline theo policy/pháp luật áp dụng.
5. **Communicate:** Incident Commander phát status định kỳ, một nguồn thông tin chính thức; Operations cung cấp workaround đã phê duyệt.
6. **Recover:** chọn rollback, forward-fix hoặc restore theo các mục trên; canary và reconciliation trước khi mở toàn bộ traffic.
7. **Close:** xác nhận audit/outbox/reconciliation, thu hồi quyền tạm, lập postmortem không đổ lỗi với owner/deadline; cập nhật test/runbook.

Không “sửa trực tiếp dữ liệu” bằng console nếu chưa có change record, truy vấn peer-reviewed, backup và audit trail.

## 8. Rotation secret và identity

| Thành phần | Quy trình an toàn |
|---|---|
| `DATABASE_URL` | tạo runtime credential mới với đúng grants/RLS và remote `sslmode=verify-full`; deploy; smoke; drain connection; revoke credential cũ; kiểm tra audit |
| `MIGRATION_DATABASE_URL` | tạo migration identity mới, kiểm tra DDL/status trong staging, cập nhật release secret rồi revoke identity cũ |
| `AUTH0_CLIENT_SECRET` | rotate tại provider, cập nhật secret manager, deploy/smoke login-callback-logout rồi revoke secret cũ theo overlap được hỗ trợ |
| `AUTH0_SECRET` | bảo vệ session cookie; rotation có thể buộc đăng nhập lại. Xác minh khả năng dual-key của SDK hoặc dùng maintenance window, deploy và revoke session cũ |
| `KSOPS_IDEMPOTENCY_SECRET` | hiện chưa có key version/dual-read. Đổi đơn lẻ sẽ phá replay của key còn hạn; chờ hết TTL trong maintenance window hoặc triển khai dual-key/version trước |
| `KSOPS_IDENTITY_LOOKUP_SECRET` | đổi đơn lẻ làm subject HMAC không khớp và khóa người dùng. Cần dual-read, backfill có audit, cutover rồi mới bỏ key cũ |
| `KSOPS_ORGANIZATION_ID` | không phải secret có thể rotate; thay đổi là tenant migration có data mapping, authorization review và cutover riêng |

Sau mọi rotation: kiểm tra secret không xuất hiện trong build/log, login/revoke, RLS, cargo canary, alert và rollback path. Ghi ai làm/khi nào/version nào, không ghi giá trị.

## 9. Công việc định kỳ

- Mỗi ca: health/SLO/error/auth anomaly/outbox backlog và failed reconciliation.
- Hằng tuần trong pilot: access delta, dependency/security alert, idempotency/outbox row hết hạn, capacity và support trend.
- Theo policy: access review, secret rotation, backup restore drill, tabletop incident, DPA/subprocessor review và retention deletion evidence.
- Sau mỗi release: kiểm tra migration checksum/status, smoke, audit write, known limitations và cập nhật runbook.

## 10. Bàn giao/kết thúc pilot

Pilot chỉ được đóng hoặc mở rộng sau khi đối soát cargo, xử lý hết outbox, export evidence được phép, thu hồi named user/temporary access và xác nhận retention/deletion. Quyết định mở dispatch hoặc module khác phải quay lại go-live gate riêng; kết quả cargo không tự động chứng minh các miền còn lại an toàn.

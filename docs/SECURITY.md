# Bảo mật KSOps Transport Control

## 1. Phạm vi

Tài liệu này là baseline cho pilot. Bản demo công khai chỉ chứa dữ liệu synthetic, không có đăng nhập, database, GPS, thanh toán hay tích hợp thật. Trước pilot phải thực hiện threat model workshop, privacy impact assessment, penetration test theo rủi ro và phê duyệt của Security/Data Owner.

## 2. Tài sản cần bảo vệ

| Nhóm | Ví dụ | Mức mặc định |
|---|---|---|
| Danh tính khách hàng | tên, liên hệ, lịch sử đặt vé/gửi hàng | Confidential/PII |
| Hồ sơ tài xế | định danh, bằng lái, sức khỏe/qualification | Restricted |
| Vận hành | biển số, chuyến, manifest, vị trí/ETA, tải/ghế | Confidential |
| Hàng hóa | người gửi/nhận, loại/giá trị, COD, proof of delivery | Restricted khi có PII/giá trị |
| Tài chính | hóa đơn, công nợ, payment reference | Restricted |
| Danh tính hệ thống | session, token, API key, service account | Secret |
| Audit/telemetry | actor, hành động, request/trace, security event | Confidential |

Không lưu PAN/CVV, mật khẩu plaintext, raw IdP token lâu dài, secret trong source hoặc giấy tờ vượt purpose/retention.

## 3. Threat model rút gọn

| Mối đe dọa | Kịch bản | Kiểm soát chính |
|---|---|---|
| Broken access control | phòng vé xem đơn/PII ngoài phạm vi | server-side RBAC+scope, deny-default, negative test |
| Double booking | hai request mua cùng ghế | atomic hold, transaction, unique constraint, idempotency |
| Dispatch conflict | một xe/tài xế bị gán trùng | overlap constraint, optimistic locking, policy gate |
| Tamper status/pricing | sửa giá/trạng thái từ browser | server validation, immutable price snapshot, transition matrix, audit |
| PII leakage | log/export/URL chứa dữ liệu người dùng | minimization, masking, redact, export permission/audit, DLP |
| Payment spoofing | callback giả hoặc replay | signature, timestamp tolerance, nonce/idempotency, reconciliation |
| GPS spoof/stale | dùng vị trí cũ/sai để ra quyết định | trusted adapter, freshness, sanity check, anomaly alert |
| Malicious upload | POD/hợp đồng chứa malware/XSS | size/MIME/magic check, AV scan, random key, signed URL, sandbox preview |
| CSV injection | ô bắt đầu `= + - @` | prefix/escaping server-side, content disposition, export audit |
| Supply chain | dependency/action bị chiếm | lockfile, immutable action SHA, audit/SBOM, least-privilege CI |
| Credential theft | secret lộ từ repo/log | secret manager, short-lived OIDC, rotation, detector |
| Availability abuse | search/export/booking flood | rate limit, bounds, queue, timeout, circuit breaker |

## 4. Authentication và session

- OIDC Authorization Code + PKCE, `state`, `nonce`; issuer/audience/algorithm allowlist.
- Session cookie `HttpOnly`, `Secure`, `SameSite=Lax/Strict` theo flow; rotate sau login/privilege change.
- Idle và absolute timeout; server-side revoke cho khóa user/role change/sự cố.
- MFA do IdP áp dụng cho điều phối, tài chính, admin và export nhạy cảm.
- CSRF token/origin check cho mutation dựa cookie; không dùng GET để thay đổi trạng thái.
- Re-authentication cho cấp quyền, bulk export, refund lớn và override điều phối.

## 5. Authorization

Vai trò mẫu: `customer-service`, `cargo-agent`, `ticket-agent`, `dispatcher`, `driver`, `maintenance`, `finance`, `manager`, `auditor`, `admin`.

Permission theo `resource:action` và scope (`own`, `assigned-trip`, `office`, `region`, `all`). UI chỉ phản ánh quyền; server luôn authorize trên resource hiện tại.

Ví dụ:

| Hành động | Quyền | Điều kiện |
|---|---|---|
| Xem liên hệ người nhận | `cargo-order:read-pii` | office/assigned trip |
| Phân công xe/tài xế | `trip:assign` | region + no hard conflict |
| Override capacity mềm | `trip:override` | manager + reason + expiry + audit |
| Refund | `booking:refund` | threshold; maker-checker khi vượt mức |
| Ghi nhận thanh toán | `invoice:record-payment` | finance scope + reconciliation |
| Export | `<resource>:export` | explicit columns/purpose + audit |

Hard safety invariant (xe blocked, qualification không hợp lệ, double booking) không được bypass bằng việc ẩn cảnh báo.

## 6. Validation và workflow integrity

- Validate runtime ở API boundary; normalize Unicode/phone/date/timezone theo contract.
- Allowlist state transition và reason code; actor/time/version do server sinh.
- `If-Match`/version chống lost update; conflict trả lỗi có thể xử lý.
- `Idempotency-Key` cho create order/booking/invoice/payment callback.
- Monetary value là integer minor unit; currency explicit; pricing/version snapshot immutable.
- Weight/dimensions/capacity có min/max; server tính volumetric weight.
- Không render HTML tùy ý; encode output, sanitize rich text bằng policy chặt.
- Query/page/body/file bounds và prepared statements/ORM parameterization.

## 7. Privacy

- Purpose limitation và minimization: chỉ thu trường cần cho giao dịch/pháp lý đã xác định.
- Mask PII mặc định; reveal action có permission, reason và audit khi cần.
- Tách PII khỏi public code, URL, analytics và broad read model.
- Retention theo loại: booking/order, invoice, GPS, POD, giấy tờ tài xế; Data Owner/pháp lý quyết định, không hard-code tùy ý.
- DSAR/correction/deletion được thiết kế có ngoại lệ retention pháp lý và audit.
- Không dùng dữ liệu production cho dev/test; nếu buộc hỗ trợ phải qua quy trình break-glass và môi trường được duyệt.
- Link notification không chứa PII/token dài hạn; dùng opaque short-lived token.

## 8. Payment, COD và tài chính

- Redirect/tokenization qua provider PCI-compliant; KSOps chỉ lưu provider reference và trạng thái.
- Callback xác minh chữ ký, timestamp, event ID và amount/currency/order match; xử lý idempotent.
- Không coi redirect browser thành bằng chứng thanh toán.
- Refund/adjustment có permission, threshold, maker-checker và audit.
- COD lưu số tiền cần thu/đã đối soát, không lưu bí mật thanh toán; discrepancy tạo exception.
- Reconciliation job so provider/ERP/order ledger, có dashboard mismatch và runbook.

## 9. Upload và attachment

Luồng: request upload permission → server cấp signed upload ngắn hạn → object quarantine → kiểm tra size/magic/MIME/name → malware scan → metadata commit → chỉ download qua authorization + signed URL. Không phục vụ inline HTML/SVG không tin cậy; attachment nhạy cảm buộc download và có cache policy phù hợp.

## 10. Logging, audit và alert

Structured log không chứa Authorization/Cookie/token, PII đầy đủ, raw GPS, payment payload, comment/attachment. Actor dùng pseudonymous ID; route dùng template, không raw URL có identifier.

Audit append-only tối thiểu: login/deny, permission/admin change, PII reveal/export, order/booking/trip transition, assignment/override, pricing/refund/payment, attachment access, maintenance sign-off. Audit có integrity/retention/access riêng; application role không update/delete.

Alert có owner/runbook cho: auth failure burst, permission change, bulk export, double-booking/conflict, payment mismatch, GPS stale/spoof suspicion, queue backlog, audit write failure và secret detector.

## 11. Headers và browser security

- TLS + HSTS sau khi domain/subdomain readiness được xác nhận.
- CSP deny-by-default; `frame-ancestors 'none'`, `object-src 'none'`, hạn chế script/connect/img.
- `X-Content-Type-Options: nosniff`, Referrer-Policy, Permissions-Policy.
- CORS allowlist exact origin khi cần; không wildcard với credentials.
- Cookie scope tối thiểu; cache-control `no-store` cho PII/financial/driver document.
- Bản demo có `noindex, nofollow, noarchive` để tránh bị hiểu nhầm là hệ thống chính thức.

## 12. Secrets và supply chain

- Secret manager theo environment; không `.env` trong Git, chat, ticket, screenshot hoặc log.
- Prefer workload identity/OIDC; service account least privilege, expiry/rotation và owner.
- `npm ci` theo lockfile, dependency audit, action pin SHA, branch protection, signed/provenance artifact và SBOM.
- CI token permissions explicit, fork PR không nhận production secrets; protected environment cần approval.
- Critical/high là release blocker trừ waiver có owner, compensating control và expiry.

## 13. Incident response

1. Xác nhận và phân loại; không làm mất bằng chứng.
2. Cô lập account/integration/environment; revoke session và rotate secret liên quan.
3. Xác định phạm vi người, đơn, chuyến, thời gian và loại dữ liệu.
4. Vá/contain, test regression và triển khai qua change khẩn cấp được kiểm soát.
5. Thông báo Security/Data Owner/Legal/Ops theo playbook và nghĩa vụ áp dụng.
6. Khôi phục, đối soát dữ liệu, theo dõi tăng cường.
7. Post-incident review không đổ lỗi; action có owner/deadline.

Runbook riêng cho: double booking, dispatch conflict gây ảnh hưởng, payment mismatch, PII export, GPS spoof/stale, credential leak, malware upload, database restore và audit outage.

## 14. Security gate

Không pilot nếu thiếu threat model/privacy approval, negative authorization tests, concurrency tests cho ghế/chuyến, payment reconciliation, audit evidence, restore drill hoặc còn finding critical/high. Mọi exception phải có risk owner và ngày hết hạn.

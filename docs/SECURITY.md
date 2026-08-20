# Bảo mật KSOps

## 1. Mục tiêu, giả định và ranh giới tin cậy

Tài liệu này là security baseline cho pilot KSOps, áp dụng nguyên tắc least privilege, deny-by-default, defense in depth và có thể kiểm toán. Bản demo hiện chỉ có dữ liệu mock; không được suy diễn rằng giao diện đăng nhập hoặc việc ẩn nút đã tạo ra một control bảo mật hoàn chỉnh.

Tài sản cần bảo vệ:

1. danh tính, session và quyền người dùng;
2. dữ liệu CMDB, ticket, bình luận, lịch bảo trì và attachment;
3. audit trail, cấu hình SLA và metric/report;
4. secret ứng dụng, credential database, signing/encryption key;
5. tính toàn vẹn build artifact, workflow CI/CD và dependency;
6. availability của portal và khả năng phục hồi.

Ranh giới tin cậy nằm giữa browser–edge, edge–web/API, web–database/queue/object storage, web–IdP và adapter–hệ thống ngoài. Mọi dữ liệu đi qua ranh giới đều phải được authenticate, authorize, validate và quan sát phù hợp.

## 2. Phân loại dữ liệu

| Mức | Ví dụ | Yêu cầu tối thiểu |
|---|---|---|
| Public | nội dung giới thiệu sản phẩm đã duyệt | integrity, cache control |
| Internal | quy trình mẫu, danh mục synthetic | authenticated access trong pilot |
| Confidential | ticket thật, asset metadata, quan hệ dịch vụ, email công việc | need-to-know, encryption, audit, retention |
| Restricted | credential, token, private key, backup, security finding chi tiết | secret manager/HSM khi phù hợp; không hiển thị/lưu trong app thông thường |

Repository chỉ được chứa Public/Internal synthetic. Không commit DOC/DOCX/PDF nguồn, `.env`, certificate/key, database dump, log vận hành thật hoặc ảnh nội bộ. IP, hostname, MAC, VLAN và topology được coi là Confidential trở lên và không xuất hiện trong demo.

## 3. Xác thực và quản lý session

- Dùng OIDC Authorization Code + PKCE với IdP được doanh nghiệp phê duyệt; kiểm tra `issuer`, `audience`, signature, `exp`, `iat`, `nonce` và `state`.
- Không tự xây password login. MFA và lifecycle nhân sự thuộc IdP; KSOps phản ánh trạng thái khóa/revoke nhanh nhất có thể.
- Session cookie: `HttpOnly`, `Secure`, `SameSite=Lax` hoặc nghiêm hơn khi luồng cho phép, path/domain hẹp, TTL ngắn và rotate sau login/privilege change.
- Session phía server hoặc token reference ưu tiên hơn lưu access token trong browser. Không dùng `localStorage` cho token.
- Logout thu hồi server session; logout toàn bộ khi user bị khóa, role thay đổi hoặc có sự cố.
- Re-authentication cho thao tác nhạy cảm: cấp quyền quản trị, bulk export, thay retention hoặc restore.
- Header identity từ hosting chỉ được tin khi request đến từ trusted runtime/proxy đã cấu hình; browser không được tự gửi claim quyết định quyền.
- CSRF token cho state-changing request dùng cookie session; đồng thời kiểm tra Origin/Referer theo allowlist.

## 4. Mô hình RBAC

RBAC kiểm soát **hành động**, data scope kiểm soát **record nào**. Mọi policy chạy server-side ở use-case boundary và repository query; UI chỉ phản ánh kết quả, không phải security boundary.

### Vai trò

- `requester`: tạo và xem yêu cầu của bản thân, xem bài tri thức đã công bố.
- `service_agent`: xử lý ticket thuộc queue/scope được giao, bình luận nội bộ.
- `asset_operator`: quản lý CMDB và bảo trì trong scope được phân công.
- `service_manager`: quản lý SLA/queue, duyệt tri thức, xem báo cáo trong scope.
- `auditor`: chỉ đọc record và audit được phép, không sửa nghiệp vụ.
- `security_admin`: quản lý user mapping/role, access review; không mặc nhiên sửa ticket/tài sản.
- `system_integration`: principal máy, permission rất hẹp theo adapter; không có interactive login.

Không có role `superuser` dùng hàng ngày. Break-glass account phải tách riêng, MFA mạnh, thời hạn ngắn, cảnh báo tức thời và post-event review.

### Permission matrix tối thiểu

Ký hiệu: `Own` = của chính mình; `Scope` = team/đơn vị được gán; `All` = toàn phạm vi tổ chức được phê duyệt; `—` = từ chối.

| Hành động | Requester | Service agent | Asset operator | Service manager | Auditor | Security admin |
|---|---:|---:|---:|---:|---:|---:|
| Tạo ticket | Own | Scope | Own | Scope | — | — |
| Xem ticket | Own | Scope | ticket liên kết/scope | Scope | All (read) | metadata tối thiểu |
| Gán/chuyển trạng thái ticket | — | Scope | — | Scope | — | — |
| Xem bình luận internal | — | Scope | khi được thêm vào | Scope | All (read) | — |
| CRUD asset | — | read Scope | Scope | read Scope | All (read) | — |
| CRUD bảo trì | — | read Scope | Scope | approve Scope | All (read) | — |
| Viết bài tri thức | — | Scope | Scope | Scope | — | — |
| Publish bài tri thức | — | — | — | Scope | — | — |
| Xem audit | — | own security events | own actions | Scope | All (read) | access events |
| Gán role/permission | — | — | — | — | — | All, trừ break-glass |
| Export dữ liệu | own ticket | Scope có phê duyệt | Scope có phê duyệt | Scope có phê duyệt | theo mandate | access report |

### Quy tắc thực thi

- Permission có dạng `resource:action`, ví dụ `incident:assign`, cộng điều kiện `scope`.
- User mới không có quyền cho đến khi được provision; role hết hạn được hỗ trợ cho assignment tạm thời.
- Không nhận `role`, `ownerId`, `siteId`, `assigneeScope` từ client như bằng chứng quyền; server lấy từ session/policy store.
- Update dùng allowlist field theo permission. Mass assignment phải bị chặn.
- Endpoint danh sách áp dụng scope trong SQL query, không fetch tất cả rồi filter trong JavaScript.
- Mỗi permission có positive và negative integration test; test IDOR bằng cách đổi resource ID.
- Thay đổi quyền tạo audit event và làm mất hiệu lực session/cache policy liên quan.

## 5. Threat model (STRIDE)

| ID | Mối đe dọa / vector | Tác động | Control phòng ngừa/phát hiện | Kiểm thử |
|---|---|---|---|---|
| T01 / Spoofing | giả identity header hoặc token OIDC | chiếm tài khoản | trusted proxy, signature/issuer/audience/nonce, session rotation | forged/expired token test |
| T02 / Spoofing | session theft/fixation | truy cập trái phép | secure cookie, short TTL, rotate, revoke, CSP | cookie/session integration test |
| T03 / Tampering | sửa owner/role/status qua payload thừa | leo thang quyền/sai workflow | schema strict, field allowlist, policy server-side | mass-assignment test |
| T04 / Tampering | lost update/ghi đè dữ liệu | mất toàn vẹn | version/ETag, transaction, immutable event history | concurrent update test |
| T05 / Repudiation | người dùng phủ nhận thay đổi | mất truy vết | append-only audit, actor/time/outcome/request ID, clock sync | audit completeness test |
| T06 / Information disclosure | IDOR trên ticket/asset/export | lộ dữ liệu | scoped query, object-level auth, generic 404 khi phù hợp | cross-scope test |
| T07 / Information disclosure | secret/PII trong log/error | lộ credential/dữ liệu | structured logging, redaction, generic client error | log scan, forced error test |
| T08 / Information disclosure | cache nhầm scope | lộ dashboard giữa role | private/no-store, cache key có principal/scope, invalidation | role-switch cache test |
| T09 / Denial of service | search/export/file lớn, login burst | cạn tài nguyên | rate/body/page limit, timeout, queue export, WAF | load/abuse test |
| T10 / Elevation | chỉ ẩn UI, endpoint thiếu guard | toàn quyền trái phép | centralized policy, deny-by-default, route inventory | authorization matrix test |
| T11 / Injection | SQL/XSS/template/CSV injection | chiếm dữ liệu/session | parameterized query, escaping, sanitize, safe CSV export | SAST + payload suite |
| T12 / Supply chain | dependency/action/build bị thay | compromise artifact | lockfile, pinned actions/commit theo policy, audit/SBOM, protected branch | dependency review |
| T13 / Attachment | malware/path traversal/content spoof | compromise người dùng/hệ thống | signed upload, random key, MIME sniff, scan/quarantine, safe download | EICAR in isolated test, filename cases |
| T14 / SSRF | adapter/webhook URL tùy ý | truy cập mạng nội bộ | fixed allowlist, URL parser, block private/link-local, egress control | SSRF corpus |
| T15 / Abuse | CSV formula và bulk export | exfiltration/code execution khi mở file | approval, row limit, audit, prefix dangerous cells | CSV injection test |
| T16 / Availability | IdP/monitoring ngừng | portal hoặc dashboard lỗi | timeout, graceful degradation, cached stale label, runbook | dependency fault test |

Threat model được review khi thêm integration, upload, bulk action, thay identity/session hoặc trước pilot. Finding có owner, severity, due date và evidence đóng.

## 6. Validation và bảo vệ lớp ứng dụng

- Mọi input (body, query, path, header) được validate bằng schema strict; giới hạn length, enum, date range và nesting.
- Query database luôn parameterized qua ORM; không nối chuỗi SQL từ input. Dynamic sort chỉ map qua allowlist column.
- React escaping mặc định được giữ; tránh `dangerouslySetInnerHTML`. Markdown/HTML phải sanitize với allowlist và test stored XSS.
- Response không serialize entity thô; DTO allowlist loại bỏ internal note, secret, soft-delete metadata khi caller không có quyền.
- Error response không chứa stack, SQL, đường dẫn máy, token hoặc existence oracle. Chi tiết chỉ vào log đã redact với request ID.
- Security headers: CSP theo nonce/hash, HSTS ở production HTTPS, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `Permissions-Policy`, frame protection qua CSP `frame-ancestors`.
- CORS mặc định same-origin; nếu cần cross-origin, allowlist origin/method/header cụ thể và không dùng wildcard với credential.
- Redirect/callback/return URL chỉ chấp nhận same-origin relative hoặc allowlist tuyệt đối.

## 7. Attachment và export

- Upload trực tiếp vào vùng quarantine bằng signed URL ngắn hạn; server cấp key ngẫu nhiên, không dùng filename làm path.
- Kiểm tra size, declared MIME, magic bytes; antivirus/sandbox theo khả năng; chỉ record `available` sau scan.
- Download kiểm tra quyền tại thời điểm cấp URL; `Content-Disposition: attachment` cho loại rủi ro; vô hiệu inline scriptable content.
- Không cho upload executable/archive lồng nhau trong pilot nếu chưa có business need.
- Export lớn chạy background job, có expiry, watermark/metadata người yêu cầu, row limit và audit.
- CSV neutralize cell bắt đầu bằng `=`, `+`, `-`, `@`, tab hoặc carriage return.

## 8. Secret, key và cấu hình

- Secret chỉ tồn tại trong secret manager của môi trường; dùng OIDC workload identity thay credential dài hạn khi nền tảng hỗ trợ.
- Tách secret preview/staging/production; developer không có quyền đọc production secret chỉ để deploy.
- Rotation định kỳ và ngay khi nghi lộ; ghi owner, purpose, creation/expiry nhưng không ghi value.
- Encryption in transit dùng TLS; at rest dùng managed encryption. Field encryption chỉ thêm khi threat/data classification yêu cầu và có kế hoạch key rotation.
- `.env*`, key/certificate, document export, database dump và log bị ignore. CI chạy secret scanning; pre-commit hook là hỗ trợ, không thay server-side scan.
- Cấu hình an toàn fail-closed: thiếu auth/DB key ở production phải dừng khởi động, không fallback mock.

## 9. Audit và privacy

Audit event tối thiểu cho login/logout, auth failure, create/update/transition/delete/archive, permission change, export, attachment access, config/retention change, job replay và break-glass. Event gồm actor pseudonymous ID, action, target type/ID, outcome/reason code, request ID, timestamp, source class và diff đã redact.

- Application role chỉ append; không có API sửa/xóa audit thông thường.
- Đồng hồ đồng bộ; log/audit chuyển tới kho có retention và quyền riêng.
- Không ghi full token, cookie, password, raw authorization header, raw attachment, nội dung comment hoặc field Restricted.
- Người dùng chỉ thấy dữ liệu cần thiết; tìm kiếm không trả snippet từ record ngoài scope.
- Retention và quyền data subject do Data Owner/pháp lý xác nhận trước dữ liệu thật; demo không tự đặt policy doanh nghiệp.
- Analytics ưu tiên aggregate; không fingerprint hoặc theo dõi ngoài mục đích vận hành đã công bố.

## 10. Security trong SDLC và CI/CD

Quality gate tối thiểu:

1. lint/build/unit/integration/E2E;
2. secret scan và kiểm tra file cấm;
3. dependency audit/SCA, license policy và SBOM;
4. SAST, authorization negative tests, security-header test;
5. DAST trên staging cho luồng xác thực chính;
6. review migration/IaC/workflow bởi owner phù hợp;
7. artifact immutable, provenance/signing nếu nền tảng hỗ trợ;
8. deploy production qua protected environment, approval và workload identity.

Không chạy workflow pull request không tin cậy với production secret; tránh `pull_request_target` checkout code của fork. GitHub Actions chỉ cấp `contents: read` mặc định và mở rộng permission theo job cần thiết. Dependency/action upgrade được review như code.

## 11. Security verification trước pilot

- [ ] Inventory endpoint và permission matrix khớp API spec.
- [ ] Allow/deny/IDOR/mass-assignment tests đạt cho mọi write endpoint.
- [ ] OIDC replay, CSRF, session fixation/revoke và privilege change đã test.
- [ ] CSP/header/CORS/open redirect không có finding high.
- [ ] XSS/SQL injection/CSV injection/SSRF corpus đã chạy ở boundary liên quan.
- [ ] Attachment quarantine/scan/download authorization đạt nếu tính năng được bật.
- [ ] Log/error/audit scan không lộ secret hoặc dữ liệu ngoài allowlist.
- [ ] Rate limit, pagination/body limit, timeout và queue backpressure đã test.
- [ ] Dependency critical/high bằng 0 hoặc waiver có hạn, owner và compensating control.
- [ ] Backup restore và credential rotation/break-glass exercise có evidence.
- [ ] Data Owner xác nhận classification, retention, access review và export policy.

## 12. Ứng phó sự cố

Ưu tiên: bảo vệ con người/dữ liệu → khoanh vùng → bảo toàn evidence → thu hồi/rotate → phục hồi → hậu kiểm.

1. Triage severity và mở incident channel/ticket hạn chế quyền.
2. Thu hồi session/key bị ảnh hưởng, cô lập integration hoặc tắt feature flag; không xóa log.
3. Chụp timeline, artifact digest, audit/request ID; tránh đưa secret vào ticket/chat.
4. Vá/rollback theo runbook, kiểm chứng integrity và theo dõi tái diễn.
5. Thông báo Data Owner/pháp lý/đối tượng liên quan theo chính sách doanh nghiệp.
6. Post-incident review không đổ lỗi: nguyên nhân, control thất bại, action/owner/deadline và test ngăn tái diễn.

Nếu bí mật/tài liệu nhạy cảm từng được commit, xóa file ở commit mới là không đủ: phải rotate/revoke ngay và làm sạch lịch sử/tag/cache theo quy trình được phê duyệt.

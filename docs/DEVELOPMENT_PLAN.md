# Kế hoạch phát triển KSOps trong 12 tuần

## 1. Mục tiêu và nguyên tắc

KSOps được phát triển như một sản phẩm nội bộ mẫu cho nhóm IT Operations, tập trung vào bốn năng lực: CMDB/tài sản, sự cố và yêu cầu dịch vụ, bảo trì, và quan sát sức khỏe dịch vụ. Mục tiêu của 12 tuần là đi từ dashboard mock đến một pilot có kiểm soát; không tuyên bố production-ready nếu chưa qua security review, UAT và phê duyệt vận hành.

Nguyên tắc bắt buộc:

- **An toàn dữ liệu trước tốc độ:** chỉ dùng dữ liệu mock/synthetic trong repository và môi trường demo.
- **Server là nguồn quyết định:** xác thực, phân quyền, validation và audit phải được thực hiện phía server.
- **Increment nhỏ, có thể rollback:** mỗi pull request gắn với một backlog item, có test và phạm vi phát hành rõ.
- **API-first:** giao diện và backend cùng tuân theo contract có version.
- **Quan sát được:** mỗi luồng ghi dữ liệu có request ID, audit event, metric và thông báo lỗi có thể hành động.
- **Không tích hợp hệ thống thật trong đồ án** nếu chưa có văn bản cho phép, data owner và phương án thu hồi quyền.

## 2. Phạm vi

### Trong phạm vi pilot

- Dashboard theo vai trò với KPI tổng hợp từ dữ liệu demo.
- Danh mục tài sản/CI, loại tài sản, trạng thái, quan hệ phụ thuộc, lịch sử thay đổi.
- Incident/service request: tạo, phân loại, giao việc, bình luận, chuyển trạng thái, SLA cơ bản.
- Kế hoạch bảo trì: lịch, người phụ trách, checklist, liên kết tài sản và kết quả.
- Service health nhập tay hoặc qua adapter mock; không kết nối monitoring production.
- Knowledge base có nháp, duyệt, phiên bản và tìm kiếm.
- Xác thực SSO/OIDC ở môi trường được phê duyệt; RBAC và audit log.
- CI/CD, backup/restore drill, logging/metrics, runbook tối thiểu.

### Ngoài phạm vi 12 tuần

- Auto-discovery quét mạng, thu thập agent trên máy trạm hoặc truy cập thiết bị thật.
- Thay thế hoàn toàn ITSM/CMDB hiện hữu.
- Mobile app native, procurement, quản lý license phức tạp, billing.
- AI tự động ra quyết định hoặc thao tác hạ tầng.
- HA đa vùng, disaster recovery cấp enterprise và migration dữ liệu lịch sử đầy đủ.

## 3. Vai trò dự án và trách nhiệm

| Vai trò | Trách nhiệm chính | Quyền phê duyệt |
|---|---|---|
| Product Owner/đại diện IT | ưu tiên backlog, định nghĩa giá trị, nghiệm thu UAT | scope, acceptance |
| Tech Lead | kiến trúc, ADR, review, chất lượng phát hành | technical gate |
| Developer | implementation, test, migration, tài liệu | pull request |
| QA | test plan, regression, evidence, defect triage | quality gate |
| Security/Data Owner | threat model, dữ liệu, retention, access review | security/data gate |
| Operations | SLO, monitoring, runbook, rollback, on-call | operational readiness |

Một người có thể kiêm nhiều vai trong đồ án, nhưng checklist phê duyệt vẫn phải tách biệt để tránh tự nghiệm thu không có bằng chứng.

## 4. Nhịp làm việc

- Sprint một tuần; planning đầu tuần, daily 15 phút, demo và retrospective cuối tuần.
- Backlog refinement tối thiểu hai lần/tuần; story chỉ vào sprint khi có acceptance criteria và dependency rõ.
- Pull request mục tiêu dưới 400 dòng thay đổi logic; bắt buộc CI xanh và review.
- Quyết định kiến trúc có tác động dài hạn được ghi bằng ADR: bối cảnh, lựa chọn, hệ quả và ngày xem lại.
- Defect severity 1/2 được triage ngay; severity 3/4 đưa vào backlog có SLA xử lý.

## 5. Roadmap 12 tuần

| Tuần | Mục tiêu | Kết quả bàn giao | Điều kiện hoàn tất |
|---|---|---|---|
| 1 — Discovery | hiểu người dùng, quy trình và ranh giới dữ liệu | product brief, persona, journey, glossary, scope, risk register, baseline UI | PO xác nhận vấn đề; không đưa dữ liệu thật vào mẫu |
| 2 — Foundation | chuẩn hóa repo và kiến trúc | ADR-001, conventions, CI, environment matrix, error model, mock factory | lint/build/test chạy tự động; branch protection được cấu hình |
| 3 — Identity/RBAC | tạo nền xác thực và phân quyền | OIDC adapter, session, user/role/permission schema, middleware, access-denied UI | test deny-by-default; audit login và access failure |
| 4 — CMDB core | quản lý vòng đời tài sản | asset/type/status CRUD, list/filter/detail, validation, optimistic concurrency | CRUD integration test; lịch sử thay đổi không bị mất |
| 5 — Quan hệ CMDB | biểu diễn service dependency | CI relationships, owner/site dạng danh mục giả lập, import template, duplicate detection | chặn cycle loại quan hệ cấm; import có dry-run và error report |
| 6 — Incident/request | xử lý ticket đầu-cuối | create/assign/status/comment, priority, SLA clock, liên kết asset | workflow transition test; RBAC theo vai trò; audit đầy đủ |
| 7 — Bảo trì/tri thức | giảm sự cố lặp lại | maintenance calendar/checklist, KB draft-review-publish, search | lịch xung đột có cảnh báo; bài KB có phiên bản |
| 8 — Dashboard/health | biến dữ liệu nghiệp vụ thành tín hiệu | KPI query, service health adapter mock, filter thời gian, empty/error states | số liệu đối soát với fixture; performance budget đạt |
| 9 — Hardening | tăng độ tin cậy và bảo mật | rate limit, CSP/security headers, validation, audit review, accessibility pass | không còn finding critical/high; WCAG 2.2 AA cho luồng chính |
| 10 — System test | kiểm thử liên mô-đun và vận hành | E2E regression, load test, backup/restore drill, monitoring dashboard, runbook | exit criteria trong TEST_PLAN đạt; restore evidence hợp lệ |
| 11 — UAT/pilot | xác nhận phù hợp nghiệp vụ | UAT script/evidence, training, known limitations, go/no-go report | PO ký nghiệm thu; defect Sev-1/2 bằng 0 |
| 12 — Release/hand-off | phát hành pilot có kiểm soát | tagged release, release notes, rollback drill, operations handover, retrospective | change approval; SLO/alert owner rõ; rollback được diễn tập |

## 6. Backlog ưu tiên

Ước lượng dùng story point tương đối (1, 2, 3, 5, 8). `Must` là điều kiện pilot; `Should` chỉ làm khi Must không bị ảnh hưởng; `Could` là stretch goal.

| ID | Epic/User story | Ưu tiên | SP | Acceptance criteria rút gọn |
|---|---|---:|---:|---|
| FND-01 | Thiết lập CI và branch quality gate | Must | 2 | lint/build/test chạy trên PR; khóa merge khi thất bại |
| FND-02 | Chuẩn hóa lỗi, correlation ID và structured log | Must | 3 | mọi API trả error envelope; log không chứa secret/PII |
| IAM-01 | Đăng nhập OIDC và logout/revoke session | Must | 5 | state/nonce/PKCE; timeout; audit thành công/thất bại |
| IAM-02 | Quản trị role và permission | Must | 5 | deny-by-default; chỉ admin được cấp quyền; thay đổi có audit |
| IAM-03 | Access review định kỳ và khóa user | Should | 3 | export danh sách quyền; revoke có hiệu lực ngay |
| AST-01 | Tạo/sửa/xem tài sản | Must | 5 | validate; mã demo duy nhất; version chống lost update |
| AST-02 | Lọc, tìm kiếm và phân trang tài sản | Must | 3 | filter kết hợp; cursor ổn định; empty state |
| AST-03 | Quản lý quan hệ CI | Must | 5 | loại quan hệ hợp lệ; chặn self-reference; hiển thị dependency |
| AST-04 | Import CSV synthetic có dry-run | Should | 5 | không ghi khi dry-run; trả lỗi theo dòng; giới hạn kích thước |
| INC-01 | Tạo và phân loại incident/request | Must | 5 | required fields; priority rule; requester xem được ticket của mình |
| INC-02 | Assign và workflow transition | Must | 5 | transition matrix; conflict trả 409; audit actor/time |
| INC-03 | Bình luận nội bộ/công khai | Must | 3 | phân biệt visibility; sanitize nội dung; không render HTML tùy ý |
| INC-04 | SLA policy và breach indicator | Should | 5 | clock theo calendar cấu hình; pause/resume có lý do |
| MNT-01 | Lập lịch và checklist bảo trì | Must | 5 | liên kết CI; timezone rõ; ghi kết quả và evidence metadata |
| KB-01 | Vòng đời bài tri thức | Should | 5 | draft → review → published → archived; revision immutable |
| HLT-01 | Adapter service health mock | Must | 3 | timeout/fallback; freshness hiển thị; không gọi hạ tầng thật |
| DSH-01 | KPI theo role và time range | Must | 5 | query được test; cache invalidation; không lộ dữ liệu ngoài scope |
| NFR-01 | Accessibility luồng chính | Must | 3 | keyboard, focus, label, contrast; axe không có serious/critical |
| NFR-02 | Audit trail chống sửa bằng ứng dụng | Must | 5 | append-only ở application role; filter/export có phân quyền |
| NFR-03 | Backup, restore và retention | Must | 3 | restore drill; RPO/RTO pilot được xác nhận |
| NFR-04 | Monitoring, alert và runbook | Must | 5 | golden signals; alert có owner; link runbook |
| SEC-01 | Security headers/rate limiting/input validation | Must | 5 | test tự động; finding critical/high bằng 0 |
| REL-01 | Preview, staging, production promotion | Must | 3 | cùng artifact; config ngoài code; approval và rollback |

## 7. Definition of Ready và Definition of Done

### Definition of Ready

- user story nêu rõ actor, nhu cầu và giá trị;
- acceptance criteria kiểm thử được, có mock/UX state cần thiết;
- dữ liệu classification, quyền truy cập và audit event đã xác định;
- API/schema dependency và migration impact đã được làm rõ;
- estimate, owner và tiêu chí rollout/rollback có sẵn.

### Definition of Done

- code đã review, không còn TODO ẩn và CI xanh;
- unit/integration/E2E theo risk đều đạt, evidence đính kèm PR;
- authorization test có cả allow và deny; input/output được validate;
- accessibility, responsive, loading/empty/error states được kiểm tra;
- migration tiến/lùi hoặc phương án forward-fix đã diễn tập trên staging;
- telemetry, audit, runbook và tài liệu người dùng được cập nhật;
- không có secret, dữ liệu thật, tài liệu nguồn hay ảnh nội bộ trong diff;
- acceptance criteria được PO/QA xác nhận.

## 8. Môi trường và chiến lược phát hành

| Môi trường | Dữ liệu | Mục đích | Quyền |
|---|---|---|---|
| Local | fixture synthetic | phát triển | developer |
| Preview/PR | fixture tái tạo | review UI/logic | nhóm dự án |
| Staging | dataset synthetic gần production về quy mô | integration, security, UAT | nhóm được chỉ định |
| Production pilot | dữ liệu tối thiểu được data owner phê duyệt | pilot giới hạn | least privilege, MFA/SSO |

Luồng phát hành: merge sau quality gate → tạo immutable artifact → deploy staging → smoke test/migration check → phê duyệt change → promote cùng artifact → canary hoặc feature flag → theo dõi → đóng change. Rollback khi error rate/SLO vượt ngưỡng, migration thất bại, audit thiếu hoặc có dấu hiệu lộ dữ liệu.

Version theo Semantic Versioning khi có API công khai. Database migration phải backward-compatible trong cửa sổ rollout; ưu tiên expand → migrate → contract, không xóa cột trong cùng release với thay đổi code.

## 9. Chỉ số thành công

Baseline được đo ở tuần 1, target pilot được PO xác nhận trước tuần 3:

- lead time từ ticket đến production và deployment frequency;
- change failure rate, mean time to restore, rollback success rate;
- tỷ lệ incident được phân loại đúng, first response SLA, resolution SLA;
- độ đầy đủ của CI bắt buộc trong CMDB và tỷ lệ record trùng;
- task completion rate và thời gian hoàn thành trong UAT;
- accessibility serious/critical issue, escaped defect và security finding;
- tỷ lệ log có correlation ID và audit event hợp lệ.

Không dùng vanity metrics (số dòng code, số commit) để đánh giá hiệu quả thực tập.

## 10. Rủi ro và phương án xử lý

| Rủi ro | Khả năng/Tác động | Giảm thiểu | Trigger/owner |
|---|---|---|---|
| Scope phình nhanh | cao/cao | đóng scope Must; change control; demo hàng tuần | sprint spillover >20% / PO |
| Dữ liệu thật lọt vào repo | thấp/rất cao | ignore pattern, secret scan, fixture factory, review diff | detector/reviewer báo / Security |
| RBAC chỉ ẩn UI | vừa/rất cao | policy server-side; deny tests; permission matrix | endpoint thiếu guard / Tech Lead |
| Schema thay đổi gây mất dữ liệu | vừa/cao | migration review, backup, expand-contract, restore drill | destructive SQL / DBA owner |
| Vendor/hosting lock-in | vừa/vừa | ports/adapters, export chuẩn, ADR | adapter logic lan vào domain / Tech Lead |
| Dashboard sai số | vừa/cao | metric definition, reconciliation test, freshness label | lệch fixture >0 / QA |
| Thiếu thời gian test/UAT | cao/cao | shift-left, test theo risk, code freeze tuần 10 | defect backlog tăng / PO+QA |
| Tích hợp ngoài mất ổn định | vừa/vừa | mock, timeout, retry có jitter, circuit breaker | error budget vượt / Ops |

## 11. Tiêu chí go/no-go pilot

Chỉ **go** khi đồng thời thỏa:

- toàn bộ Must story hoàn tất hoặc có waiver được PO, Security và Ops ký;
- CI, regression, UAT và restore drill đạt; Sev-1/2 bằng 0;
- không có lỗ hổng critical/high chưa xử lý; RBAC negative tests đạt;
- monitoring, alert owner, runbook, support window và rollback owner rõ ràng;
- retention, backup, data owner và access review được phê duyệt;
- limitations và phạm vi pilot đã truyền thông cho người dùng.

**No-go** nếu thiếu bằng chứng phân quyền, có dữ liệu không rõ nguồn, không thể rollback/restore hoặc dashboard tạo quyết định từ số liệu chưa được đối soát.

## 12. Sản phẩm bàn giao cuối kỳ

- source code và lịch sử pull request có thể truy vết backlog;
- kiến trúc/ADR, API contract, schema/migration và threat model;
- automated test, UAT evidence, performance/security report;
- CI/CD config, environment inventory không chứa secret;
- runbook deploy/rollback/backup/restore/incident response;
- release notes, known limitations, training ngắn và kế hoạch 90 ngày tiếp theo.

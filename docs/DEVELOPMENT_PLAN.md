# Kế hoạch pilot KSOps Transport Control trong 12 tuần

> **Phạm vi:** đây là kế hoạch cho một lát cắt pilot, không phải kế hoạch hoàn thiện toàn bộ hệ thống doanh nghiệp. Lộ trình mục tiêu 12–15 tháng, operating model, kiến trúc đa kênh, effort và các gate mở rộng nằm trong [KSOps Enterprise Blueprint](ENTERPRISE_BLUEPRINT.md). Ma trận quyền mục tiêu nằm tại [RBAC_MATRIX.md](RBAC_MATRIX.md).

## Vị trí trong chương trình 12–15 tháng

| Blueprint | Phần được thực hiện trong 12 tuần | Phần chủ động để sau pilot |
|---|---|---|
| Discovery và baseline | process map, glossary, data map, KPI baseline và pilot boundary | discovery cho toàn bộ chi nhánh và migration lịch sử đầy đủ |
| Foundation | IAM/RBAC spike, master data, audit, CI/CD, observability, DB/outbox design | hardening ở quy mô toàn công ty và automated provisioning hoàn chỉnh |
| Operations pilot | fleet/driver, cargo order, dispatch/trip, maintenance gate, booking/contract slice | rollout diện rộng, driver native app và tối ưu điều phối |
| Transactional production | payment/GPS/ERP chỉ ở contract/mock/sandbox khi được duyệt | payment/COD/e-invoice/ERP production, telemetry diện rộng và financial close đầy đủ |
| Data/optimization | metric contract và read model tối thiểu | warehouse, forecast, predictive maintenance và route optimizer |

12 tuần nhằm trả lời ba câu hỏi: quy trình mục tiêu có đúng không, invariant an toàn/giao dịch có chứng minh được không và tổ chức có sẵn sàng chạy pilot giới hạn không. Kết thúc tuần 12 chưa đồng nghĩa production-ready hoặc thay thế hệ thống hiện hữu.

## 1. Mục tiêu

KSOps được phát triển như một sản phẩm nội bộ mẫu cho doanh nghiệp vận tải hành khách, hàng hóa và thuê xe. Mục tiêu 12 tuần là đi từ prototype dùng dữ liệu synthetic tới **bằng chứng sẵn sàng cho một pilot giới hạn**. Chỉ được dùng dữ liệu/tích hợp pilot sau khi có UAT, security/privacy review, phê duyệt Data Owner và operational readiness; nếu các gate chưa đạt thì bàn giao vẫn là prototype/sandbox.

Năng lực trọng tâm:

1. nguồn dữ liệu thống nhất cho xe, tài xế, khách hàng và tuyến;
2. vòng đời đơn hàng hóa từ tiếp nhận đến giao/đối soát;
3. điều phối xe, tài xế, ghế/tải và chuyến đi không xung đột;
4. đặt vé hành khách và pipeline thuê xe hợp đồng;
5. bảo dưỡng theo lịch/km và kiểm soát hồ sơ bắt buộc;
6. doanh thu, công nợ, hiệu suất và audit có thể truy vết.

Nguyên tắc: dữ liệu an toàn trước tốc độ; server quyết định authorization; API versioned; thay đổi nhỏ có rollback; không tích hợp GPS, vé, thanh toán hay kế toán thật khi chưa được phê duyệt.

## 2. Phạm vi pilot

Pilot phải được giới hạn bằng `region/branch/route/fleet/user cohort/time window` và có owner cụ thể. Con số, tuyến và chi nhánh không được chọn theo suy đoán từ website công khai; Product Owner quyết định sau khi đo volume, rủi ro và khả năng hỗ trợ. Khuyến nghị bắt đầu với một tuyến/nhóm văn phòng, 10–20 xe và nhóm người dùng được đào tạo, sau đó shadow 2–4 tuần trước cutover.

### Trong phạm vi

- Fleet master: xe, loại xe, sức chứa/tải, trạng thái, giấy tờ và lịch sử.
- Driver master: hồ sơ tối thiểu, loại bằng, availability, ca làm và cảnh báo tuân thủ.
- Cargo order: người gửi/nhận đã giảm thiểu dữ liệu, kiện hàng, trọng lượng/thể tích, tuyến, SLA, COD tokenized reference.
- Dispatch/trip: xe, tài xế, tuyến, thời gian, capacity, manifest và conflict detection.
- Passenger booking: lịch chuyến, seat inventory, giữ ghế có TTL, booking/cancel/refund status.
- Contract rental: yêu cầu báo giá, loại xe, đoàn, lịch, quotation, approval và contract status.
- Maintenance: work order, lịch/km trigger, checklist, phụ tùng, downtime và nghiệm thu.
- CRM/billing/reporting: khách hàng, hóa đơn/công nợ, KPI, export có phân quyền.
- OIDC/SSO, RBAC, audit, observability, backup/restore và CI/CD.

### Ngoài phạm vi 12 tuần

- thay thế toàn bộ hệ thống bán vé/kế toán/ERP hiện hữu;
- xử lý trực tiếp dữ liệu thẻ hoặc tự xây ví điện tử;
- điều khiển xe, auto-discovery thiết bị hoặc quyết định điều phối bằng AI;
- tối ưu tuyến thời gian thực cấp bản đồ/GPS production;
- mobile native, multi-region active-active và migration lịch sử toàn phần.

## 3. Nhân sự và trách nhiệm

| Vai trò | Trách nhiệm | Gate sở hữu |
|---|---|---|
| Product Owner vận tải | ưu tiên backlog, chính sách dịch vụ, nghiệm thu | scope/UAT |
| Điều phối trưởng | quy tắc ca/chuyến, capacity, exception | vận hành |
| Đại diện phòng vé/hàng hóa | booking/order journey, đối soát nghiệp vụ | acceptance |
| Tech Lead | kiến trúc, ADR, review, release | technical |
| Developer | code, test, migration, telemetry, tài liệu | pull request |
| QA | test plan, regression, UAT evidence | quality |
| Security/Data Owner | threat model, privacy, retention, access review | security/data |
| Operations/SRE | SLO, alert, backup, runbook, rollback | production readiness |

Một người có thể kiêm nhiều vai trong đồ án, nhưng bằng chứng phê duyệt phải tách để tránh tự nghiệm thu.

## 4. Nhịp triển khai

- Sprint một tuần; planning đầu tuần, daily 15 phút, demo/retro cuối tuần.
- Refinement ít nhất hai lần/tuần; story chỉ vào sprint khi có acceptance criteria, data classification và dependency.
- Pull request mục tiêu dưới 400 dòng logic; CI xanh và ít nhất một review.
- ADR cho quyết định dài hạn; risk register và dependency map xem lại hằng tuần.
- Sev-1/2 triage ngay; code freeze trước UAT và release.

## 5. Roadmap 12 tuần

| Tuần | Mục tiêu | Bàn giao | Exit criteria |
|---|---|---|---|
| 1 — Discovery | xác minh hành trình đơn/vé/hợp đồng/điều phối | product brief, persona, service blueprint, glossary, data map, baseline KPI | PO và Data Owner xác nhận scope; không dùng dữ liệu thật trong prototype |
| 2 — Foundation | chuẩn hóa repo và architecture runway | ADR-001 modular monolith, conventions, CI, environment matrix, error model, mock factory | lint/type/build/test/audit tự động; branch protection |
| 3 — Identity & master data | nền danh tính và dữ liệu gốc | OIDC spike, session, user-role-permission, vehicle/driver/customer schema | deny-by-default; uniqueness/validation; login/access audit |
| 4 — Fleet & maintenance | quản lý năng lực đội xe | vehicle lifecycle, document alerts, maintenance schedule/work order | history không mất; xe quá hạn bị chặn dispatch theo policy |
| 5 — Cargo order | tiếp nhận và xử lý đơn hàng | create/quote/confirm, parcel dimensions, pricing snapshot, status history | idempotency; validation; PII masked; transition tests |
| 6 — Dispatch | ghép đơn/chuyến/xe/tài xế | trip board, capacity, assignment, manifest, conflict rules | chặn trùng xe/tài xế; optimistic concurrency; audit đầy đủ |
| 7 — Passenger & contract | mở rộng kênh dịch vụ | seat inventory/hold/booking; quotation/contract workflow | chống bán trùng ghế; hold expiry; approval matrix |
| 8 — Billing & CRM | đóng vòng doanh thu | invoice/payment reference, receivable, customer timeline, complaint link | đối soát theo order/trip; không lưu dữ liệu thẻ |
| 9 — Reporting & hardening | KPI đáng tin và giảm rủi ro | metric definitions, dashboards, CSP, rate limit, privacy/accessibility pass | đối soát fixture; không finding critical/high |
| 10 — System readiness | kiểm thử liên mô-đun và DR | E2E, contract/load test, backup/restore, monitoring, runbooks | test exit criteria đạt; restore evidence hợp lệ |
| 11 — UAT & pilot prep | xác nhận phù hợp nghiệp vụ | UAT script/evidence, training, support model, go/no-go report | Sev-1/2 bằng 0; PO/Ops/Security chấp thuận |
| 12 — Release & handover | phát hành pilot giới hạn | tagged release, release notes, canary, rollback drill, handover | SLO/owner rõ; change approved; rollback diễn tập |

### Gate sau tuần 12

Kết quả tuần 12 chỉ được chuyển sang rollout tiếp theo khi:

- Product/Ops xác nhận critical journey phù hợp và UAT đạt;
- Security/Data/Legal xác nhận scope dữ liệu, retention, quyền và integration;
- RBAC negative test, concurrency, reconciliation, migration và restore evidence đạt;
- support window, alert/runbook/incident owner và rollback owner rõ;
- shadow mode không có sai lệch vượt tolerance đã duyệt;
- không còn Sev-1/2 hoặc security critical/high.

Nếu chưa đạt, tiếp tục sandbox/hardening; không đổi nhãn thành production để chạy kịp thời hạn thực tập.

## 6. Backlog ưu tiên

Ước lượng dùng story point tương đối. `Must` là điều kiện pilot, `Should` làm sau Must, `Could` là stretch goal.

| ID | Epic/User story | Ưu tiên | SP | Acceptance rút gọn |
|---|---|---:|---:|---|
| FND-01 | CI và branch quality gate | Must | 2 | check/build/audit trên PR; block merge khi lỗi |
| FND-02 | error envelope, request ID, structured log | Must | 3 | mọi API có requestId; log redact PII/secrets |
| IAM-01 | OIDC login/logout/session revoke | Must | 5 | state/nonce/PKCE; idle/absolute timeout; audit |
| IAM-02 | role/permission/data scope | Must | 5 | policy server-side; deny test; access review |
| FLT-01 | CRUD và lifecycle xe | Must | 5 | mã duy nhất; history/version; archive an toàn |
| FLT-02 | giấy tờ và cảnh báo hết hạn | Must | 3 | reminder; policy chặn dispatch cấu hình được |
| DRV-01 | hồ sơ, bằng lái, ca và availability | Must | 5 | qualification theo loại xe; không trùng ca |
| MNT-01 | lịch/km trigger và work order | Must | 5 | checklist/version/evidence; downtime cập nhật fleet |
| ORD-01 | tạo và báo giá đơn hàng hóa | Must | 5 | cân/đo; declared value; prohibited-item acknowledgement |
| ORD-02 | workflow nhận–xếp–đang đi–đến–giao | Must | 5 | transition matrix; actor/time/reason audit |
| ORD-03 | POD và exception/claim | Should | 5 | attachment scanned; signed URL; retention |
| DSP-01 | tạo chuyến và phân công | Must | 5 | vehicle/driver conflict; capacity; version check |
| DSP-02 | manifest hàng/khách | Must | 5 | scope theo chuyến; check-in/load/unload audit |
| DSP-03 | ETA và adapter GPS mock | Should | 5 | freshness/fallback; no raw coordinates in broad logs |
| BKG-01 | lịch chuyến và inventory ghế | Must | 5 | hold TTL; atomic booking; no double sale |
| BKG-02 | cancel/refund state | Must | 5 | policy snapshot; payment reference; idempotent callback |
| CTR-01 | yêu cầu báo giá thuê xe | Must | 3 | route/date/fleet need; duplicate detection |
| CTR-02 | quotation approval và contract | Should | 5 | versioned quotation; approval threshold; audit |
| CRM-01 | customer 360 tối thiểu | Should | 5 | masking; purpose/consent; order/booking timeline |
| BIL-01 | invoice, receivable, payment reference | Must | 5 | immutable line snapshot; reconciliation job |
| REP-01 | KPI đúng giờ/utilization/revenue | Must | 5 | định nghĩa metric; fixture reconciliation; freshness |
| NFR-01 | accessibility responsive | Must | 3 | keyboard/focus/labels/contrast; WCAG 2.2 AA luồng chính |
| NFR-02 | append-only audit và export control | Must | 5 | không update/delete bằng app role; export có scope |
| NFR-03 | backup/restore/retention | Must | 3 | restore drill; RPO/RTO phê duyệt |
| SEC-01 | validation/rate limit/security headers | Must | 5 | test tự động; critical/high bằng 0 |
| REL-01 | preview→staging→production promotion | Must | 3 | same artifact; approval; rollback/canary |

## 7. Quy tắc nghiệp vụ tối thiểu

- Một xe/tài xế không được gán vào hai chuyến có khoảng thời gian chồng lấn.
- Xe ở trạng thái bảo dưỡng, khóa hoặc giấy tờ hết hạn không được xuất bến.
- Tổng ghế/tải đã gán không vượt capacity; override cần permission, reason và audit.
- Booking ghế phải atomically đổi `available → held → booked`; hold tự hết hạn.
- Mỗi đơn/chuyến/hóa đơn có public code riêng, không dùng database ID để lộ quy mô.
- Giá/cước được snapshot tại thời điểm xác nhận; bảng giá thay đổi không sửa lịch sử.
- Chuyển trạng thái chỉ theo transition matrix, mọi exception có reason code.
- Payment callback và create order bắt buộc idempotency.
- PII hiển thị theo role và masked mặc định; export là sự kiện bảo mật.

## 8. Definition of Ready/Done

### Ready

- actor, giá trị, acceptance criteria và edge cases rõ;
- data classification, legal basis/purpose, permission và audit event được xác định;
- API/schema/migration/integration dependency đã được làm rõ;
- estimate, owner, rollout/rollback và observability acceptance có sẵn.

### Done

- code review, CI xanh, không TODO ẩn;
- unit/integration/contract/E2E theo rủi ro đều đạt;
- authorization có allow/deny; validation runtime ở boundary;
- loading/empty/error/responsive/a11y được kiểm tra;
- migration backward-compatible hoặc forward-fix diễn tập;
- telemetry/audit/runbook/user docs được cập nhật;
- diff không có secret, PII, vé/biển số/hành trình thật;
- PO/QA xác nhận acceptance.

## 9. Môi trường và release

| Môi trường | Dữ liệu | Mục đích | Quyền |
|---|---|---|---|
| Local | fixture synthetic | phát triển | developer |
| Preview | fixture tái tạo | review UI/logic | nhóm dự án |
| Staging | synthetic gần production về quy mô | integration, security, UAT | nhóm chỉ định |
| Pilot | dữ liệu tối thiểu được phê duyệt | người dùng giới hạn | least privilege + SSO/MFA |

Luồng: merge sau gate → artifact bất biến → deploy staging → migration/smoke → change approval → promote cùng digest → canary/feature flag → quan sát → đóng change. Rollback khi error budget vượt, migration lỗi, audit thiếu, số liệu lệch hoặc có dấu hiệu lộ dữ liệu.

## 10. KPI và SLO đề xuất

| Nhóm | Chỉ số pilot |
|---|---|
| Vận hành | chuyến đúng giờ, utilization, empty-mile, capacity conflict, maintenance compliance |
| Hàng hóa | first scan, delivery SLA, exception/claim, failed delivery, COD reconciliation |
| Hành khách | search→booking conversion, hold expiry, double-booking = 0, cancel/refund time |
| Hợp đồng | quote lead time, win rate, fleet fulfillment, approval time |
| Kỹ thuật | availability 99,5%, API read p95 < 500ms, write p95 < 800ms, valid error rate < 1% |
| Phục hồi | pilot RPO 24 giờ, RTO 4 giờ; phải xác nhận bằng restore drill |

Các mục tiêu trên là gate pilot giới hạn. Khi có giao dịch production, blueprint đề xuất hướng tới API lõi 99,9%, booking/payment 99,95% trong giờ bán, RPO giao dịch lõi ≤5 phút và RTO ≤60 phút sau khi đo baseline và được Product/Engineering/SRE cùng phê duyệt. Không dùng số dòng code/commit làm KPI thực tập.

## 11. Rủi ro

| Rủi ro | Mức | Giảm thiểu | Trigger/owner |
|---|---|---|---|
| Scope phình | cao | đóng Must, change control, demo tuần | spillover >20% / PO |
| Dữ liệu thật lọt repo | rất cao | ignore/secret scan/fixture/review | detector/reviewer / Security |
| Bán trùng ghế/over-capacity | rất cao | transaction, unique constraint, concurrency test | conflict rate >0 / Tech Lead |
| Trùng xe/tài xế | rất cao | overlap constraint/policy, versioning | dispatch conflict / Ops |
| PII bị lộ qua log/export | rất cao | masking, purpose scope, audit, DLP | privacy alert / Data Owner |
| Giá/công nợ sai | cao | immutable snapshot, reconciliation, maker-checker | mismatch >0 / Finance |
| GPS/tích hợp mất ổn định | vừa | adapter, freshness, timeout, circuit breaker | stale/error budget / Ops |
| Migration gây downtime | cao | expand-migrate-contract, backup, rollback | destructive SQL / Tech Lead |
| Dashboard sai số | cao | metric contract, reconciliation fixture | mismatch >0 / QA |
| Thiếu UAT | cao | shift-left, code freeze, risk-based test | defect backlog / PO+QA |

## 12. Go/no-go và bàn giao

Chỉ `go` khi Must stories hoàn tất hoặc có waiver đủ PO/Security/Ops; regression/UAT/restore đạt; Sev-1/2 và critical/high bằng 0; RBAC/concurrency/reconciliation tests đạt; support window, alert owner, rollback owner, retention và data owner rõ.

`No-go` khi không chứng minh được chống trùng ghế/chuyến, thiếu authorization/audit, dữ liệu không rõ nguồn, không restore/rollback được hoặc dashboard chưa đối soát.

Bàn giao cuối kỳ gồm source/history PR, ADR/architecture/API/schema, migration, threat model, automated test/UAT evidence, CI/CD, environment inventory không chứa secret, runbook deploy/rollback/backup/incident, release notes, known limitations và kế hoạch 90 ngày.

## 13. Sau pilot

Thứ tự ưu tiên sau gate 12 tuần:

1. chạy shadow 2–4 tuần và đóng mọi reconciliation/privacy/support gap;
2. production hóa passenger booking, cargo scan/POD/COD và payment/refund theo từng capability;
3. hoàn thiện contract, maintenance/parts, settlement và e-invoice/ERP;
4. tích hợp telemetry qua lớp chuẩn hóa, không gắn domain trực tiếp với một provider;
5. xây warehouse/BI và rollout theo chi nhánh;
6. chỉ triển khai optimization/ML khi metric contract, data quality và human approval/kill switch đã đạt.

Mỗi bước tuân theo gate G2–G5 trong [Enterprise Blueprint](ENTERPRISE_BLUEPRINT.md), không triển khai big-bang.

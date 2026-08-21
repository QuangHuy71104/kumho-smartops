# Ma trận phân quyền KSOps

## 1. Trạng thái và mục tiêu

Bản demo hiện tại **chưa có authentication hoặc RBAC thật**. Bộ chuyển 8 vai trò chỉ lọc navigation và chặn thao tác synthetic ở phía client; mọi dữ liệu/thao tác vẫn chỉ tồn tại trong trình duyệt. Tài liệu này là mô hình quyền mục tiêu cho pilot/doanh nghiệp; không được hiểu rằng repository đã thực thi authorization production ở API, database hoặc integration boundary.

Mục tiêu authorization:

- role xác định người dùng được làm loại công việc nào;
- scope giới hạn vùng, chi nhánh, tuyến, đội xe và office nào;
- attribute giới hạn theo ca, chuyến được giao, ownership, trạng thái và mức rủi ro;
- maker–checker tách người tạo khỏi người phê duyệt đối với hành động nhạy cảm;
- mọi quyết định được kiểm tra ở server và ghi audit, không chỉ ẩn menu ở UI.

Samsara dùng role theo chức năng kết hợp tag để giới hạn quyền trên tài xế, phương tiện và thiết bị theo vùng/đơn vị; quyền đặc quyền yêu cầu MFA hoặc SSO. KSOps áp dụng cùng tư duy nhưng dùng scope nghiệp vụ riêng. [Nguồn chính thức: Samsara Administrative Roles](https://kb.samsara.com/hc/en-us/articles/4411870638733-Administrative-Roles), [Custom Roles](https://kb.samsara.com/hc/en-us/articles/360043852111-Custom-Roles).

## 2. Mô hình policy

```text
ALLOW khi và chỉ khi:
  principal đã xác thực
  AND role có resource:action
  AND resource nằm trong data scope hiệu lực
  AND điều kiện ABAC đạt
  AND không vi phạm hard safety invariant/explicit deny
  AND approval đã hoàn tất nếu action yêu cầu maker–checker
```

Thứ tự đánh giá:

1. xác thực session/service identity và trạng thái tài khoản;
2. lấy role/scope server-side từ IAM mapping, không tin claim do browser tự gửi;
3. deny-by-default nếu thiếu permission hoặc scope;
4. tải resource hiện tại và kiểm tra object-level authorization;
5. kiểm tra state transition, risk threshold, shift/assignment và safety policy;
6. yêu cầu re-authentication/approval nếu cần;
7. thực thi transaction và ghi business event + audit cùng kết quả;
8. lọc/mask field của response theo quyền đọc dữ liệu.

Nhiều role có thể cộng quyền, nhưng mỗi assignment giữ scope riêng. Không được dùng một role scope toàn công ty để vô tình mở rộng role khác. Explicit deny và safety block luôn ưu tiên allow.

## 3. Quy ước ma trận

| Ký hiệu | Ý nghĩa |
|---|---|
| `—` | không có quyền |
| `R` | đọc dữ liệu đã mask trong scope |
| `W` | tạo/cập nhật workflow trong scope, bao gồm `R` |
| `A` | phê duyệt/publish/sign-off theo policy, bao gồm quyền đọc cần thiết |
| `M` | quản trị cấu hình module, không mặc nhiên có PII hoặc quyền tài chính |
| `O` | chỉ dữ liệu của chính mình/chuyến được giao |

`W` không cho phép sửa giá/lịch sử/audit tùy ý. Các hành động nhạy cảm luôn tham chiếu bảng maker–checker ở phần 8.

## 4. Danh mục role

| Role ID | Người dùng điển hình | Scope mặc định | Không được cấp mặc định |
|---|---|---|---|
| `platform-admin` | kỹ sư nền tảng trực production | environment/service, không business data | PII khách, refund, settlement, giá |
| `identity-security-admin` | IAM/Security | organization cho user/role; audit security | sửa đơn/vé/chuyến/tài chính |
| `operations-manager` | trưởng điều hành/khai thác | region hoặc toàn đơn vị được giao | quản trị IAM, settlement tài chính |
| `dispatcher` | điều phối viên theo ca | region/branch/route + ca | bảng giá, refund, role admin |
| `branch-manager` | quản lý bến/văn phòng | branch/office | cấu hình toàn công ty, audit security đầy đủ |
| `ticket-agent` | nhân viên bán vé/quầy | office/route/shift | bulk export, giá publish, refund lớn |
| `cargo-agent` | nhân viên tiếp nhận hàng | office/route/shift | settlement, quyền ngoài đơn phụ trách |
| `warehouse-operator` | kho/bốc xếp/scan | office/trip/shift | customer history, giá, finance |
| `contract-sales` | kinh doanh/CSKH hợp đồng | region/account được giao | tự duyệt discount/hợp đồng vượt ngưỡng |
| `driver-conductor` | tài xế/phụ xe | `own` + `assigned-trip` | fleet/customer history, finance, bulk manifest ngoài chuyến |
| `maintenance-manager` | trưởng kỹ thuật | workshop/region/fleet | dispatch thương mại, refund/settlement |
| `mechanic` | kỹ thuật viên | workshop + work order được giao | tự phê duyệt release nếu policy tách người |
| `finance-operator` | kế toán viên/thu ngân | legal entity/branch/ledger | tự approve giao dịch do mình tạo |
| `finance-approver` | kế toán trưởng/người duyệt | legal entity/threshold được giao | IAM/platform admin |
| `auditor-compliance` | kiểm toán/tuân thủ | thời gian, entity và purpose được duyệt | mutation nghiệp vụ, xóa/sửa audit |
| `executive-reader` | ban điều hành | aggregate toàn công ty | raw PII, raw GPS, mutation |
| `customer-user` | hành khách/người gửi/khách doanh nghiệp | `own` hoặc corporate account | dữ liệu nội bộ/đơn của người khác |
| `partner-service` | đại lý/provider/integration | OAuth scope + resource allowlist | UI/admin, scope ngoài contract |

Role chức danh chỉ là template. Quyền thực tế phải được quản lý như role assignment có owner, scope, thời điểm bắt đầu/hết hạn và lý do.

## 5. Ma trận vận hành

| Resource/module | Ops manager | Dispatcher | Branch manager | Ticket agent | Cargo agent | Warehouse | Contract sales | Driver | Maint. manager | Mechanic |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Dashboard vận hành | R | R | R | R | R | R | R | O | R | O |
| Route/schedule | A | W | R | R | R | R | R | O | R | O |
| Trip/dispatch | A | W | W | R | R | W theo manifest | R | O | R | O |
| Assignment xe/tài xế | A | W | W theo branch | — | — | — | — | O xác nhận | R/block | — |
| Fleet master | R | R | R | — | R tối thiểu | O | R tối thiểu | O | W | W kỹ thuật |
| Driver/shift | R | W theo ca | R | — | — | — | — | O | R | — |
| Passenger booking | R tổng hợp | R manifest | W theo branch | W | — | — | R theo contract | O manifest | — | — |
| Passenger PII | R khi có purpose | R chuyến active | W theo branch | W giao dịch | — | — | R account được giao | O tối thiểu | — | — |
| Cargo order | R | R manifest | W theo branch | — | W | W scan/load | R account được giao | O manifest | — | — |
| Cargo recipient PII | R khi có purpose | R chuyến active | W theo branch | — | W giao dịch | R tối thiểu | R account được giao | O giao nhận | — | — |
| POD/claim | R | R | W | — | W | W evidence | W case được giao | O evidence | R claim kỹ thuật | R evidence kỹ thuật |
| Rental request/quote | R | R nhu cầu | W theo branch | R | R | — | W | O trip | R capacity | — |
| Maintenance/inspection | R | R block | R | — | — | R defect | R trạng thái | O inspection | A/M | W |
| Exception/incident | A | W | W | W dịch vụ | W hàng hóa | W hiện trường | W khách hàng | O | W kỹ thuật | W được giao |
| Operational report | R | R scope | R | R scope | R scope | R tối thiểu | R scope | O | R scope | O |

Điều phối viên có thể thay assignment trong scope nhưng không thể vượt hard safety invariant. `operations-manager` chỉ phê duyệt override mềm đã được policy cho phép; xe blocked, qualification không hợp lệ hoặc double booking không được override.

## 6. Ma trận thương mại và tài chính

| Resource/module | Branch manager | Ticket agent | Cargo agent | Contract sales | Finance operator | Finance approver | Ops manager | Auditor | Executive |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Customer/CRM masked | W scope | W giao dịch | W giao dịch | W account | R khi cần đối soát | R | R | R purpose-bound | R aggregate |
| PII reveal | A theo branch/purpose | W giao dịch active | W giao dịch active | W account/case | R tối thiểu | R tối thiểu | R incident | R theo mandate | — |
| Tariff/rate draft | R | R | R | W proposal | W | A/publish cùng business owner | R | R | R aggregate |
| Booking payment ref | R | W ghi nhận kênh được phép | — | — | W/reconcile | A exception | R trạng thái | R | R aggregate |
| Cargo COD | R | — | W nhận/ref | R account | W/reconcile | A exception/close | R trạng thái | R | R aggregate |
| Invoice/receivable | R scope | R giao dịch | R giao dịch | R account | W | A | R aggregate | R | R aggregate |
| Refund/adjustment | A trong ngưỡng branch | W request/policy nhỏ | W request claim | W request | W prepare | A | R incident | R | R aggregate |
| Contract quote | R | — | — | W | R tài chính | A ngưỡng tài chính | A năng lực | R | R aggregate |
| Contract acceptance | A branch theo policy | — | — | W request | R | A nếu có credit/risk | A năng lực | R | R aggregate |
| Settlement/daily close | R | W cashier close request | W counter close request | R | W prepare | A/close | R | R | R aggregate |
| Financial report/export | R scope | R ca/quầy | R ca/quầy | R account | W scope | A | R aggregate | R mandate | R aggregate |

Ngưỡng tiền/discount/refund/credit không hard-code trong tài liệu; Finance và Business Owner cấu hình bằng policy có phiên bản, hiệu lực và approval.

## 7. Ma trận quản trị hệ thống

| Resource/action | Platform admin | Identity/Security admin | Product/Ops owner | Finance approver | Auditor | Executive |
|---|---:|---:|---:|---:|---:|---:|
| Environment/deployment | M | R security | R release | — | R evidence | — |
| Secrets/service identity | M rotate | A policy/review | — | — | R metadata, không secret | — |
| User lifecycle | R technical | M | A business need | — | R | — |
| Role template | R implementation | M | A business permission | C finance roles | R | — |
| Role assignment | — trừ break-glass | W prepare | A scope owner | A finance scope | R | — |
| Integration config | M technical | A security | A business owner | A financial integration | R metadata | — |
| Feature/config flag | M deploy | R | A business behavior | A nếu ảnh hưởng finance | R | R status |
| Audit security | R vận hành | M/R | R business events | R financial events | R mandate | R aggregate |
| Audit mutation/delete | — | — | — | — | — | — |
| Retention/purge execution | W job | A control | A data owner | A finance retention | R evidence | — |
| Bulk export config | R technical | A security | A data owner | A financial data | R policy | — |
| Backup/restore | M | R security | I | I | R evidence | I |

`platform-admin` có quyền vận hành hạ tầng nhưng không mặc nhiên đọc dữ liệu nghiệp vụ. Truy cập break-glass phải time-boxed, MFA/re-authentication, ticket/incident reference, session recording hoặc enhanced audit và review sau sử dụng.

## 8. Hành động nhạy cảm và maker–checker

| Hành động | Maker | Checker/approver | Điều kiện |
|---|---|---|---|
| Cấp role/scope | Identity admin | scope owner; Security cho quyền đặc quyền | không tự duyệt, có expiry và access review |
| Tạo/publish bảng giá | Finance operator hoặc business analyst | Finance approver + Business Owner | revision bất biến, effective date, impact preview |
| Refund/adjustment | ticket/cargo/finance operator | finance/branch approver theo ngưỡng | policy snapshot, payment match, reason và audit |
| COD discrepancy close | cargo/finance operator | finance approver | evidence, counter/route close reconciliation |
| Quote discount/credit | contract sales | Finance + business approver theo ngưỡng | quotation revision, không sửa bản đã gửi |
| Assignment override mềm | dispatcher | operations manager | conflict mềm, reason/expiry; không override safety cứng |
| Vehicle release sau defect nghiêm trọng | mechanic hoàn thành | maintenance manager/inspector độc lập | checklist, evidence, signature, không tự duyệt nếu policy yêu cầu |
| Bulk PII/GPS export | requester có export permission | Data Owner/Security; Legal khi cần | purpose, cột, scope, retention, watermark/audit |
| Integration credential/config | platform admin | Security + business integration owner | secret manager, least privilege, rotate/rollback |
| Retention purge/DSAR | Data operator | Data Owner/Legal; Finance cho record bắt buộc | legal hold, evidence, tombstone/audit |
| Production migration/cutover | Tech Lead/Platform | change approver + service owner | preflight, backup, smoke, rollback/forward-fix |

Maker không được duyệt chính request mình tạo. Khi nhân sự ít, approval vẫn phải dùng hai principal hoặc waiver chính thức có compensating control và expiry.

## 9. Data scope và field-level access

### 9.1 Scope hierarchy

```text
organization
  └─ region
      └─ branch/station/office
          ├─ route/fleet/workshop
          └─ shift/assigned-trip/own-resource
```

- `all` chỉ dành cho role được phê duyệt ở cấp tổ chức; không là mặc định.
- Resource có nhiều chiều scope phải thỏa policy rõ, ví dụ trip thuộc region và vehicle thuộc fleet được phép.
- Chuyển chi nhánh không tự động giữ scope cũ; JML process phải thu hồi rồi cấp lại.
- Customer/corporate user chỉ xem resource có ownership/relationship đã xác minh.
- Partner service chỉ dùng OAuth/client credential scope và object allowlist trong hợp đồng.

### 9.2 Field policy

| Dữ liệu | Hiển thị mặc định | Quyền mở rộng | Ghi audit |
|---|---|---|---|
| Tên/liên hệ khách | mask một phần | `customer:read-pii` + purpose/scope | reveal, export và bulk search |
| Người gửi/nhận | mask ngoài transaction | `cargo-order:read-pii` cho active case/trip | reveal/POD access |
| Hồ sơ/bằng lái tài xế | trạng thái qualification, không ảnh giấy tờ | `driver:read-restricted` | mọi download/reveal |
| GPS chính xác | trạng thái/ETA tổng hợp | `vehicle:read-location` trên active scope | live view/export/history |
| Tài chính | tổng hợp hoặc masked reference | `finance:<action>` | mutation/export/approval |
| Payment token/secret | không trả về UI | adapter/service identity tối thiểu | access/rotation; không log giá trị |
| POD/hợp đồng/inspection ảnh | metadata trước | resource permission + signed URL ngắn hạn | view/download/share |
| Audit | redact payload nhạy cảm | auditor/security scope | audit query/export |

PII reveal không được dùng để né masking trên toàn UI. Mỗi reveal có TTL ở client, không cache shared và dùng `Cache-Control: no-store` khi phù hợp.

## 10. Permission catalog

Tên permission dùng dạng `resource:action`; API không kiểm tra trực tiếp tên role.

| Resource | Action tối thiểu |
|---|---|
| `organization` | `read`, `configure` |
| `user` | `read`, `invite`, `suspend`, `assign-role` |
| `role` | `read`, `create`, `update`, `approve` |
| `vehicle` | `read`, `create`, `update`, `read-location`, `block`, `release` |
| `driver` | `read`, `read-restricted`, `update`, `schedule`, `assign` |
| `trip` | `read`, `create`, `update`, `assign`, `override`, `execute`, `cancel` |
| `booking` | `read`, `create`, `change`, `cancel`, `refund-request`, `refund-approve`, `export` |
| `cargo-order` | `read`, `read-pii`, `create`, `update`, `scan`, `load`, `deliver`, `claim`, `export` |
| `contract` | `read`, `create`, `quote`, `approve`, `accept`, `close`, `export` |
| `maintenance` | `read`, `inspect`, `create-work-order`, `work`, `sign-off`, `configure` |
| `customer` | `read`, `read-pii`, `update`, `reveal`, `export`, `privacy-request` |
| `tariff` | `read`, `draft`, `approve`, `publish` |
| `invoice` | `read`, `create`, `adjust`, `record-payment`, `approve`, `settle`, `export` |
| `report` | `read-operational`, `read-financial`, `schedule`, `export` |
| `integration` | `read`, `configure`, `rotate-secret`, `replay` |
| `audit` | `read`, `export`; không có update/delete qua application |

Permission catalog có version. Thay đổi permission hoặc mapping role cần migration, test tác động và phê duyệt như thay đổi bảo mật.

## 11. Joiner–Mover–Leaver và access review

### Joiner

1. danh tính được tạo từ nguồn nhân sự/IdP đã phê duyệt;
2. manager chọn role template, scope và thời hạn;
3. owner scope phê duyệt; Security duyệt quyền đặc quyền;
4. MFA/SSO và thiết bị đáp ứng policy;
5. hệ thống ghi audit và gửi xác nhận quyền đã cấp.

### Mover

- thu hồi scope/role cũ trước khi cấp mới hoặc dùng thay đổi atomically;
- invalidate session/token khi quyền giảm hoặc nhiệm vụ thay đổi;
- review dữ liệu export/download đang còn hiệu lực và ownership của queue/case.

### Leaver

- suspend tại IdP, revoke session, token, API key và device enrollment;
- chuyển ownership công việc, không chuyển credential;
- giữ/xóa dữ liệu nhân sự theo retention và legal hold đã duyệt;
- evidence thu hồi quyền nằm trong offboarding checklist.

Access review:

- quyền đặc quyền, integration/service account: hàng tháng hoặc theo policy rủi ro;
- finance approver, bulk export, GPS/restricted driver data: ít nhất hàng quý;
- role thông thường: ít nhất hàng quý và khi đổi tổ chức;
- role tạm: tự hết hạn; gia hạn cần approval mới.

## 12. Break-glass và service account

- Hai tài khoản break-glass độc lập, lưu trong vault, không dùng hằng ngày.
- Sử dụng yêu cầu incident/change ID, MFA mạnh, time-box, alert realtime và review sau phiên.
- Không chia sẻ account. Nếu cần hỗ trợ database, cấp access tạm qua workload identity/proxy và audit query.
- Service account có owner người thật, mục đích, environment, OAuth scope/DB role tối thiểu, rotation và expiry/review.
- Secret không xuất hiện trong UI, logs, analytics, issue, screenshot hoặc repo.
- Token của CI/CD không có quyền đọc business data.

## 13. Audit và alert

Audit event tối thiểu:

- login/logout/deny/session revoke/MFA challenge;
- user/role/scope/service account change;
- PII/restricted field reveal, attachment access và export;
- booking/order/contract/trip/maintenance/invoice transition;
- price/refund/payment/settlement/override và approval;
- integration config, webhook replay, secret rotation;
- break-glass, backup/restore và retention purge.

Audit gồm actor, acting role/scope, action, resource, outcome, reason, request/trace ID, occurred time, source và diff đã redact. Application role không có update/delete. Alert có owner/runbook cho privilege escalation, dormant admin login, bulk export, repeated deny/IDOR pattern, audit write failure và break-glass use.

## 14. Authorization testing

Mỗi endpoint/mutation phải có:

- allow test cho role/scope hợp lệ;
- deny test khi thiếu permission;
- deny test đúng role nhưng sai branch/route/object;
- deny test khi role hết hạn/session bị revoke;
- field masking/reveal test;
- maker không thể tự approve;
- hard invariant không bị `trip:override` bypass;
- IDOR enumeration và bulk/export scope test;
- audit success/deny/reveal/approval test;
- property/concurrency test khi quyền thay đổi giữa request hoặc callback.

UI test xác nhận menu/action phù hợp nhưng không thay cho API policy test. OWASP ASVS là baseline verification cho authentication, session và access control. [OWASP ASVS](https://owasp.org/www-project-application-security-verification-standard/)

## 15. Gate triển khai RBAC

Không pilot với dữ liệu thật nếu:

- có endpoint dựa vào role/scope do client gửi;
- thiếu deny-by-default hoặc object-level authorization;
- admin hạ tầng mặc nhiên xem business PII;
- maker có thể tự approve action nhạy cảm;
- audit có thể sửa/xóa bằng application role;
- role không có owner/scope/expiry hoặc không có offboarding;
- negative authorization/IDOR/bulk export tests chưa đạt;
- quyền GPS, hồ sơ tài xế, tài chính và attachment chưa có field policy.

## 16. Nguồn tham chiếu

- [Samsara Administrative Roles — role chức năng, tag scope và MFA/SSO cho quyền đặc quyền](https://kb.samsara.com/hc/en-us/articles/4411870638733-Administrative-Roles)
- [Samsara Custom Roles — view/edit permission chi tiết và tag-based access](https://kb.samsara.com/hc/en-us/articles/360043852111-Custom-Roles)
- [NIST SP 800-207 Zero Trust Architecture](https://csrc.nist.gov/pubs/sp/800/207/final)
- [NIST Cybersecurity Framework 2.0](https://www.nist.gov/publications/nist-cybersecurity-framework-csf-20)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [KSOps Enterprise Blueprint](ENTERPRISE_BLUEPRINT.md)
- [KSOps Security Baseline](SECURITY.md)

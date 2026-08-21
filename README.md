# KSOps — Transport Control

KSOps là đồ án thực tập lập trình viên mô phỏng một nền tảng điều hành vận tải hợp nhất: quản lý đội xe, tài xế, đơn vận chuyển hàng hóa, điều phối chuyến, vé hành khách, thuê xe hợp đồng, khách hàng, bảo dưỡng, tài chính và báo cáo.

> **Phạm vi an toàn:** đây là sản phẩm demo phục vụ học tập, không phải hệ thống chính thức của doanh nghiệp. Tất cả biển số, mã đơn, hành trình, người, khách hàng, giá trị tài chính và trạng thái đều là dữ liệu giả lập. Repository không chứa dữ liệu lấy từ tài liệu thực tập, hệ thống bán vé, thiết bị định vị hay hồ sơ nội bộ.

## Trạng thái chương trình

- **Hiện tại:** frontend demo responsive với fixture synthetic, bộ chuyển 8 vai trò để minh họa quyền UI và một số thao tác lưu ở `localStorage`; chưa có backend, database, đăng nhập/RBAC server-side, GPS, payment hoặc ERP thật.
- **Pilot 12 tuần:** một lát cắt kiểm chứng quy trình, authorization, concurrency, audit, UAT và khả năng vận hành; không đồng nghĩa thay thế hệ thống hiện hữu.
- **Mục tiêu 12–15 tháng:** nền tảng đa kênh gồm web điều hành, kênh khách hàng, driver PWA/mobile, transactional core, telemetry, tài chính/tích hợp và BI, triển khai theo gate/chi nhánh.

Xem [Enterprise Blueprint](docs/ENTERPRISE_BLUEPRINT.md) để biết phạm vi mục tiêu và [ma trận RBAC](docs/RBAC_MATRIX.md) để biết ai được vận hành từng phân hệ.

## Bài toán

Một doanh nghiệp vận tải thường phải ghép thông tin từ nhiều luồng: nhu cầu khách hàng, đơn ký gửi, lịch xe, tài xế, ghế hành khách, hợp đồng, bảo dưỡng và đối soát. KSOps trình bày một thiết kế sản phẩm có thể gom các luồng đó vào một nguồn điều hành thống nhất, giúp:

- biết xe và tài xế nào đang sẵn sàng;
- đưa đơn vào đúng chuyến, đúng tải và đúng cam kết giao nhận;
- phát hiện xung đột điều phối, giấy tờ hoặc lịch bảo dưỡng;
- truy vết doanh thu/công nợ theo đơn và chuyến;
- đo tỷ lệ đúng giờ, hiệu suất sử dụng xe và chất lượng dịch vụ.

## Phiên bản hiện tại

Ứng dụng Next.js responsive gồm 11 màn hình sản phẩm:

| Route | Năng lực |
|---|---|
| `/` | trung tâm điều hành và KPI theo ca |
| `/don-hang` | đơn hàng hóa, tìm kiếm/lọc, chi tiết, tạo đơn demo và workflow |
| `/dieu-phoi` | bàn điều phối chuyến, xe, tài xế và cảnh báo xung đột |
| `/doi-xe` | danh mục xe, trạng thái, tải/ghế và hồ sơ khai thác |
| `/tai-xe` | ca làm, mức sẵn sàng, giấy phép và tuân thủ |
| `/ve-xe` | tra cứu chuyến, sơ đồ ghế và đặt chỗ mô phỏng |
| `/hop-dong` | pipeline báo giá/thuê xe và yêu cầu hợp đồng |
| `/khach-hang` | hồ sơ CRM và lịch sử giao dịch tổng hợp |
| `/bao-duong` | work order, lịch, cảnh báo và checklist kỹ thuật |
| `/tai-chinh` | hóa đơn, công nợ, doanh thu và chi phí khai thác |
| `/bao-cao` | KPI đa kỳ, hiệu quả dịch vụ/tuyến và xuất CSV |

Các thao tác demo có thể dùng `localStorage` để duy trì trên chính trình duyệt đang xem. Database, API nghiệp vụ, SSO/RBAC, thanh toán và GPS thật không được bật trong bản công khai.

Bộ chọn vai trò chỉ giúp xem navigation và thao tác của từng vị trí nghiệp vụ. Đây không phải đăng nhập hay security boundary; hệ thống production vẫn phải xác thực và kiểm tra quyền trên server cho mọi truy vấn/mutation.

## Công nghệ

| Lớp | Bản demo | Định hướng pilot |
|---|---|---|
| Giao diện | Next.js 16 App Router, React 19, TypeScript, CSS Modules | design system, schema form, E2E và accessibility regression |
| Runtime | Node.js 22.x, Vercel | runtime theo tải, region và data-residency đã phê duyệt |
| Dữ liệu | fixture synthetic + localStorage | PostgreSQL, migration, outbox và object storage |
| Danh tính | không bật | OIDC/SSO, MFA theo IdP, RBAC server-side |
| Tích hợp | không kết nối hệ thống thật | adapter cho vé, GPS, thông báo, thanh toán và kế toán |
| Quan sát | trạng thái mô phỏng | structured logs, metrics, traces và alert routing |

Mã demo dùng **feature-folder architecture**: mỗi route giữ `_components` và `_lib`; component client chỉ điều phối state/sự kiện; helper nghiệp vụ thuần được kiểm thử độc lập. Kiến trúc production đề xuất là **modular monolith**, tránh chi phí microservice trước khi có bằng chứng về tải hoặc ownership.

## Chạy cục bộ

Yêu cầu Node.js `22.x` và npm:

```bash
npm ci
npm run dev
```

Quality gate trước pull request:

```bash
npm run check
npm run build
npm audit --audit-level=high
```

Không tạo hoặc commit `.env` nếu chưa cần. Khi bổ sung backend, secrets phải nằm trong secret manager của nền tảng.

## Cấu trúc

```text
app/                    # route, feature component và CSS Module
  _components/          # shell và hành động dùng chung
  _hooks/               # adapter trạng thái trình duyệt có runtime decoder
  <feature>/            # page + client orchestration + _components + _lib
lib/                    # dữ liệu tổng hợp dùng chung
public/                 # social preview riêng của sản phẩm
tests/                  # regression, helper, security và data-safety
docs/                   # kiến trúc, API, bảo mật, test và roadmap
.github/workflows/      # quality gate CI
```

## Triển khai

Repository dùng Next.js native và được triển khai trên Vercel. Bản demo không cần biến môi trường. `NEXT_PUBLIC_SITE_URL` hoặc `VERCEL_PROJECT_PRODUCTION_URL` được dùng để tạo canonical/Open Graph URL tại build time.

Với pilot có backend, preview, staging và production phải dùng project/database/secrets riêng. Build một lần, promote cùng artifact, migration có preflight và rollback/forward-fix được diễn tập.

## Quyền riêng tư và dữ liệu

- Chỉ sử dụng fixture do nhóm tự tạo, với tiền tố như `VEH-DEMO`, `ORD-DEMO`, `TRIP-DEMO`.
- Không commit danh sách khách hàng, CCCD, bằng lái, số điện thoại, hành trình GPS, biển số thật, vé thật, hóa đơn thật hoặc ảnh nội bộ.
- Không sao chép địa chỉ, IP, hostname, MAC, VLAN hoặc ảnh nhân viên từ tài liệu thực tập cũ.
- Không xử lý thẻ thanh toán trong ứng dụng; dùng payment provider có tokenization khi triển khai thật.
- Khi nghi ngờ lộ dữ liệu: ngắt tích hợp, thu hồi secret, bảo toàn bằng chứng, thông báo owner và xử lý theo runbook; chỉ xóa file trong commit mới là chưa đủ.

## Tài liệu

- [Enterprise Blueprint 12–15 tháng](docs/ENTERPRISE_BLUEPRINT.md)
- [Ma trận role, permission và data scope](docs/RBAC_MATRIX.md)
- [Kế hoạch pilot 12 tuần](docs/DEVELOPMENT_PLAN.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Bảo mật và threat model](docs/SECURITY.md)
- [Hợp đồng API mục tiêu](docs/API_SPEC.md)
- [Chiến lược kiểm thử và UAT](docs/TEST_PLAN.md)

## Quy trình đóng góp

1. Tạo nhánh `feature/<ticket>-<mo-ta>` hoặc `fix/<ticket>-<mo-ta>` từ `main` mới nhất.
2. Mỗi pull request liên kết backlog, có acceptance criteria, ảnh dùng dữ liệu demo và hướng dẫn kiểm thử.
3. CI phải xanh; thay đổi workflow/permission/migration cần review độc lập.
4. Không merge khi còn finding critical/high, thiếu authorization test hoặc thiếu kế hoạch rollback.
5. Dùng Conventional Commits, ví dụ `feat(dispatch): add assignment conflict check`.

Definition of Done chung: đúng acceptance criteria, test theo rủi ro đạt, responsive/a11y không thoái lui, không lộ dữ liệu, telemetry/audit/tài liệu được cập nhật và có thể rollback.

## Giới hạn sử dụng

Đây là đồ án học tập. Việc triển khai vào doanh nghiệp cần phê duyệt riêng về nghiệp vụ, dữ liệu cá nhân, an toàn giao thông, pháp lý, kế toán, thanh toán, tích hợp và vận hành.

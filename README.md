# KSOps — IT Service Hub

KSOps là đồ án thực tập lập trình viên mô phỏng một cổng vận hành CNTT và CMDB (Configuration Management Database): theo dõi tài sản, tiếp nhận sự cố/yêu cầu, lập lịch bảo trì, quan sát sức khỏe dịch vụ và lưu tri thức xử lý.

> **Phạm vi an toàn:** đây là sản phẩm demo phục vụ học tập, không phải hệ thống chính thức của doanh nghiệp. Mọi tên địa điểm, mã yêu cầu, số liệu, người phụ trách và trạng thái trên giao diện đều là dữ liệu giả lập. Repository không chứa IP, hostname, MAC, VLAN, tài khoản, ảnh nội bộ hoặc dữ liệu vận hành thật.

## Hiện trạng

Phiên bản hiện tại là ứng dụng Next.js 16 responsive, gồm:

- chỉ số tổng quan tài sản, tuân thủ, sự cố và bảo trì;
- danh mục 148 tài sản mẫu có tìm kiếm, lọc, sắp xếp, phân trang và xuất CSV;
- hàng đợi sự cố có SLA, tạo ticket demo, đổi trạng thái và lưu cục bộ trên trình duyệt;
- lịch bảo trì có checklist cục bộ, cửa sổ thay đổi và kiểm soát nghiệm thu;
- dashboard giám sát, cảnh báo, service map và biểu đồ CSS dùng telemetry mô phỏng;
- kho runbook có tìm kiếm, phân loại, quy trình xử lý và vòng đời tài liệu;
- roadmap 12 tuần, kiến trúc mục tiêu, quality gate, risk register và bộ bàn giao;
- metadata Open Graph riêng, security headers, semantic HTML và hỗ trợ truy cập;
- pipeline lint, build và test trên GitHub Actions.

Database, API, SSO/RBAC và tích hợp giám sát thật không được bật trong bản demo công khai. Ticket và checklist do người xem tạo chỉ lưu trong `localStorage`; thiết kế production được mô tả trong thư mục `docs/`.

## Công nghệ

| Lớp | Hiện tại | Định hướng production |
|---|---|---|
| Giao diện | Next.js 16 App Router, React 19, TypeScript, CSS Modules | Design system, schema validation, E2E và accessibility regression |
| Runtime | Node.js 22.x, Vercel-compatible | Node runtime theo tải và yêu cầu kết nối dữ liệu |
| Dữ liệu | Mock trong source + localStorage cho thao tác demo | PostgreSQL + ORM, migration có kiểm soát |
| Xác thực | Không bật; bản demo công khai không có dữ liệu thật | SSO/OIDC, session bảo mật, RBAC server-side |
| Quan sát | Telemetry tổng hợp mô phỏng | Structured logs, metrics, traces, alert routing |
| Triển khai | Next.js native trên Vercel | Preview → staging → production, phê duyệt theo môi trường |

## Chạy cục bộ

Yêu cầu Node.js `22.x` và npm đi kèm.

```bash
npm ci
npm run dev
```

Mở địa chỉ được in trong terminal. Các lệnh kiểm tra trước khi tạo pull request:

```bash
npm run typecheck
npm run lint
npm run build
npm test
```

Không tạo `.env` nếu chưa cần. Khi bổ sung backend, biến môi trường phải được cấp qua secret manager của nền tảng; tuyệt đối không commit secret.

## Cấu trúc chính

```text
app/                    # giao diện và layout
lib/                    # type và dữ liệu mô phỏng dùng chung
public/                 # social preview đã kiểm tra
tests/                  # automated tests
docs/                   # kế hoạch và đặc tả kỹ thuật
.github/workflows/      # CI quality gate
next.config.ts          # security headers và cấu hình Next.js
vercel.json             # cấu hình triển khai Vercel
```

## Triển khai Vercel

Repository dùng Next.js native nên Vercel nhận diện trực tiếp. Với tài khoản đã đăng nhập:

```bash
npx vercel@latest --prod
```

Không cần biến môi trường cho bản demo. Với pilot có backend, tạo project riêng cho preview/staging/production và cấp secret qua Vercel Environment Variables hoặc secret manager được phê duyệt.

## Tài liệu dự án

- [Kế hoạch phát triển 12 tuần](docs/DEVELOPMENT_PLAN.md)
- [Kiến trúc hệ thống](docs/ARCHITECTURE.md)
- [Bảo mật, RBAC và threat model](docs/SECURITY.md)
- [Hợp đồng API dự kiến](docs/API_SPEC.md)
- [Chiến lược kiểm thử và UAT](docs/TEST_PLAN.md)

## Quy trình đóng góp

1. Tạo nhánh `feature/<ticket>-<mo-ta>` hoặc `fix/<ticket>-<mo-ta>` từ nhánh chính đã cập nhật.
2. Giữ pull request nhỏ, liên kết backlog item, nêu thay đổi, ảnh chụp dữ liệu giả lập và cách kiểm thử.
3. Chạy lint, build và test cục bộ; CI phải xanh và có ít nhất một lượt review.
4. Không merge khi còn lỗi mức nghiêm trọng/cao, thiếu migration review hoặc thiếu kế hoạch rollback.
5. Dùng Conventional Commits, ví dụ `feat(cmdb): add asset filters`.

Definition of Done chung: acceptance criteria đạt, kiểm thử tự động phù hợp, accessibility không thoái lui, log không lộ dữ liệu nhạy cảm, tài liệu/API/migration được cập nhật và có thể rollback.

## Dữ liệu và quyền riêng tư

- Chỉ dùng seed/mock do nhóm tự tạo, không sao chép dữ liệu từ tài liệu thực tập hoặc hệ thống công ty.
- Không commit `.env`, DOC/DOCX, PDF, key/certificate, database dump, log thật hoặc ảnh chụp màn hình nội bộ.
- Ví dụ định danh phải dùng giá trị hư cấu như `AST-DEMO-0001`, `INC-DEMO-0001` và `user@example.invalid`.
- Nếu vô tình commit bí mật: dừng sử dụng, thu hồi/rotate ngay, báo người phụ trách và làm sạch lịch sử theo quy trình sự cố; chỉ xóa file khỏi commit mới là chưa đủ.

## Giấy phép và sử dụng

Đồ án nội bộ phục vụ thực tập/học tập. Việc triển khai vào môi trường doanh nghiệp cần được chủ sở hữu hệ thống phê duyệt, đánh giá bảo mật, pháp lý, dữ liệu và vận hành độc lập.

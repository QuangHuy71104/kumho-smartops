import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCustomerAuthConfigured } from "../../../lib/supabase/config.ts";
import { getCurrentAppUser } from "../../../lib/supabase/server.ts";
import styles from "../../quan-tri/dang-nhap/login.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đăng nhập khách hàng — KumhoGo" };

const errorMessages: Record<string, string> = {
  "auth-config": "Nhà xe chưa hoàn tất cấu hình đăng nhập Google.",
  google: "Không thể mở trang đăng nhập Google. Vui lòng thử lại.",
  callback: "Phiên đăng nhập không hợp lệ hoặc đã hết hạn.",
};

export default async function CustomerLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentAppUser();
  if (user) redirect("/dat-ve");
  const query = await searchParams;
  const configured = isCustomerAuthConfigured();
  const error = query.error ? errorMessages[query.error] : null;

  return (
    <main className={`${styles.page} ${styles.customerPage}`}>
      <a className={styles.back} href="/dat-ve">← Quay lại KumhoGo</a>
      <section className={styles.loginCard}>
        <div className={styles.customerBrand}><span>K</span><div><strong>KumhoGo</strong><small>Đi đúng chuyến · Trọn hành trình</small></div></div>
        <div className={styles.intro}><span>TÀI KHOẢN HÀNH KHÁCH</span><h1>Đăng nhập để giữ ghế</h1><p>Dùng tài khoản Google để đặt vé, nhận thông báo và xem lại các hành trình của bạn.</p></div>
        {error ? <p className={styles.alert}>{error}</p> : null}
        <a className={`${styles.googleButton} ${!configured ? styles.disabled : ""}`} href={configured ? "/auth/customer/google?next=%2Fdat-ve" : "/dat-ve/dang-nhap?error=auth-config"}>
          <svg viewBox="0 0 24 24" aria-hidden="true"><path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.6Z"/><path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 1-3.5 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.6A10 10 0 0 0 12 22Z"/><path fill="#FBBC05" d="M6.5 13.9A6 6 0 0 1 6.2 12c0-.7.1-1.3.3-1.9V7.5H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.5l3.3-2.6Z"/><path fill="#EA4335" d="M12 6c1.6 0 3 .5 4.1 1.6l3-3A10 10 0 0 0 3.2 7.5l3.3 2.6A5.9 5.9 0 0 1 12 6Z"/></svg>
          Tiếp tục với Google
        </a>
        <div className={styles.assurances}><span>✓ Không cần nhớ mật khẩu</span><span>✓ Bảo mật bởi Google và Supabase</span><span>✓ Chỉ dùng email để quản lý vé</span></div>
        <p className={styles.terms}>Bằng việc tiếp tục, bạn đồng ý với điều khoản sử dụng và chính sách bảo mật của KumhoGo.</p>
        <div className={styles.adminPrompt}>Bạn là nhân viên nhà xe? <a href="/quan-tri/dang-nhap">Đăng nhập quản trị</a></div>
      </section>
    </main>
  );
}

import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { isCustomerAuthConfigured } from "../../../lib/supabase/config.ts";
import { getCurrentAppUser } from "../../../lib/supabase/server.ts";
import styles from "./login.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Đăng nhập quản trị — KSOps" };

const errorMessages: Record<string, string> = {
  "auth-config": "Supabase Auth chưa được cấu hình cho môi trường này.",
  credentials: "Email hoặc mật khẩu quản trị không chính xác.",
  forbidden: "Tài khoản này chưa được cấp quyền quản trị.",
};

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const user = await getCurrentAppUser();
  if (user?.role === "admin") redirect("/");
  const query = await searchParams;
  const configured = isCustomerAuthConfigured();
  const error = query.error ? errorMessages[query.error] : null;

  return (
    <main className={styles.page}>
      <a className={styles.back} href="/dat-ve">← Sang website đặt vé</a>
      <section className={styles.adminCard}>
        <div className={styles.adminBrand}><span>KS</span><div><strong>KSOps</strong><small>Transport Control</small></div></div>
        <div className={styles.intro}><span>CỔNG QUẢN TRỊ</span><h1>Chào mừng trở lại</h1><p>Đăng nhập bằng tài khoản được nhà xe cấp để vận hành bán vé và điều phối chuyến.</p></div>
        {error ? <p className={styles.alert}>{error}</p> : null}
        <form className={styles.form} action="/auth/admin/login" method="post">
          <label>Email quản trị<input type="email" name="email" autoComplete="username" placeholder="Email được nhà xe cấp" required /></label>
          <label>Mật khẩu<input type="password" name="password" autoComplete="current-password" minLength={8} placeholder="Nhập mật khẩu" required /></label>
          <div className={styles.formMeta}><label><input type="checkbox" /> Ghi nhớ thiết bị</label><span>Liên hệ quản trị viên nếu quên mật khẩu</span></div>
          <button type="submit" disabled={!configured}>Đăng nhập trang quản lý</button>
        </form>
        {!configured ? <p className={styles.setupNote}>Cần thêm khóa Supabase Publishable vào môi trường trước khi đăng nhập.</p> : null}
        <div className={styles.security}><span>✓</span><p><strong>Truy cập có kiểm soát</strong><small>Chỉ tài khoản có vai trò admin mới được vào hệ thống quản lý.</small></p></div>
      </section>
    </main>
  );
}

"use client";

import { useMemo, useState } from "react";
import { useDemoAccess } from "../_components/access/DemoAccessProvider";
import { useLocalStorageState } from "../_hooks/useLocalStorageState";
import {
  cashFlow,
  decodePaidInvoiceIds,
  expenseBreakdown,
  formatCurrency,
  invoices,
  type InvoiceStatus,
} from "./_lib/finance";
import styles from "./Finance.module.css";

type Filter = "Tất cả" | InvoiceStatus;

export default function FinanceDashboard() {
  const { can } = useDemoAccess();
  const canRecordPayment = can("invoice:record-payment");
  const [filter, setFilter] = useState<Filter>("Tất cả");
  const [message, setMessage] = useState("");
  const [paidIds, setPaidIds, resetPaidIds] = useLocalStorageState({
    key: "ksops:transport:paid-invoices:v1",
    initialValue: [] as string[],
    decode: decodePaidInvoiceIds,
  });

  const effectiveInvoices = useMemo(() => invoices.map((invoice) => ({
    ...invoice,
    status: paidIds.includes(invoice.id) ? "Đã thanh toán" as const : invoice.status,
  })), [paidIds]);

  const filteredInvoices = filter === "Tất cả"
    ? effectiveInvoices
    : effectiveInvoices.filter((invoice) => invoice.status === filter);

  const collected = effectiveInvoices
    .filter((invoice) => invoice.status === "Đã thanh toán")
    .reduce((sum, invoice) => sum + invoice.amount, 0);
  const receivable = effectiveInvoices
    .filter((invoice) => invoice.status !== "Đã thanh toán")
    .reduce((sum, invoice) => sum + invoice.amount, 0);

  function markPaid(id: string) {
    if (!canRecordPayment) {
      setMessage("Vai trò demo hiện tại không có quyền ghi nhận thanh toán.");
      return;
    }
    setPaidIds((current) => current.includes(id) ? current : [...current, id]);
    setMessage(`Đã ghi nhận thanh toán mô phỏng cho ${id}.`);
  }

  function resetDemo() {
    resetPaidIds();
    setMessage("Đã khôi phục dữ liệu thanh toán mẫu.");
  }

  return (
    <div className={styles.finance}>
      <section className={styles.hero} aria-labelledby="finance-summary-title">
        <div>
          <span className={styles.kicker}>Đối soát ngày 21/08</span>
          <h2 id="finance-summary-title">Dòng tiền bám theo từng chuyến xe.</h2>
          <p>Doanh thu, công nợ và chi phí khai thác được liên kết bằng mã đơn hàng mô phỏng để dễ truy vết.</p>
        </div>
        <button className={styles.secondaryButton} type="button" onClick={resetDemo}>Khôi phục dữ liệu mẫu</button>
      </section>

      <section className={styles.metrics} aria-label="Chỉ số tài chính">
        <article><span>Doanh thu tháng</span><strong>2,84 tỷ</strong><small>+8,6% so với tháng trước</small></article>
        <article><span>Đã thu trong mẫu</span><strong>{formatCurrency(collected)}</strong><small>Cập nhật khi ghi nhận thanh toán</small></article>
        <article><span>Công nợ trong mẫu</span><strong>{formatCurrency(receivable)}</strong><small>1 hóa đơn đang quá hạn</small></article>
        <article><span>Biên đóng góp</span><strong>31,4%</strong><small>Sau chi phí vận hành trực tiếp</small></article>
      </section>

      <div className={styles.analyticsGrid}>
        <section className={styles.panel} aria-labelledby="cashflow-title">
          <div className={styles.panelHeading}>
            <div><span className={styles.kicker}>7 ngày</span><h2 id="cashflow-title">Thu và chi vận hành</h2></div>
            <div className={styles.legend}><span><i data-tone="income" /> Thu</span><span><i data-tone="expense" /> Chi</span></div>
          </div>
          <div className={styles.barChart} role="img" aria-label="Biểu đồ cột thu và chi vận hành trong bảy ngày">
            {cashFlow.map((point) => (
              <div className={styles.barGroup} key={point.day}>
                <div><span data-tone="income" style={{ height: `${point.income}%` }} /><span data-tone="expense" style={{ height: `${point.expense}%` }} /></div>
                <small>{point.day}</small>
              </div>
            ))}
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="expense-title">
          <div className={styles.panelHeading}><div><span className={styles.kicker}>Cơ cấu tháng</span><h2 id="expense-title">Chi phí khai thác</h2></div></div>
          <div className={styles.expenseTotal}><strong>840,0 triệu</strong><span>100% chi phí trực tiếp</span></div>
          <div className={styles.expenseList}>
            {expenseBreakdown.map((item) => (
              <div key={item.label}>
                <div><strong>{item.label}</strong><span>{item.amount} · {item.value}%</span></div>
                <div className={styles.progress}><span style={{ width: `${item.value}%` }} /></div>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={styles.panel} aria-labelledby="invoice-title">
        <div className={styles.invoiceHeading}>
          <div><span className={styles.kicker}>Chứng từ mô phỏng</span><h2 id="invoice-title">Hóa đơn và công nợ</h2></div>
          <label>Trạng thái
            <select value={filter} onChange={(event) => setFilter(event.target.value as Filter)}>
              <option>Tất cả</option><option>Đã thanh toán</option><option>Chờ thanh toán</option><option>Quá hạn</option>
            </select>
          </label>
        </div>
        <p className={styles.liveMessage} aria-live="polite">{message}</p>
        <div className={styles.tableWrap}>
          <table>
            <caption className="sr-only">Danh sách hóa đơn mô phỏng</caption>
            <thead><tr><th>Hóa đơn</th><th>Khách hàng</th><th>Dịch vụ</th><th>Giá trị</th><th>Hạn</th><th>Trạng thái</th><th>Thao tác</th></tr></thead>
            <tbody>
              {filteredInvoices.map((invoice) => (
                <tr key={invoice.id}>
                  <td><strong>{invoice.id}</strong><span>{invoice.reference}</span></td>
                  <td>{invoice.customer}</td><td>{invoice.service}</td><td>{formatCurrency(invoice.amount)}</td><td>{invoice.dueDate}</td>
                  <td><span className={styles.status} data-status={invoice.status}>{invoice.status}</span></td>
                  <td>{invoice.status === "Đã thanh toán" ? <span className={styles.done}>Đã đối soát</span> : <button disabled={!canRecordPayment} title={canRecordPayment ? undefined : "Vai trò demo hiện tại không có quyền ghi nhận thanh toán."} type="button" onClick={() => markPaid(invoice.id)}>Ghi nhận thu</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

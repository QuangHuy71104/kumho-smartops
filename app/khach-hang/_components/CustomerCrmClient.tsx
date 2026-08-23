"use client";

import { useMemo, useState } from "react";
import {
  averageSatisfaction,
  CUSTOMER_RISKS,
  CUSTOMER_SEGMENTS,
  CUSTOMER_TYPES,
  customerRecords,
  formatCustomerValue,
  type CustomerRisk,
  type CustomerSegment,
  type CustomerType,
} from "../_lib/customer-data";
import styles from "../Customers.module.css";

const ALL = "Tất cả" as const;

export default function CustomerCrmClient() {
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<typeof ALL | CustomerType>(ALL);
  const [segmentFilter, setSegmentFilter] = useState<typeof ALL | CustomerSegment>(ALL);
  const [riskFilter, setRiskFilter] = useState<typeof ALL | CustomerRisk>(ALL);
  const [selectedId, setSelectedId] = useState(customerRecords[0].id);

  const filtered = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return customerRecords.filter((customer) => (
      (typeFilter === ALL || customer.type === typeFilter)
      && (segmentFilter === ALL || customer.segment === segmentFilter)
      && (riskFilter === ALL || customer.risk === riskFilter)
      && (!normalized || [customer.id, customer.displayName, customer.owner, customer.servicePreference, ...customer.tags].join(" ").toLocaleLowerCase("vi").includes(normalized))
    ));
  }, [query, riskFilter, segmentFilter, typeFilter]);
  const selected = customerRecords.find((customer) => customer.id === selectedId) ?? customerRecords[0];
  const satisfaction = averageSatisfaction(customerRecords);

  function resetFilters() {
    setQuery("");
    setTypeFilter(ALL);
    setSegmentFilter(ALL);
    setRiskFilter(ALL);
  }

  return (
    <div className={styles.module}>
      <section className={styles.metrics} aria-label="Tổng hợp khách hàng">
        <article><span>Hồ sơ đang quản lý</span><strong>{customerRecords.length}</strong><small>đã chuẩn hóa theo nhóm khách hàng</small></article>
        <article><span>Doanh nghiệp</span><strong>{customerRecords.filter((item) => item.type === "Doanh nghiệp").length}</strong><small>hồ sơ nghiệp vụ</small></article>
        <article><span>Satisfaction trung bình</span><strong>{satisfaction.toFixed(1)}/5</strong><small>30 ngày gần nhất</small></article>
        <article><span>Cần theo dõi</span><strong>{customerRecords.filter((item) => item.risk !== "Thấp").length}</strong><small>risk trung bình/cao</small></article>
      </section>

      <section className={styles.workspace} id="danh-sach-khach-hang">
        <div className={styles.listPane}>
          <div className={styles.heading}><div><span>Customer 360</span><h2>Danh sách khách hàng</h2></div><strong>{filtered.length} hồ sơ</strong></div>
          <div className={styles.filters}>
            <label className={styles.search}><span>Tìm kiếm</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, tên hiển thị, owner, nhãn..." /></label>
            <label><span>Loại</span><select value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof ALL | CustomerType)}><option>{ALL}</option>{CUSTOMER_TYPES.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Phân khúc</span><select value={segmentFilter} onChange={(event) => setSegmentFilter(event.target.value as typeof ALL | CustomerSegment)}><option>{ALL}</option>{CUSTOMER_SEGMENTS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Risk</span><select value={riskFilter} onChange={(event) => setRiskFilter(event.target.value as typeof ALL | CustomerRisk)}><option>{ALL}</option>{CUSTOMER_RISKS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <button type="button" onClick={resetFilters}>Đặt lại</button>
          </div>

          <div className={styles.tableWrap}>
            <table>
              <caption className="sr-only">Danh sách hồ sơ khách hàng</caption>
              <thead><tr><th>Khách hàng</th><th>Phân khúc</th><th>Đơn hàng</th><th>Satisfaction</th><th>Risk</th></tr></thead>
              <tbody>{filtered.map((customer) => <tr className={selected.id === customer.id ? styles.rowActive : undefined} key={customer.id}><td><button aria-pressed={selected.id === customer.id} onClick={() => setSelectedId(customer.id)} type="button"><span>{customer.id}</span><strong>{customer.displayName}</strong><small>{customer.type} · {customer.owner}</small></button></td><td><span className={styles.segment}>{customer.segment}</span></td><td><strong>{customer.orderCount}</strong><small>{formatCustomerValue(customer.lifetimeValue)}</small></td><td><strong>{customer.satisfaction.toFixed(1)}</strong><div className={styles.miniBar} aria-hidden="true"><span style={{ width: `${customer.satisfaction * 20}%` }} /></div></td><td><span className={styles.risk} data-risk={customer.risk}>{customer.risk}</span></td></tr>)}</tbody>
            </table>
            {filtered.length === 0 ? <div className={styles.empty}><strong>Không tìm thấy hồ sơ</strong><p>Hãy thử bỏ bớt bộ lọc hoặc dùng từ khóa khác.</p></div> : null}
          </div>
        </div>

        <aside className={styles.detailPane} aria-labelledby="customer-detail-title" aria-live="polite">
          <div className={styles.profileHeader}><div className={styles.profileMark} aria-hidden="true">{selected.type === "Doanh nghiệp" ? "DN" : "CN"}</div><div><span>{selected.id}</span><h2 id="customer-detail-title">{selected.displayName}</h2><p>{selected.type} · {selected.segment}</p></div><i data-risk={selected.risk}>{selected.risk}</i></div>
          <div className={styles.tags}>{selected.tags.map((tag) => <span key={tag}>{tag}</span>)}</div>
          <p className={styles.note}>{selected.note}</p>
          <dl className={styles.profileGrid}><div><dt>Owner</dt><dd>{selected.owner}</dd></div><div><dt>Ưu tiên dịch vụ</dt><dd>{selected.servicePreference}</dd></div><div><dt>Lần tương tác gần nhất</dt><dd>{selected.lastInteraction}</dd></div><div><dt>Giá trị vòng đời</dt><dd>{formatCustomerValue(selected.lifetimeValue)}</dd></div></dl>

          <div className={styles.satisfaction}><div><span>Satisfaction</span><strong>{selected.satisfaction.toFixed(1)}/5</strong></div><div className={styles.scoreBar} role="progressbar" aria-label={`Mức hài lòng ${selected.satisfaction} trên 5`} aria-valuemin={0} aria-valuemax={5} aria-valuenow={selected.satisfaction}><span style={{ width: `${selected.satisfaction * 20}%` }} /></div></div>

          <section className={styles.orders} aria-labelledby="order-history-title"><div><span>Lịch sử giao dịch</span><h3 id="order-history-title">Đơn gần đây</h3></div><div className={styles.orderList}>{selected.orders.map((order) => <article key={order.id}><div><span>{order.id}</span><strong>{order.service}</strong><small>{order.date} · {order.route}</small></div><div><strong>{formatCustomerValue(order.value)}</strong><span data-status={order.status}>{order.status}</span></div></article>)}</div></section>

          <section className={styles.riskPanel} aria-labelledby="risk-review-title"><div><span aria-hidden="true">✓</span><div><h3 id="risk-review-title">Customer health review</h3><p>Đối chiếu mức hài lòng, phản hồi mở, tần suất đơn và lần tương tác gần nhất.</p></div></div><ul><li><span>Chủ sở hữu hồ sơ</span><strong>{selected.owner}</strong></li><li><span>Mức cần theo dõi</span><strong data-risk={selected.risk}>{selected.risk}</strong></li><li><span>Hành động gợi ý</span><strong>{selected.risk === "Cao" ? "Đóng vòng phản hồi" : selected.risk === "Theo dõi" ? "Xác nhận kỳ vọng" : "Duy trì review định kỳ"}</strong></li></ul></section>
        </aside>
      </section>
    </div>
  );
}

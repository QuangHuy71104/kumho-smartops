"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useLocalStorageState } from "../../_hooks/useLocalStorageState";
import {
  buildContractRequest,
  CONTRACT_FILTERS,
  CONTRACT_STAGES,
  CONTRACT_STORAGE_KEY,
  decodeCreatedContractRequests,
  DESTINATION_OPTIONS,
  EMPTY_CONTRACT_DRAFT,
  EMPTY_CREATED_REQUESTS,
  formatContractDate,
  formatContractValue,
  mergeContractRequests,
  nextContractStage,
  PICKUP_OPTIONS,
  validateContractDraft,
  vehicleCapacity,
  type ContractDraft,
  type ContractRequest,
  type CustomerGroupType,
  type VehicleOption,
} from "../_lib/contract-data";
import styles from "../Contracts.module.css";

export default function ContractPipelineClient() {
  const [created, setCreated, resetCreated] = useLocalStorageState({ key: CONTRACT_STORAGE_KEY, initialValue: EMPTY_CREATED_REQUESTS, decode: decodeCreatedContractRequests });
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof CONTRACT_FILTERS)[number]>("Tất cả");
  const [selectedId, setSelectedId] = useState("HĐ-DEMO-1042");
  const [draft, setDraft] = useState<ContractDraft>(EMPTY_CONTRACT_DRAFT);
  const [formError, setFormError] = useState("");
  const [announcement, setAnnouncement] = useState("");

  const requests = useMemo(() => mergeContractRequests(created), [created]);
  const visible = useMemo(() => {
    const normalized = query.trim().toLocaleLowerCase("vi");
    return requests.filter((request) => (statusFilter === "Tất cả" || request.status === statusFilter)
      && (!normalized || [request.id, request.title, request.groupType, request.owner, request.destination].join(" ").toLocaleLowerCase("vi").includes(normalized)));
  }, [query, requests, statusFilter]);
  const selected = requests.find((request) => request.id === selectedId) ?? requests[0];

  function submitRequest(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const error = validateContractDraft(draft);
    if (error) {
      setFormError(error);
      setAnnouncement(error);
      return;
    }
    const request = buildContractRequest(draft, Date.now());
    setCreated((current) => [request, ...current]);
    setSelectedId(request.id);
    setDraft(EMPTY_CONTRACT_DRAFT);
    setFormError("");
    setAnnouncement(`Đã tạo yêu cầu ${request.id} trong pipeline demo.`);
  }

  function advanceRequest(request: ContractRequest) {
    const nextStage = nextContractStage(request.status);
    if (!nextStage) return;
    const updated = { ...request, status: nextStage };
    setCreated((current) => current.some((item) => item.id === request.id)
      ? current.map((item) => item.id === request.id ? updated : item)
      : [updated, ...current]);
    setSelectedId(updated.id);
    setAnnouncement(`Đã chuyển ${request.id} sang ${nextStage}.`);
  }

  function patchDraft(values: Partial<ContractDraft>) {
    setDraft((current) => ({ ...current, ...values }));
    setFormError("");
  }

  const nextStage = selected ? nextContractStage(selected.status) : null;

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-atomic="true" aria-live="polite">{announcement}</p>

      <section className={styles.metrics} aria-label="Tổng hợp pipeline hợp đồng">
        <article><span>Yêu cầu đang mở</span><strong>{String(requests.filter((item) => item.status !== "Đã xác nhận").length).padStart(2, "0")}</strong><small>toàn bộ pipeline demo</small></article>
        <article><span>Chờ lập báo giá</span><strong>{String(requests.filter((item) => item.status === "Chờ báo giá").length).padStart(2, "0")}</strong><small>cần hoàn thiện phương án</small></article>
        <article><span>Giá trị tham khảo</span><strong>{formatContractValue(requests.reduce((sum, item) => sum + item.estimatedValue, 0))}</strong><small>không phải doanh thu thực tế</small></article>
        <article><span>Tỷ lệ xác nhận mẫu</span><strong>68%</strong><small>chỉ số trình diễn</small></article>
      </section>

      <section className={styles.controlBar} aria-label="Tìm và lọc yêu cầu">
        <label><span>Tìm kiếm pipeline</span><input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Mã, hành trình, nhóm phụ trách..." /></label>
        <label><span>Trạng thái</span><select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as (typeof CONTRACT_FILTERS)[number])}>{CONTRACT_FILTERS.map((item) => <option key={item}>{item}</option>)}</select></label>
        {created.length > 0 ? <button onClick={resetCreated} type="button">Xóa yêu cầu tự tạo</button> : <span>{visible.length} yêu cầu phù hợp</span>}
      </section>

      <section className={styles.pipeline} aria-labelledby="pipeline-title">
        <div className={styles.sectionHeading}><div><span>Sales workflow</span><h2 id="pipeline-title">Pipeline yêu cầu thuê xe</h2></div><p>Kéo ngang để xem toàn bộ giai đoạn trên màn hình nhỏ.</p></div>
        <div className={styles.pipelineScroller}>
          {CONTRACT_STAGES.map((stage) => {
            const stageRequests = visible.filter((request) => request.status === stage);
            return <section className={styles.stage} key={stage} aria-label={`${stage}: ${stageRequests.length} yêu cầu`}><header><span>{stage}</span><strong>{stageRequests.length}</strong></header><div>{stageRequests.map((request) => <button aria-pressed={selected?.id === request.id} className={selected?.id === request.id ? styles.requestActive : styles.requestCard} key={request.id} onClick={() => setSelectedId(request.id)} type="button"><span>{request.id}</span><strong>{request.title}</strong><small>{request.groupType} · {request.passengerCount} khách</small><dl><div><dt>Phương án</dt><dd>{request.vehicleCount} × {request.vehicleType}</dd></div><div><dt>Dự kiến</dt><dd>{formatContractValue(request.estimatedValue)}</dd></div></dl><em>{request.owner}</em></button>)}</div>{stageRequests.length === 0 ? <p>Chưa có yêu cầu</p> : null}</section>;
          })}
        </div>
      </section>

      <div className={styles.lowerGrid}>
        <section className={styles.detail} aria-labelledby="request-detail-title" aria-live="polite">
          {selected ? <><div className={styles.detailHeading}><div><span>{selected.id}</span><h2 id="request-detail-title">{selected.title}</h2><p>{selected.groupType} · Tạo {selected.createdAt}</p></div><i data-status={selected.status}>{selected.status}</i></div><dl className={styles.detailGrid}><div><dt>Quy mô đoàn</dt><dd>{selected.passengerCount} khách</dd></div><div><dt>Phương án xe</dt><dd>{selected.vehicleCount} × {selected.vehicleType}</dd></div><div><dt>Thời gian</dt><dd>{formatContractDate(selected.startDate)} – {formatContractDate(selected.endDate)}</dd></div><div><dt>Chủ sở hữu</dt><dd>{selected.owner}</dd></div><div><dt>Điểm đón</dt><dd>{selected.pickup}</dd></div><div><dt>Điểm đến</dt><dd>{selected.destination}</dd></div></dl><div className={styles.capacity}><div><span>Nhu cầu ghế</span><strong>{selected.passengerCount}/{vehicleCapacity(selected.vehicleType) * selected.vehicleCount}</strong></div><div className={styles.capacityBar} role="progressbar" aria-label="Tỷ lệ sử dụng ghế dự kiến" aria-valuemin={0} aria-valuemax={vehicleCapacity(selected.vehicleType) * selected.vehicleCount} aria-valuenow={selected.passengerCount}><span style={{ width: `${Math.min(100, (selected.passengerCount / (vehicleCapacity(selected.vehicleType) * selected.vehicleCount)) * 100)}%` }} /></div></div><div className={styles.gates}><h3>Kiểm soát trước báo giá</h3>{["Xác nhận quy mô và thời gian", "Kiểm tra khả dụng loại xe", "Ước tính hành trình và chi phí", "Peer review trước khi gửi"].map((item, index) => <div key={item}><span>{index + 1}</span><p><strong>{item}</strong><small>{index < CONTRACT_STAGES.indexOf(selected.status) ? "Đã mô phỏng" : "Chờ thực hiện"}</small></p></div>)}</div>{nextStage ? <button className={styles.advanceButton} onClick={() => advanceRequest(selected)} type="button">Chuyển sang “{nextStage}”</button> : <div className={styles.confirmed}>Yêu cầu đã ở trạng thái xác nhận demo.</div>}</> : null}
        </section>

        <section className={styles.createPanel} id="tao-yeu-cau" aria-labelledby="create-request-title">
          <div className={styles.createHeading}><span>Chỉ lưu trên thiết bị</span><h2 id="create-request-title">Tạo yêu cầu báo giá demo</h2><p>Không nhập tên, số điện thoại, địa chỉ hoặc lịch trình thật.</p></div>
          <form onSubmit={submitRequest}>
            <label className={styles.fullField}><span>Tên hành trình mô phỏng</span><input required minLength={8} maxLength={80} value={draft.title} onChange={(event) => patchDraft({ title: event.target.value })} /></label>
            <label><span>Loại đoàn</span><select value={draft.groupType} onChange={(event) => patchDraft({ groupType: event.target.value as CustomerGroupType })}><option>Doanh nghiệp mô phỏng</option><option>Đoàn thể mô phỏng</option><option>Nhóm khách mô phỏng</option></select></label>
            <label><span>Quy mô khách</span><input type="number" min={1} max={450} value={draft.passengerCount} onChange={(event) => patchDraft({ passengerCount: Number(event.target.value) })} /></label>
            <label><span>Loại xe</span><select value={draft.vehicleType} onChange={(event) => patchDraft({ vehicleType: event.target.value as VehicleOption })}><option>Xe 16 chỗ</option><option>Xe 29 chỗ</option><option>Xe 45 chỗ</option></select></label>
            <label><span>Số lượng xe</span><input type="number" min={1} max={10} value={draft.vehicleCount} onChange={(event) => patchDraft({ vehicleCount: Number(event.target.value) })} /></label>
            <label><span>Ngày bắt đầu</span><input required type="date" value={draft.startDate} onChange={(event) => patchDraft({ startDate: event.target.value })} /></label>
            <label><span>Ngày kết thúc</span><input required type="date" value={draft.endDate} onChange={(event) => patchDraft({ endDate: event.target.value })} /></label>
            <label><span>Điểm đón demo</span><select value={draft.pickup} onChange={(event) => patchDraft({ pickup: event.target.value })}>{PICKUP_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label><span>Điểm đến demo</span><select value={draft.destination} onChange={(event) => patchDraft({ destination: event.target.value })}>{DESTINATION_OPTIONS.map((item) => <option key={item}>{item}</option>)}</select></label>
            {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}
            <div className={styles.estimate}><span>Ước tính demo được tính sau khi tạo</span><strong>Không phải báo giá chính thức</strong></div>
            <button className={styles.submitButton} type="submit">Tạo yêu cầu demo</button>
          </form>
        </section>
      </div>
    </div>
  );
}

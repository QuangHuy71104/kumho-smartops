"use client";

import { type FormEvent, type RefObject, useRef, useState } from "react";
import {
  CARGO_TYPES,
  SERVICE_TYPES,
  type CargoType,
  type CreateOrderInput,
  type ServiceType,
} from "../_lib/orders";
import styles from "../page.module.css";

type CreateOrderDialogProps = {
  dialogRef: RefObject<HTMLDialogElement | null>;
  returnFocusRef: RefObject<HTMLButtonElement | null>;
  onCreate: (input: CreateOrderInput) => void;
};

const initialDraft = {
  customerAlias: "Công ty TNHH Thành Công",
  service: "Hàng ghép liên tỉnh" as ServiceType,
  cargo: "Kiện tổng hợp" as CargoType,
  origin: "TP. Hồ Chí Minh",
  destination: "Đồng Nai",
  pickupWindow: "2026-08-22T09:00",
  packageCount: "10",
  weightKg: "250",
  note: "",
};

function toPickupLabel(value: string) {
  const [date = "", time = ""] = value.split("T");
  const [year, month, day] = date.split("-");
  if (!year || !month || !day || !time) return value;
  return `${day}/${month}/${year} · ${time}`;
}

export default function CreateOrderDialog({
  dialogRef,
  returnFocusRef,
  onCreate,
}: CreateOrderDialogProps) {
  const firstInputRef = useRef<HTMLInputElement>(null);
  const [draft, setDraft] = useState(initialDraft);
  const [formError, setFormError] = useState("");

  function closeDialog() {
    dialogRef.current?.close();
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.origin.trim().toLocaleLowerCase("vi-VN") === draft.destination.trim().toLocaleLowerCase("vi-VN")) {
      setFormError("Điểm đi và điểm đến cần khác nhau trong phương án vận chuyển.");
      return;
    }

    const packageCount = Number(draft.packageCount);
    const weightKg = Number(draft.weightKg);
    if (!Number.isInteger(packageCount) || packageCount < 1 || weightKg <= 0) {
      setFormError("Số kiện và khối lượng cần lớn hơn 0; số kiện phải là số nguyên.");
      return;
    }

    onCreate({
      customerAlias: draft.customerAlias,
      service: draft.service,
      cargo: draft.cargo,
      origin: draft.origin,
      destination: draft.destination,
      pickupWindow: toPickupLabel(draft.pickupWindow),
      packageCount,
      weightKg,
      note: draft.note,
    });
    setDraft(initialDraft);
    setFormError("");
    closeDialog();
  }

  return (
    <dialog
      className={styles.dialog}
      ref={dialogRef}
      aria-labelledby="create-order-title"
      aria-describedby="create-order-description"
      onClose={() => returnFocusRef.current?.focus()}
    >
      <form className={styles.dialogForm} onSubmit={handleSubmit}>
        <div className={styles.dialogHeading}>
          <div>
            <span className={styles.eyebrow}>Lệnh vận chuyển mới</span>
            <h2 id="create-order-title">Tạo đơn vận tải</h2>
            <p id="create-order-description">
              Đơn hàng sẽ được bổ sung vào danh sách vận hành sau khi xác nhận.
            </p>
          </div>
          <button className={styles.iconButton} type="button" onClick={closeDialog} aria-label="Đóng hộp thoại tạo đơn">
            ×
          </button>
        </div>

        <div className={styles.dialogGrid}>
          <label className={styles.fieldWide}>
            <span>Tên gợi nhớ khách hàng</span>
            <input
              ref={firstInputRef}
              required
              maxLength={80}
              value={draft.customerAlias}
              onChange={(event) => setDraft((current) => ({ ...current, customerAlias: event.target.value }))}
              onFocus={() => setFormError("")}
            />
            <small>Thông tin liên hệ được đối chiếu từ hồ sơ khách hàng sau khi tạo đơn.</small>
          </label>

          <label className={styles.field}>
            <span>Dịch vụ</span>
            <select
              value={draft.service}
              onChange={(event) => setDraft((current) => ({ ...current, service: event.target.value as ServiceType }))}
            >
              {SERVICE_TYPES.map((service) => <option key={service}>{service}</option>)}
            </select>
          </label>

          <label className={styles.field}>
            <span>Loại hàng</span>
            <select
              value={draft.cargo}
              onChange={(event) => setDraft((current) => ({ ...current, cargo: event.target.value as CargoType }))}
            >
              {CARGO_TYPES.map((cargo) => <option key={cargo}>{cargo}</option>)}
            </select>
          </label>

          <label className={styles.field}>
            <span>Điểm đi</span>
            <input
              required
              maxLength={80}
              value={draft.origin}
              onChange={(event) => setDraft((current) => ({ ...current, origin: event.target.value }))}
            />
          </label>

          <label className={styles.field}>
            <span>Điểm đến</span>
            <input
              required
              maxLength={80}
              value={draft.destination}
              onChange={(event) => setDraft((current) => ({ ...current, destination: event.target.value }))}
            />
          </label>

          <label className={styles.fieldWide}>
            <span>Thời gian lấy hàng dự kiến</span>
            <input
              required
              type="datetime-local"
              value={draft.pickupWindow}
              onChange={(event) => setDraft((current) => ({ ...current, pickupWindow: event.target.value }))}
            />
          </label>

          <label className={styles.field}>
            <span>Số kiện</span>
            <input
              required
              inputMode="numeric"
              min="1"
              max="9999"
              step="1"
              type="number"
              value={draft.packageCount}
              onChange={(event) => setDraft((current) => ({ ...current, packageCount: event.target.value }))}
            />
          </label>

          <label className={styles.field}>
            <span>Khối lượng (kg)</span>
            <input
              required
              inputMode="decimal"
              min="1"
              max="50000"
              step="0.1"
              type="number"
              value={draft.weightKg}
              onChange={(event) => setDraft((current) => ({ ...current, weightKg: event.target.value }))}
            />
          </label>

          <label className={styles.fieldWide}>
            <span>Ghi chú vận hành</span>
            <textarea
              maxLength={300}
              rows={3}
              placeholder="Ví dụ: ưu tiên gom theo cụm tuyến khai thác"
              value={draft.note}
              onChange={(event) => setDraft((current) => ({ ...current, note: event.target.value }))}
            />
          </label>
        </div>

        {formError ? <p className={styles.formError} role="alert">{formError}</p> : null}

        <div className={styles.dialogActions}>
          <button className={styles.secondaryButton} type="button" onClick={closeDialog}>Hủy</button>
          <button className={styles.primaryButton} type="submit">Lưu đơn</button>
        </div>
      </form>
    </dialog>
  );
}

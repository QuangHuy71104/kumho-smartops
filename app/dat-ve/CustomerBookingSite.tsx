"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { AppUser } from "../../lib/supabase/server.ts";
import {
  DEFAULT_ROUTE_ID,
  DEFAULT_TRAVEL_DATE,
  formatDemoPrice,
  formatTravelDate,
  routeForTrip,
  seatsFor,
  ticketRoutes,
  ticketTrips,
  TRAVEL_DATES,
  tripsFor,
  type TicketTrip,
} from "../ve-xe/_lib/ticket-data.ts";
import styles from "./customer-booking.module.css";

type CartItem = { tripId: string; seats: string[] };
type Props = { user: AppUser | null; authConfigured: boolean };
const CART_KEY = "kumhogo:cart:v1";

function decodeCart(value: unknown): CartItem[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!item || typeof item !== "object") return [];
    const candidate = item as Record<string, unknown>;
    const trip = ticketTrips.find((entry) => entry.id === candidate.tripId);
    if (!trip || !Array.isArray(candidate.seats)) return [];
    const seats = [...new Set(candidate.seats.filter((seat): seat is string => (
      typeof seat === "string" && /^[A-D]\d{2}$/.test(seat)
    )))].slice(0, 10);
    return seats.length ? [{ tripId: trip.id, seats }] : [];
  }).slice(0, 5);
}

function GoogleMark() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M21.8 12.2c0-.7-.1-1.4-.2-2H12v3.9h5.5a4.7 4.7 0 0 1-2 3.1v2.6h3.2c1.9-1.8 3.1-4.4 3.1-7.6Z" />
      <path fill="#34A853" d="M12 22c2.7 0 5-.9 6.7-2.4l-3.2-2.6c-.9.6-2 1-3.5 1a5.9 5.9 0 0 1-5.5-4.1H3.2v2.6A10 10 0 0 0 12 22Z" />
      <path fill="#FBBC05" d="M6.5 13.9A6 6 0 0 1 6.2 12c0-.7.1-1.3.3-1.9V7.5H3.2A10 10 0 0 0 2 12c0 1.6.4 3.1 1.2 4.5l3.3-2.6Z" />
      <path fill="#EA4335" d="M12 6c1.6 0 3 .5 4.1 1.6l3-3A10 10 0 0 0 3.2 7.5l3.3 2.6A5.9 5.9 0 0 1 12 6Z" />
    </svg>
  );
}

export default function CustomerBookingSite({ user, authConfigured }: Props) {
  const [routeId, setRouteId] = useState(DEFAULT_ROUTE_ID);
  const [travelDate, setTravelDate] = useState(DEFAULT_TRAVEL_DATE);
  const [search, setSearch] = useState({ routeId: DEFAULT_ROUTE_ID, date: DEFAULT_TRAVEL_DATE });
  const [cart, setCart] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [selectedTrip, setSelectedTrip] = useState<TicketTrip | null>(null);
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [customerName, setCustomerName] = useState(user?.displayName ?? "");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Chưa chọn");
  const [checkoutState, setCheckoutState] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [message, setMessage] = useState("");
  const seatDialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      try { setCart(decodeCart(JSON.parse(localStorage.getItem(CART_KEY) ?? "[]"))); } catch { setCart([]); }
      setHydrated(true);
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (hydrated) localStorage.setItem(CART_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const results = useMemo(() => tripsFor(search.routeId, search.date), [search]);
  const cartDetails = useMemo(() => cart.flatMap((item) => {
    const trip = ticketTrips.find((candidate) => candidate.id === item.tripId);
    return trip ? [{ ...item, trip, route: routeForTrip(trip), total: trip.price * item.seats.length }] : [];
  }), [cart]);
  const cartCount = cart.reduce((sum, item) => sum + item.seats.length, 0);
  const cartTotal = cartDetails.reduce((sum, item) => sum + item.total, 0);

  function openSeats(trip: TicketTrip) {
    setSelectedTrip(trip);
    setSelectedSeats(cart.find((item) => item.tripId === trip.id)?.seats ?? []);
    seatDialog.current?.showModal();
  }

  function toggleSeat(code: string, unavailable: boolean) {
    if (unavailable) return;
    setSelectedSeats((current) => current.includes(code)
      ? current.filter((seat) => seat !== code)
      : current.length < 10 ? [...current, code] : current);
  }

  function addSelectedSeats() {
    if (!selectedTrip || selectedSeats.length === 0) return;
    setCart((current) => [
      ...current.filter((item) => item.tripId !== selectedTrip.id),
      { tripId: selectedTrip.id, seats: selectedSeats },
    ]);
    seatDialog.current?.close();
    document.getElementById("gio-ve")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function checkout() {
    if (!user) return;
    setCheckoutState("submitting");
    setMessage("");
    try {
      const response = await fetch("/api/customer/orders", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ customerName, customerPhone, paymentMethod, items: cart }),
      });
      const payload = await response.json() as { order?: { id: string }; detail?: string };
      if (!response.ok || !payload.order) throw new Error(payload.detail ?? "Không thể giữ chỗ lúc này.");
      setCart([]);
      setCheckoutState("success");
      setMessage(`Đặt vé thành công. Mã đơn của bạn là ${payload.order.id}.`);
    } catch (error) {
      setCheckoutState("error");
      setMessage(error instanceof Error ? error.message : "Không thể đặt vé lúc này.");
    }
  }

  const selectedSeatInventory = selectedTrip ? seatsFor(selectedTrip) : [];
  const seatsInOtherCartItems = new Set(cart
    .filter((item) => item.tripId === selectedTrip?.id)
    .flatMap((item) => item.seats));

  return (
    <div className={styles.site}>
      <header className={styles.header}>
        <a className={styles.brand} href="/dat-ve" aria-label="KumhoGo - Trang đặt vé">
          <span className={styles.brandMark}>K</span>
          <span><strong>KumhoGo</strong><small>Đi đúng chuyến · Trọn hành trình</small></span>
        </a>
        <nav aria-label="Điều hướng website khách hàng">
          <a href="#tim-chuyen">Tìm chuyến</a><a href="#vi-sao">Dịch vụ</a><a href="#ho-tro">Hỗ trợ</a>
        </nav>
        <div className={styles.headerActions}>
          <a className={styles.adminLink} href="/quan-tri/dang-nhap">Dành cho nhà xe</a>
          {user ? (
            <div className={styles.userMenu}>
              <span>{user.displayName.slice(0, 1).toUpperCase()}</span><strong>{user.displayName}</strong>
              <form action="/auth/customer/signout" method="post"><button type="submit">Đăng xuất</button></form>
            </div>
          ) : <a className={styles.loginButton} href="/dat-ve/dang-nhap"><GoogleMark /> Đăng nhập</a>}
          <a className={styles.cartButton} href="#gio-ve" aria-label={`Giỏ vé có ${cartCount} vé`}>
            <span aria-hidden="true">▣</span> Giỏ vé <b>{cartCount}</b>
          </a>
        </div>
      </header>

      <main>
        <section className={styles.hero} id="tim-chuyen">
          <div className={styles.heroGlow} aria-hidden="true" />
          <div className={styles.heroCopy}>
            <span className={styles.kicker}>ĐẶT VÉ CHÍNH HÃNG · CHỌN GHẾ TRỰC TIẾP</span>
            <h1>Đi xa thật nhẹ,<br /><em>đặt vé thật nhanh.</em></h1>
            <p>Chọn chuyến, chọn ghế và quản lý hành trình trong một trải nghiệm duy nhất.</p>
            <div className={styles.heroTrust}><span>✓ Đúng giá</span><span>✓ Giữ ghế tức thì</span><span>✓ Hỗ trợ 24/7</span></div>
          </div>
          <div className={styles.routeArt} aria-hidden="true">
            <div className={styles.sun} /><div className={styles.road} /><div className={styles.bus}>KUMHO<span>GO</span></div>
          </div>
          <form className={styles.searchCard} onSubmit={(event) => { event.preventDefault(); setSearch({ routeId, date: travelDate }); }}>
            <label><span>Tuyến đường</span><select value={routeId} onChange={(event) => setRouteId(event.target.value)}>{ticketRoutes.map((route) => <option key={route.id} value={route.id}>{route.origin} → {route.destination}</option>)}</select></label>
            <label><span>Ngày khởi hành</span><select value={travelDate} onChange={(event) => setTravelDate(event.target.value)}>{TRAVEL_DATES.map((date) => <option key={date} value={date}>{formatTravelDate(date)}</option>)}</select></label>
            <label><span>Hành khách</span><select defaultValue="1"><option value="1">1 hành khách</option><option value="2">2 hành khách</option><option value="3">3 hành khách</option><option value="4">4 hành khách</option></select></label>
            <button type="submit">Tìm chuyến xe</button>
          </form>
        </section>

        <section className={styles.contentGrid}>
          <div className={styles.results}>
            <div className={styles.sectionHeading}>
              <div><span>CHUYẾN PHÙ HỢP</span><h2>{results.length} chuyến đang mở bán</h2><p>{formatTravelDate(search.date)}</p></div>
              <div className={styles.livePill}><i /> Dữ liệu trực tuyến</div>
            </div>
            {results.length ? results.map((trip, index) => {
              const route = routeForTrip(trip);
              const available = trip.capacity - trip.reservedSeats.length;
              const inCart = cart.find((item) => item.tripId === trip.id)?.seats.length ?? 0;
              return (
                <article className={styles.tripCard} key={trip.id}>
                  <div className={styles.tripRibbon}>{index === 0 ? "Phổ biến" : trip.serviceClass}</div>
                  <div className={styles.timeBlock}><strong>{trip.departure}</strong><span>{route.origin}</span></div>
                  <div className={styles.journey}><span>{route.duration}</span><div><i /><b /><i /></div><small>Chạy thẳng</small></div>
                  <div className={styles.timeBlock}><strong>{trip.arrival}</strong><span>{route.destination}</span></div>
                  <div className={styles.tripMeta}><span>◫ {trip.vehicle}</span><span>⌁ {trip.serviceClass}</span><span>✓ Còn {available} ghế</span></div>
                  <div className={styles.priceBlock}><small>Từ</small><strong>{formatDemoPrice(trip.price)}</strong><span>/ vé</span><button type="button" onClick={() => openSeats(trip)}>{inCart ? `Đã chọn ${inCart} ghế` : "Chọn ghế"}</button></div>
                </article>
              );
            }) : <div className={styles.empty}>Chưa có chuyến phù hợp trong ngày đã chọn.</div>}
          </div>

          <aside className={styles.cartPanel} id="gio-ve">
            <div className={styles.cartTitle}><span>Giỏ vé của bạn</span><b>{cartCount} vé</b></div>
            {cartDetails.length ? <div className={styles.cartItems}>{cartDetails.map((item) => (
              <article key={item.tripId}>
                <button type="button" aria-label="Xóa chuyến khỏi giỏ" onClick={() => setCart((current) => current.filter((entry) => entry.tripId !== item.tripId))}>×</button>
                <span>{item.route.origin} → {item.route.destination}</span>
                <strong>{item.trip.departure} · {formatTravelDate(item.trip.date)}</strong>
                <small>Ghế {item.seats.join(", ")} · {formatDemoPrice(item.total)}</small>
              </article>
            ))}</div> : <div className={styles.cartEmpty}><span>▣</span><strong>Giỏ vé đang trống</strong><p>Chọn một chuyến xe và ghế ngồi phù hợp để bắt đầu.</p></div>}

            {cartDetails.length ? (
              <div className={styles.checkout}>
                <label>Họ và tên<input value={customerName} onChange={(event) => setCustomerName(event.target.value)} placeholder="Nguyễn Văn A" /></label>
                <label>Số điện thoại<input value={customerPhone} onChange={(event) => setCustomerPhone(event.target.value)} inputMode="tel" placeholder="0901 234 567" /></label>
                <label>Thanh toán<select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option>Chưa chọn</option><option>Chuyển khoản</option><option>Thẻ ngân hàng</option><option>Ví điện tử</option><option>Tiền mặt</option></select></label>
                <div className={styles.total}><span>Tổng thanh toán</span><strong>{formatDemoPrice(cartTotal)}</strong></div>
                {user ? <button className={styles.checkoutButton} type="button" disabled={checkoutState === "submitting" || customerName.trim().length < 2 || (customerPhone.match(/\d/g)?.length ?? 0) < 7} onClick={checkout}>{checkoutState === "submitting" ? "Đang giữ ghế..." : "Xác nhận đặt vé"}</button>
                  : <a className={styles.googleCheckout} href="/auth/customer/google?next=%2Fdat-ve%23gio-ve"><GoogleMark /> Đăng nhập Google để đặt vé</a>}
                {!authConfigured ? <p className={styles.configNote}>Đăng nhập Google sẽ hoạt động sau khi nhà xe hoàn tất cấu hình xác thực.</p> : null}
                {message ? <p className={checkoutState === "success" ? styles.success : styles.error} role="status">{message}</p> : null}
                <small className={styles.secure}>✓ Ghế chỉ được giữ sau khi đăng nhập và xác nhận</small>
              </div>
            ) : null}
          </aside>
        </section>

        <section className={styles.benefits} id="vi-sao">
          <div><span>01</span><strong>Chọn đúng ghế</strong><p>Sơ đồ ghế trực quan, cập nhật theo từng chuyến.</p></div>
          <div><span>02</span><strong>Thông tin minh bạch</strong><p>Giờ chạy, điểm đón và giá vé hiển thị rõ ràng.</p></div>
          <div><span>03</span><strong>Một tài khoản Google</strong><p>Đăng nhập nhanh, xem lại toàn bộ hành trình đã đặt.</p></div>
        </section>
      </main>

      <footer className={styles.footer} id="ho-tro"><div><strong>KumhoGo</strong><p>Nền tảng đặt vé chính thức của Kumho SmartOps.</p></div><div><span>Hỗ trợ đặt vé</span><strong>1900 6065</strong><small>06:00 – 22:00 mỗi ngày</small></div><p>© 2026 KumhoGo. Đi đúng chuyến, trọn hành trình.</p></footer>

      <dialog className={styles.seatDialog} ref={seatDialog} onClose={() => setSelectedSeats([])}>
        {selectedTrip ? <div className={styles.seatDialogInner}>
          <div className={styles.dialogHeader}><div><span>CHỌN GHẾ</span><h2>{selectedTrip.departure} · {routeForTrip(selectedTrip).origin}</h2><p>{formatTravelDate(selectedTrip.date)} · {selectedTrip.vehicle}</p></div><button type="button" aria-label="Đóng" onClick={() => seatDialog.current?.close()}>×</button></div>
          <div className={styles.seatLegend}><span><i className={styles.availableSeat} /> Còn trống</span><span><i className={styles.selectedSeat} /> Đang chọn</span><span><i className={styles.unavailableSeat} /> Đã đặt</span></div>
          <div className={styles.seatMap}><div className={styles.driver}>Vô lăng</div>{Array.from({ length: Math.ceil(selectedSeatInventory.length / 4) }, (_, row) => <div className={styles.seatRow} key={row}>{selectedSeatInventory.slice(row * 4, row * 4 + 4).map((seat) => {
            const unavailable = seat.reserved && !seatsInOtherCartItems.has(seat.code);
            const selected = selectedSeats.includes(seat.code);
            return <button type="button" key={seat.code} disabled={unavailable} className={selected ? styles.seatSelected : unavailable ? styles.seatUnavailable : ""} onClick={() => toggleSeat(seat.code, unavailable)}>{seat.code}</button>;
          })}</div>)}</div>
          <div className={styles.dialogFooter}><div><span>{selectedSeats.length} ghế</span><strong>{formatDemoPrice(selectedSeats.length * selectedTrip.price)}</strong></div><button type="button" disabled={!selectedSeats.length} onClick={addSelectedSeats}>Thêm vào giỏ vé</button></div>
        </div> : null}
      </dialog>
    </div>
  );
}

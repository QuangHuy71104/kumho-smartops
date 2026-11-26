"use client";

import { type FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useDemoAccess } from "../../_components/access/DemoAccessProvider";
import { useWorkspaceState } from "../../_hooks/useWorkspaceState";
import {
  availableSeatCount,
  bookingForSeat,
  BOOKING_STORAGE_KEY,
  BOOKING_CHANNELS,
  createDemoBooking,
  decodeDemoBookings,
  DEFAULT_ROUTE_ID,
  DEFAULT_TRAVEL_DATE,
  formatDemoPrice,
  formatTravelDate,
  INITIAL_BOOKINGS,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  routeForTrip,
  routeLabel,
  seatsFor,
  ticketRoutes,
  ticketTrips,
  tripsFor,
  withSeatBookingFixtures,
  type BookingDetails,
  type DemoBooking,
  type TicketTrip,
} from "../_lib/ticket-data";
import styles from "../Tickets.module.css";

const INITIAL_BOOKING_DETAILS: BookingDetails = {
  customerName: "",
  customerPhone: "",
  bookingChannel: "Tại quầy",
  paymentStatus: "Chưa thanh toán",
  paymentMethod: "Chưa chọn",
};

function contactHref(phone: string) {
  const normalized = phone.replace(/[^\d+]/g, "");
  return normalized.replace(/\D/g, "").length >= 7 ? `tel:${normalized}` : undefined;
}

export default function TicketBookingClient() {
  const { can } = useDemoAccess();
  const canCreateBooking = can("booking:create");
  const canCancelBooking = can("booking:cancel");
  const initialTrips = tripsFor(DEFAULT_ROUTE_ID, DEFAULT_TRAVEL_DATE);
  const [routeDraft, setRouteDraft] = useState(DEFAULT_ROUTE_ID);
  const [dateDraft, setDateDraft] = useState(DEFAULT_TRAVEL_DATE);
  const [search, setSearch] = useState({ routeId: DEFAULT_ROUTE_ID, date: DEFAULT_TRAVEL_DATE });
  const [selectedTripId, setSelectedTripId] = useState(initialTrips[0]?.id ?? "");
  const [selectedSeats, setSelectedSeats] = useState<string[]>([]);
  const [bookingDetails, setBookingDetails] = useState<BookingDetails>(INITIAL_BOOKING_DETAILS);
  const [bookingSearch, setBookingSearch] = useState("");
  const [selectedBooking, setSelectedBooking] = useState<DemoBooking | null>(null);
  const [announcement, setAnnouncement] = useState("");
  const bookingDialogRef = useRef<HTMLDialogElement>(null);
  const [bookings, setBookings, resetBookings] = useWorkspaceState({
    stateKey: "bookings",
    cacheKey: BOOKING_STORAGE_KEY,
    initialValue: INITIAL_BOOKINGS,
    decode: decodeDemoBookings,
  });

  const visibleBookings = useMemo(() => withSeatBookingFixtures(bookings), [bookings]);
  const matchingTrips = useMemo(() => tripsFor(search.routeId, search.date), [search]);
  const selectedTrip = matchingTrips.find((trip) => trip.id === selectedTripId) ?? matchingTrips[0] ?? null;
  const seatRows = useMemo(() => {
    if (!selectedTrip) return [];
    const seats = seatsFor(selectedTrip, visibleBookings);
    return Array.from({ length: Math.ceil(seats.length / 4) }, (_, index) => seats.slice(index * 4, index * 4 + 4));
  }, [selectedTrip, visibleBookings]);
  const contactReady = bookingDetails.customerName.trim().length >= 2
    && (bookingDetails.customerPhone.match(/\d/g)?.length ?? 0) >= 7;
  const filteredBookings = useMemo(() => {
    const keyword = bookingSearch.trim().toLocaleLowerCase("vi");
    if (!keyword) return visibleBookings;
    return visibleBookings.filter((booking) => [
      booking.id,
      booking.customerName,
      booking.customerPhone,
      booking.routeLabel,
      booking.bookingChannel,
    ].some((value) => value.toLocaleLowerCase("vi").includes(keyword)));
  }, [bookingSearch, visibleBookings]);

  useEffect(() => {
    const dialog = bookingDialogRef.current;
    if (!dialog) return;
    if (selectedBooking && !dialog.open) dialog.showModal();
    if (!selectedBooking && dialog.open) dialog.close();
  }, [selectedBooking]);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const results = tripsFor(routeDraft, dateDraft);
    setSearch({ routeId: routeDraft, date: dateDraft });
    setSelectedTripId(results[0]?.id ?? "");
    setSelectedSeats([]);
    setAnnouncement(results.length > 0 ? `Đã tìm thấy ${results.length} chuyến phù hợp.` : "Không có chuyến phù hợp.");
  }

  function selectTrip(trip: TicketTrip) {
    setSelectedTripId(trip.id);
    setSelectedSeats([]);
    setAnnouncement(`Đã chọn chuyến ${trip.id}, khởi hành lúc ${trip.departure}.`);
  }

  function toggleSeat(code: string) {
    setSelectedSeats((current) => current.includes(code) ? current.filter((seat) => seat !== code) : [...current, code]);
    setAnnouncement(`Đã cập nhật lựa chọn ghế ${code}.`);
  }

  function confirmBooking() {
    if (!canCreateBooking) {
      setAnnouncement("Vai trò hiện tại không có quyền tạo đặt chỗ.");
      return;
    }
    if (!selectedTrip || selectedSeats.length === 0) {
      setAnnouncement("Hãy chọn ít nhất một ghế còn trống trước khi giữ chỗ.");
      return;
    }
    if (!contactReady) {
      setAnnouncement("Hãy nhập họ tên và số điện thoại hợp lệ để có thể liên hệ hành khách.");
      return;
    }
    const booking = createDemoBooking(selectedTrip, selectedSeats, Date.now(), bookingDetails);
    setBookings((current) => [booking, ...current].slice(0, 20));
    setSelectedSeats([]);
    setBookingDetails(INITIAL_BOOKING_DETAILS);
    setAnnouncement(`Đã tạo ${booking.id} cho ${booking.customerName}.`);
  }

  function cancelBooking(id: string) {
    if (!canCancelBooking) {
      setAnnouncement("Vai trò hiện tại không có quyền hủy đặt chỗ.");
      return;
    }
    const target = visibleBookings.find((booking) => booking.id === id);
    if (!target) return;
    setBookings((current) => current.some((booking) => booking.id === id)
      ? current.map((booking) => booking.id === id ? { ...booking, status: "Đã hủy" } : booking)
      : [{ ...target, status: "Đã hủy" as const }, ...current].slice(0, 100));
    setAnnouncement(`Đã hủy bản ghi đặt chỗ ${id}.`);
  }

  function clearBookingHistory() {
    resetBookings();
    setAnnouncement("Đã làm mới danh sách đặt chỗ gần đây.");
  }

  const selectedRoute = selectedTrip ? routeForTrip(selectedTrip) : ticketRoutes.find((route) => route.id === search.routeId) ?? ticketRoutes[0];
  const estimate = selectedTrip ? selectedTrip.price * selectedSeats.length : 0;
  const unpaidCount = visibleBookings.filter((booking) => booking.status === "Đã giữ chỗ" && booking.paymentStatus === "Chưa thanh toán").length;

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-atomic="true" aria-live="polite">{announcement}</p>

      <section className={styles.hero} aria-labelledby="ticket-search-title">
        <div>
          <span className={styles.kicker}>QUẦY VÉ TRONG CA</span>
          <h2 id="ticket-search-title">Tìm chuyến, chọn ghế, xuất vé</h2>
          <p>Mọi thao tác bán vé được gom trong một quy trình duy nhất.</p>
        </div>
        <div className={styles.heroMetrics} aria-label="Tổng quan vé">
          <div><strong>{ticketTrips.length}</strong><span>chuyến đang mở bán</span></div>
          <div><strong>{ticketRoutes.length}</strong><span>tuyến khai thác</span></div>
          <div><strong>{visibleBookings.filter((booking) => booking.status === "Đã giữ chỗ").length}</strong><span>giao dịch trong ca</span></div>
        </div>
      </section>

      <form className={styles.searchPanel} onSubmit={submitSearch}>
        <label><span>Tuyến hành trình</span><select value={routeDraft} onChange={(event) => setRouteDraft(event.target.value)}>{ticketRoutes.map((route) => <option key={route.id} value={route.id}>{routeLabel(route)}</option>)}</select></label>
        <label><span>Ngày khởi hành</span><input required type="date" value={dateDraft} onChange={(event) => setDateDraft(event.target.value)} /></label>
        <button type="submit">Tra cứu chuyến</button>
      </form>

      <div className={styles.bookingGrid}>
        <section className={styles.tripPanel} aria-labelledby="trip-list-title">
          <div className={styles.panelHeading}>
            <div><span>Kết quả tra cứu</span><h2 id="trip-list-title">{routeLabel(selectedRoute)}</h2></div>
            <strong>{formatTravelDate(search.date)} · {matchingTrips.length} chuyến</strong>
          </div>
          <div className={styles.tripList}>
            {matchingTrips.map((trip) => (
              <button className={selectedTrip?.id === trip.id ? styles.tripActive : styles.trip} aria-pressed={selectedTrip?.id === trip.id} key={trip.id} onClick={() => selectTrip(trip)} type="button">
                <span className={styles.tripTime}><strong>{trip.departure}</strong><small>{trip.arrival}</small></span>
                <span className={styles.tripRoute}><strong>{trip.vehicle}</strong><small>{trip.serviceClass} · {selectedRoute.duration}</small></span>
                <span className={styles.tripAvailability}><strong>{availableSeatCount(trip, visibleBookings)} ghế</strong><small>{formatDemoPrice(trip.price)}</small></span>
              </button>
            ))}
            {matchingTrips.length === 0 ? <div className={styles.empty}><strong>Chưa có chuyến cho lựa chọn này</strong><p>Hãy thử ngày khác hoặc một tuyến khai thác khác.</p></div> : null}
          </div>
        </section>

        <section className={styles.seatPanel} id="dat-cho" aria-labelledby="seat-map-title">
          {selectedTrip ? (
            <>
              <div className={styles.panelHeading}>
                <div><span>{selectedTrip.id}</span><h2 id="seat-map-title">Sơ đồ ghế</h2></div>
                <strong>{selectedTrip.vehicle}</strong>
              </div>
              <div className={styles.legend} aria-label="Chú giải ghế"><span><i data-state="available" />Còn trống</span><span><i data-state="selected" />Đang chọn</span><span><i data-state="reserved" />Đã giữ</span></div>
              <div className={styles.coach}>
                <div className={styles.driver}><span aria-hidden="true">◉</span><small>Đầu xe</small></div>
                <div className={styles.seatMap} role="group" aria-label={`Chọn ghế cho chuyến ${selectedTrip.id}`}>
                  {seatRows.map((row) => (
                    <div className={styles.seatRow} key={row[0]?.row}>
                      {row.map((seat) => {
                        const selected = selectedSeats.includes(seat.code);
                        const reservation = seat.reserved
                          ? bookingForSeat(visibleBookings, selectedTrip.id, seat.code)
                          : null;
                        const tooltipId = `seat-tip-${selectedTrip.id}-${seat.code}`;
                        return (
                          <div className={styles.seatCell} key={seat.code}>
                            <button
                              aria-describedby={reservation ? tooltipId : undefined}
                              aria-haspopup={reservation ? "dialog" : undefined}
                              aria-label={`Ghế ${seat.code}: ${seat.reserved ? `đã giữ${reservation ? ` bởi ${reservation.customerName}` : ""}` : selected ? "đang chọn" : "còn trống"}`}
                              aria-pressed={seat.reserved ? undefined : selected}
                              className={styles.seat}
                              data-state={seat.reserved ? "reserved" : selected ? "selected" : "available"}
                              onClick={() => reservation ? setSelectedBooking(reservation) : toggleSeat(seat.code)}
                              type="button"
                            >
                              {seat.code}
                            </button>
                            {reservation ? (
                              <div className={styles.seatTooltip} id={tooltipId} role="tooltip">
                                <span>Khách đã đặt</span>
                                <strong>{reservation.customerName}</strong>
                                <b>{reservation.customerPhone}</b>
                                <small>{reservation.bookingChannel} · {reservation.paymentStatus}</small>
                                <em>Bấm để xem đầy đủ</em>
                              </div>
                            ) : null}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.tripFacts}><div><span>Điểm đón</span><strong>{selectedTrip.pickupPoint}</strong></div><div><span>Điểm trả</span><strong>{selectedTrip.dropoffPoint}</strong></div></div>
              <div className={styles.customerForm}>
                <div className={styles.customerFormHeading}>
                  <div><span>Thông tin hành khách</span><strong>Liên hệ & thanh toán</strong></div>
                  <small>* Bắt buộc</small>
                </div>
                <div className={styles.customerFields}>
                  <label>
                    <span>Họ và tên *</span>
                    <input
                      autoComplete="name"
                      maxLength={100}
                      placeholder="Nhập tên hành khách"
                      required
                      value={bookingDetails.customerName}
                      onChange={(event) => setBookingDetails((current) => ({ ...current, customerName: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Số điện thoại *</span>
                    <input
                      autoComplete="tel"
                      inputMode="tel"
                      maxLength={32}
                      placeholder="Nhập số để liên hệ"
                      required
                      type="tel"
                      value={bookingDetails.customerPhone}
                      onChange={(event) => setBookingDetails((current) => ({ ...current, customerPhone: event.target.value }))}
                    />
                  </label>
                  <label>
                    <span>Hình thức đặt vé</span>
                    <select value={bookingDetails.bookingChannel} onChange={(event) => setBookingDetails((current) => ({ ...current, bookingChannel: event.target.value as BookingDetails["bookingChannel"] }))}>
                      {BOOKING_CHANNELS.map((channel) => <option key={channel}>{channel}</option>)}
                    </select>
                  </label>
                  <label>
                    <span>Trạng thái thanh toán</span>
                    <select value={bookingDetails.paymentStatus} onChange={(event) => setBookingDetails((current) => ({ ...current, paymentStatus: event.target.value as BookingDetails["paymentStatus"] }))}>
                      {PAYMENT_STATUSES.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className={styles.paymentMethod}>
                    <span>Phương thức thanh toán</span>
                    <select value={bookingDetails.paymentMethod} onChange={(event) => setBookingDetails((current) => ({ ...current, paymentMethod: event.target.value as BookingDetails["paymentMethod"] }))}>
                      {PAYMENT_METHODS.map((method) => <option key={method}>{method}</option>)}
                    </select>
                  </label>
                </div>
              </div>
              <div className={styles.summary}>
                <div><span>Ghế đã chọn</span><strong>{selectedSeats.length ? [...selectedSeats].sort().join(", ") : "Chưa chọn"}</strong></div>
                <div><span>Tạm tính</span><strong>{formatDemoPrice(estimate)}</strong></div>
                <button
                  disabled={selectedSeats.length === 0 || !contactReady || !canCreateBooking}
                  title={!canCreateBooking
                    ? "Vai trò hiện tại không có quyền tạo đặt chỗ."
                    : !contactReady
                      ? "Nhập đầy đủ họ tên và số điện thoại hành khách."
                      : undefined}
                  onClick={confirmBooking}
                  type="button"
                >
                  Xác nhận giữ chỗ
                </button>
                <p>Thông tin liên hệ và thanh toán sẽ xuất hiện ngay trong danh sách khách đã đặt.</p>
              </div>
            </>
          ) : <div className={styles.seatEmpty}><span aria-hidden="true">VX</span><strong>Chọn một chuyến</strong><p>Sơ đồ ghế sẽ xuất hiện sau khi có kết quả phù hợp.</p></div>}
        </section>
      </div>

      <section className={styles.history} aria-labelledby="booking-history-title">
        <div className={styles.historyHeading}>
          <div><span>DANH SÁCH KHÁCH</span><h2 id="booking-history-title">Hành khách đã đặt vé</h2><p>{visibleBookings.length} đặt chỗ · {unpaidCount} chưa thanh toán</p></div>
          <div className={styles.historyControls}>
            <label><span className="sr-only">Tìm hành khách</span><input placeholder="Tìm tên, SĐT, mã vé..." type="search" value={bookingSearch} onChange={(event) => setBookingSearch(event.target.value)} /></label>
            <button type="button" onClick={clearBookingHistory}>Khôi phục mẫu</button>
          </div>
        </div>
        {filteredBookings.length > 0 ? (
          <div className={styles.historyList}>
            {filteredBookings.map((booking) => {
              const phoneLink = contactHref(booking.customerPhone);
              return (
                <article key={booking.id}>
                  <div className={styles.customerIdentity}>
                    <span>{booking.id}</span>
                    <strong>{booking.customerName}</strong>
                    {phoneLink ? <a href={phoneLink}>{booking.customerPhone}</a> : <small>{booking.customerPhone}</small>}
                  </div>
                  <div className={styles.bookingJourney}>
                    <strong>{booking.routeLabel}</strong>
                    <small>{formatTravelDate(booking.date)} · {booking.departure} · Ghế {booking.seats.join(", ")}</small>
                    <span>{booking.bookingChannel} · Tạo lúc {booking.createdAt}</span>
                  </div>
                  <div className={styles.paymentInfo}>
                    <strong>{formatDemoPrice(booking.total)}</strong>
                    <span data-payment={booking.paymentStatus}>{booking.paymentStatus}</span>
                    <small>{booking.paymentMethod}</small>
                  </div>
                  <div className={styles.bookingActions}>
                    {phoneLink ? <a href={phoneLink}>Gọi khách</a> : null}
                    {booking.status === "Đã giữ chỗ" ? <button disabled={!canCancelBooking} title={canCancelBooking ? undefined : "Vai trò hiện tại không có quyền hủy đặt chỗ."} onClick={() => cancelBooking(booking.id)} type="button">Hủy vé</button> : <span data-status={booking.status}>{booking.status}</span>}
                  </div>
                </article>
              );
            })}
          </div>
        ) : <div className={styles.historyEmpty}><strong>Không tìm thấy hành khách</strong><p>Thử tìm bằng tên, số điện thoại hoặc mã đặt chỗ khác.</p></div>}
      </section>

      <dialog
        aria-labelledby="booking-detail-title"
        className={styles.bookingDialog}
        onCancel={() => setSelectedBooking(null)}
        ref={bookingDialogRef}
      >
        {selectedBooking ? (
          <div className={styles.bookingDialogCard}>
            <div className={styles.bookingDialogHeading}>
              <div>
                <span>CHI TIẾT GHẾ ĐÃ ĐẶT</span>
                <h2 id="booking-detail-title">{selectedBooking.customerName}</h2>
                <p>{selectedBooking.id}</p>
              </div>
              <button aria-label="Đóng thông tin đặt vé" onClick={() => setSelectedBooking(null)} type="button">×</button>
            </div>
            <dl className={styles.bookingDetailGrid}>
              <div><dt>Số điện thoại</dt><dd>{selectedBooking.customerPhone}</dd></div>
              <div><dt>Ghế</dt><dd>{selectedBooking.seats.join(", ")}</dd></div>
              <div className={styles.bookingDetailWide}><dt>Hành trình</dt><dd>{selectedBooking.routeLabel}</dd></div>
              <div><dt>Khởi hành</dt><dd>{formatTravelDate(selectedBooking.date)} · {selectedBooking.departure}</dd></div>
              <div><dt>Hình thức đặt</dt><dd>{selectedBooking.bookingChannel}</dd></div>
              <div><dt>Thanh toán</dt><dd>{selectedBooking.paymentStatus}</dd></div>
              <div><dt>Phương thức</dt><dd>{selectedBooking.paymentMethod}</dd></div>
              <div><dt>Tổng tiền</dt><dd>{formatDemoPrice(selectedBooking.total)}</dd></div>
              <div><dt>Thời điểm tạo</dt><dd>{selectedBooking.createdAt}</dd></div>
            </dl>
            <div className={styles.bookingDialogActions}>
              {contactHref(selectedBooking.customerPhone) ? <a href={contactHref(selectedBooking.customerPhone)}>Gọi khách hàng</a> : null}
              <button onClick={() => setSelectedBooking(null)} type="button">Đóng</button>
            </div>
          </div>
        ) : null}
      </dialog>
    </div>
  );
}

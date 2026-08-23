"use client";

import { type FormEvent, useMemo, useState } from "react";
import { useDemoAccess } from "../../_components/access/DemoAccessProvider";
import { useLocalStorageState } from "../../_hooks/useLocalStorageState";
import {
  availableSeatCount,
  BOOKING_STORAGE_KEY,
  createDemoBooking,
  decodeDemoBookings,
  DEFAULT_ROUTE_ID,
  DEFAULT_TRAVEL_DATE,
  EMPTY_BOOKINGS,
  formatDemoPrice,
  formatTravelDate,
  routeForTrip,
  routeLabel,
  seatsFor,
  ticketRoutes,
  ticketTrips,
  tripsFor,
  type TicketTrip,
} from "../_lib/ticket-data";
import styles from "../Tickets.module.css";

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
  const [announcement, setAnnouncement] = useState("");
  const [bookings, setBookings, resetBookings] = useLocalStorageState({
    key: BOOKING_STORAGE_KEY,
    initialValue: EMPTY_BOOKINGS,
    decode: decodeDemoBookings,
  });

  const matchingTrips = useMemo(() => tripsFor(search.routeId, search.date), [search]);
  const selectedTrip = matchingTrips.find((trip) => trip.id === selectedTripId) ?? matchingTrips[0] ?? null;
  const seatRows = useMemo(() => {
    if (!selectedTrip) return [];
    const seats = seatsFor(selectedTrip, bookings);
    return Array.from({ length: Math.ceil(seats.length / 4) }, (_, index) => seats.slice(index * 4, index * 4 + 4));
  }, [bookings, selectedTrip]);

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
    const booking = createDemoBooking(selectedTrip, selectedSeats, Date.now());
    setBookings((current) => [booking, ...current].slice(0, 8));
    setSelectedSeats([]);
    setAnnouncement(`Đã tạo ${booking.id}. Đặt chỗ đang chờ xác nhận thanh toán.`);
  }

  function cancelBooking(id: string) {
    if (!canCancelBooking) {
      setAnnouncement("Vai trò hiện tại không có quyền hủy đặt chỗ.");
      return;
    }
    setBookings((current) => current.map((booking) => booking.id === id ? { ...booking, status: "Đã hủy" } : booking));
    setAnnouncement(`Đã hủy bản ghi đặt chỗ ${id}.`);
  }

  function clearBookingHistory() {
    resetBookings();
    setAnnouncement("Đã làm mới danh sách đặt chỗ gần đây.");
  }

  const selectedRoute = selectedTrip ? routeForTrip(selectedTrip) : ticketRoutes.find((route) => route.id === search.routeId) ?? ticketRoutes[0];
  const estimate = selectedTrip ? selectedTrip.price * selectedSeats.length : 0;

  return (
    <div className={styles.module}>
      <p className="sr-only" aria-atomic="true" aria-live="polite">{announcement}</p>

      <section className={styles.hero} aria-labelledby="ticket-search-title">
        <div>
          <span className={styles.kicker}>Passenger booking</span>
          <h2 id="ticket-search-title">Tìm chuyến phù hợp trong vài bước.</h2>
          <p>Chọn tuyến, giờ khởi hành và ghế trống để tạo đặt chỗ. Thanh toán được đối soát tại quầy.</p>
        </div>
        <div className={styles.heroMetrics} aria-label="Tổng quan vé">
          <div><strong>{ticketTrips.length}</strong><span>chuyến đang mở bán</span></div>
          <div><strong>{ticketRoutes.length}</strong><span>tuyến khai thác</span></div>
          <div><strong>{bookings.filter((booking) => booking.status === "Đã giữ chỗ").length}</strong><span>đặt chỗ hôm nay</span></div>
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
                <span className={styles.tripAvailability}><strong>{availableSeatCount(trip, bookings)} ghế</strong><small>{formatDemoPrice(trip.price)}</small></span>
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
                        return <button aria-label={`Ghế ${seat.code}: ${seat.reserved ? "đã giữ" : selected ? "đang chọn" : "còn trống"}`} aria-pressed={selected} className={styles.seat} data-state={seat.reserved ? "reserved" : selected ? "selected" : "available"} disabled={seat.reserved} key={seat.code} onClick={() => toggleSeat(seat.code)} type="button">{seat.code}</button>;
                      })}
                    </div>
                  ))}
                </div>
              </div>
              <div className={styles.tripFacts}><div><span>Điểm đón</span><strong>{selectedTrip.pickupPoint}</strong></div><div><span>Điểm trả</span><strong>{selectedTrip.dropoffPoint}</strong></div></div>
              <div className={styles.summary}>
                <div><span>Ghế đã chọn</span><strong>{selectedSeats.length ? [...selectedSeats].sort().join(", ") : "Chưa chọn"}</strong></div>
                <div><span>Tạm tính</span><strong>{formatDemoPrice(estimate)}</strong></div>
                <button
                  disabled={selectedSeats.length === 0 || !canCreateBooking}
                  title={!canCreateBooking ? "Vai trò hiện tại không có quyền tạo đặt chỗ." : undefined}
                  onClick={confirmBooking}
                  type="button"
                >
                  Xác nhận giữ chỗ
                </button>
                <p>Đặt chỗ được giữ trong 15 phút và chờ xác nhận thanh toán tại quầy.</p>
              </div>
            </>
          ) : <div className={styles.seatEmpty}><span aria-hidden="true">VX</span><strong>Chọn một chuyến</strong><p>Sơ đồ ghế sẽ xuất hiện sau khi có kết quả phù hợp.</p></div>}
        </section>
      </div>

      <section className={styles.history} aria-labelledby="booking-history-title">
        <div className={styles.historyHeading}><div><span>Booking desk</span><h2 id="booking-history-title">Đặt chỗ gần đây</h2></div>{bookings.length > 0 ? <button type="button" onClick={clearBookingHistory}>Làm mới danh sách</button> : null}</div>
        {bookings.length > 0 ? <div className={styles.historyList}>{bookings.map((booking) => <article key={booking.id}><div><span>{booking.id}</span><strong>{booking.routeLabel}</strong><small>{formatTravelDate(booking.date)} · {booking.departure} · Ghế {booking.seats.join(", ")}</small></div><div><strong>{formatDemoPrice(booking.total)}</strong><span data-status={booking.status}>{booking.status}</span>{booking.status === "Đã giữ chỗ" ? <button disabled={!canCancelBooking} title={canCancelBooking ? undefined : "Vai trò hiện tại không có quyền hủy đặt chỗ."} onClick={() => cancelBooking(booking.id)} type="button">Hủy bản ghi</button> : null}</div></article>)}</div> : <div className={styles.historyEmpty}><strong>Chưa có bản ghi đặt chỗ</strong><p>Đặt chỗ mới sẽ xuất hiện tại đây.</p></div>}
      </section>
    </div>
  );
}

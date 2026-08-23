export type TicketRoute = {
  id: string;
  origin: string;
  destination: string;
  duration: string;
};

export type TicketTrip = {
  id: string;
  routeId: string;
  date: string;
  departure: string;
  arrival: string;
  vehicle: string;
  serviceClass: string;
  pickupPoint: string;
  dropoffPoint: string;
  capacity: number;
  price: number;
  reservedSeats: string[];
};

export type DemoBookingStatus = "Đã giữ chỗ" | "Đã hủy";

export type DemoBooking = {
  id: string;
  tripId: string;
  routeLabel: string;
  date: string;
  departure: string;
  seats: string[];
  total: number;
  status: DemoBookingStatus;
  createdAt: string;
};

export type Seat = {
  code: string;
  row: number;
  position: "A" | "B" | "C" | "D";
  reserved: boolean;
};

export const BOOKING_STORAGE_KEY = "ksops-transport-demo-bookings-v1";
export const EMPTY_BOOKINGS: DemoBooking[] = [];
export const DEFAULT_ROUTE_ID = "RT-SG-VT";
export const DEFAULT_TRAVEL_DATE = "2026-08-23";

export const ticketRoutes: TicketRoute[] = [
  { id: "RT-SG-VT", origin: "Bến xe Miền Đông Mới", destination: "Bến xe Vũng Tàu", duration: "2 giờ 30 phút" },
  { id: "RT-SG-BMT", origin: "Bến xe Miền Đông Mới", destination: "Bến xe phía Nam Buôn Ma Thuột", duration: "6 giờ 15 phút" },
  { id: "RT-VT-SG", origin: "Bến xe Vũng Tàu", destination: "Bến xe Miền Đông Mới", duration: "2 giờ 35 phút" },
  { id: "RT-SG-CT", origin: "Bến xe Miền Đông Mới", destination: "Bến xe Trung tâm Cần Thơ", duration: "3 giờ 45 phút" },
];

export const ticketTrips: TicketTrip[] = [
  { id: "TRP-D2201", routeId: "RT-SG-VT", date: "2026-08-23", departure: "06:30", arrival: "09:00", vehicle: "Xe ghế 28 chỗ", serviceClass: "Tiêu chuẩn", pickupPoint: "Quầy đón số 3 · Bến xe Miền Đông Mới", dropoffPoint: "Bến xe Vũng Tàu", capacity: 28, price: 145000, reservedSeats: ["A01", "B01", "D02", "A04", "C05", "D07"] },
  { id: "TRP-D2202", routeId: "RT-SG-VT", date: "2026-08-23", departure: "09:15", arrival: "11:45", vehicle: "Xe ghế 24 chỗ", serviceClass: "Linh hoạt", pickupPoint: "Quầy đón số 5 · Bến xe Miền Đông Mới", dropoffPoint: "Bến xe Vũng Tàu", capacity: 24, price: 165000, reservedSeats: ["C01", "D01", "A02", "B04", "C04"] },
  { id: "TRP-D2203", routeId: "RT-SG-VT", date: "2026-08-23", departure: "14:00", arrival: "16:30", vehicle: "Xe ghế 28 chỗ", serviceClass: "Tiêu chuẩn", pickupPoint: "Quầy đón số 3 · Bến xe Miền Đông Mới", dropoffPoint: "Văn phòng 192 Nam Kỳ Khởi Nghĩa", capacity: 28, price: 145000, reservedSeats: ["A01", "B01", "A03", "B03", "C03", "D03", "A06"] },
  { id: "TRP-D2301", routeId: "RT-SG-VT", date: "2026-08-24", departure: "07:00", arrival: "09:30", vehicle: "Xe ghế 28 chỗ", serviceClass: "Tiêu chuẩn", pickupPoint: "Quầy đón số 3 · Bến xe Miền Đông Mới", dropoffPoint: "Bến xe Vũng Tàu", capacity: 28, price: 145000, reservedSeats: ["D01", "A02", "B02"] },
  { id: "TRP-C2201", routeId: "RT-SG-BMT", date: "2026-08-23", departure: "07:30", arrival: "13:45", vehicle: "Xe giường 24 chỗ", serviceClass: "Đường dài", pickupPoint: "Quầy đón số 8 · Bến xe Miền Đông Mới", dropoffPoint: "Bến xe phía Nam Buôn Ma Thuột", capacity: 24, price: 320000, reservedSeats: ["A01", "B01", "C01", "D01", "B02", "C04"] },
  { id: "TRP-C2301", routeId: "RT-SG-BMT", date: "2026-08-24", departure: "20:00", arrival: "02:15 +1", vehicle: "Xe giường 24 chỗ", serviceClass: "Đường dài", pickupPoint: "Quầy đón số 8 · Bến xe Miền Đông Mới", dropoffPoint: "Bến xe phía Nam Buôn Ma Thuột", capacity: 24, price: 340000, reservedSeats: ["A02", "D02", "C03"] },
  { id: "TRP-A2201", routeId: "RT-VT-SG", date: "2026-08-23", departure: "10:00", arrival: "12:35", vehicle: "Xe ghế 24 chỗ", serviceClass: "Tiêu chuẩn", pickupPoint: "Quầy đón số 2 · Bến xe Vũng Tàu", dropoffPoint: "Bến xe Miền Đông Mới", capacity: 24, price: 145000, reservedSeats: ["B01", "C01", "D04"] },
  { id: "TRP-DW2201", routeId: "RT-SG-CT", date: "2026-08-23", departure: "08:00", arrival: "11:45", vehicle: "Xe ghế 28 chỗ", serviceClass: "Linh hoạt", pickupPoint: "Quầy đón số 2 · Bến xe Miền Tây", dropoffPoint: "Bến xe Trung tâm Cần Thơ", capacity: 28, price: 210000, reservedSeats: ["A01", "D01", "A02", "D02", "B05"] },
];

export function routeLabel(route: TicketRoute) {
  return `${route.origin} → ${route.destination}`;
}

export function routeForTrip(trip: TicketTrip) {
  return ticketRoutes.find((route) => route.id === trip.routeId) ?? ticketRoutes[0];
}

export function tripsFor(routeId: string, date: string) {
  return ticketTrips.filter((trip) => trip.routeId === routeId && trip.date === date);
}

function locallyHeldSeats(bookings: DemoBooking[], tripId: string) {
  return bookings
    .filter((booking) => booking.tripId === tripId && booking.status === "Đã giữ chỗ")
    .flatMap((booking) => booking.seats);
}

export function seatsFor(trip: TicketTrip, bookings: DemoBooking[] = []): Seat[] {
  const positions = ["A", "B", "C", "D"] as const;
  const reservedSeats = new Set([...trip.reservedSeats, ...locallyHeldSeats(bookings, trip.id)]);
  return Array.from({ length: trip.capacity }, (_, index) => {
    const position = positions[index % positions.length];
    const row = Math.floor(index / positions.length) + 1;
    const code = `${position}${String(row).padStart(2, "0")}`;
    return { code, row, position, reserved: reservedSeats.has(code) };
  });
}

export function availableSeatCount(trip: TicketTrip, bookings: DemoBooking[] = []) {
  return trip.capacity - new Set([...trip.reservedSeats, ...locallyHeldSeats(bookings, trip.id)]).size;
}

export function formatDemoPrice(value: number) {
  return new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);
}

export function formatTravelDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return "Chưa chọn ngày";
  const [year, month, day] = value.split("-");
  return `${day}/${month}/${year}`;
}

function isDemoBooking(value: unknown): value is DemoBooking {
  if (typeof value !== "object" || value === null) return false;
  const booking = value as Record<string, unknown>;
  if (typeof booking.id !== "string" || !booking.id.startsWith("BK-2608-") || typeof booking.tripId !== "string") return false;
  const trip = ticketTrips.find((item) => item.id === booking.tripId);
  if (!trip || !Array.isArray(booking.seats) || booking.seats.length < 1 || booking.seats.length > trip.capacity) return false;
  const validSeatCodes = new Set(seatsFor(trip).map((seat) => seat.code));
  const seatCodes = booking.seats.filter((seat): seat is string => typeof seat === "string");
  if (seatCodes.length !== booking.seats.length || new Set(seatCodes).size !== seatCodes.length || seatCodes.some((seat) => !validSeatCodes.has(seat))) return false;

  return typeof booking.routeLabel === "string"
    && booking.routeLabel === routeLabel(routeForTrip(trip))
    && booking.date === trip.date
    && booking.departure === trip.departure
    && typeof booking.createdAt === "string"
    && booking.createdAt.length <= 80
    && typeof booking.total === "number"
    && Number.isFinite(booking.total)
    && booking.total === trip.price * seatCodes.length
    && (booking.status === "Đã giữ chỗ" || booking.status === "Đã hủy");
}

export function decodeDemoBookings(value: unknown): DemoBooking[] | null {
  return Array.isArray(value) && value.every(isDemoBooking) ? value : null;
}

export function createDemoBooking(trip: TicketTrip, seats: string[], timestamp: number): DemoBooking {
  const route = routeForTrip(trip);
  const uniqueSeats = [...new Set(seats)].sort();
  return {
    id: `BK-2608-${String(timestamp).slice(-6)}`,
    tripId: trip.id,
    routeLabel: routeLabel(route),
    date: trip.date,
    departure: trip.departure,
    seats: uniqueSeats,
    total: trip.price * uniqueSeats.length,
    status: "Đã giữ chỗ",
    createdAt: "Vừa tạo",
  };
}

export const OPERATING_TIME_ZONE = "Asia/Ho_Chi_Minh";

function dateParts(value: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: OPERATING_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(value);
  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

export function operatingDate(value = new Date()) {
  const parts = dateParts(value);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function addOperatingDays(date: string, amount: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + amount);
  return value.toISOString().slice(0, 10);
}

export function operatingClock(value = new Date()) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: OPERATING_TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(value);
  const clock = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${clock.hour}:${clock.minute}`;
}

export function operatingMinutes(value = new Date()) {
  const [hour, minute] = operatingClock(value).split(":").map(Number);
  return hour * 60 + minute;
}

export function clockToMinutes(value: string) {
  const match = /^(\d{2}):(\d{2})/.exec(value);
  return match ? Number(match[1]) * 60 + Number(match[2]) : 0;
}

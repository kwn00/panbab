import { CACHE_REVALIDATE_SECONDS, HISTORY_DAYS } from "./config";

const koreanDate = new Intl.DateTimeFormat("sv-SE", {
  timeZone: "Asia/Seoul",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export class InvalidDateError extends Error {}

export function todayInSeoul(now = new Date()): string {
  return koreanDate.format(now);
}

export function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return (
    Number.isFinite(parsed.getTime()) &&
    parsed.toISOString().slice(0, 10) === value
  );
}

export function shiftDate(date: string, days: number): string {
  if (!isDateKey(date)) throw new InvalidDateError("올바른 날짜가 아닙니다.");
  const value = new Date(`${date}T12:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export function collectionWindow(date: string) {
  if (!isDateKey(date)) throw new InvalidDateError("올바른 날짜가 아닙니다.");
  return {
    start: new Date(`${date}T00:00:00+09:00`),
    end: new Date(`${date}T12:00:00+09:00`),
  };
}

export function isMorningPost(timestamp: number, date: string): boolean {
  const { start, end } = collectionWindow(date);
  return timestamp >= start.getTime() && timestamp < end.getTime();
}

export function isSnapshotStale(collectedAt: string, now = new Date()): boolean {
  return now.getTime() - Date.parse(collectedAt) >= CACHE_REVALIDATE_SECONDS * 1000;
}

export function validateRequestedDate(date: string, now = new Date()): void {
  if (!isDateKey(date)) throw new InvalidDateError("날짜는 YYYY-MM-DD 형식이어야 합니다.");
  const today = todayInSeoul(now);
  if (date > today) throw new InvalidDateError("아직 오지 않은 날짜입니다.");
  if (date < shiftDate(today, -(HISTORY_DAYS - 1))) {
    throw new InvalidDateError(`최근 ${HISTORY_DAYS}일의 메뉴를 볼 수 있습니다.`);
  }
}

export function formatDate(
  date: string,
  options: Intl.DateTimeFormatOptions = { month: "long", day: "numeric", weekday: "short" },
): string {
  return new Intl.DateTimeFormat("ko-KR", {
    ...options,
    timeZone: "Asia/Seoul",
  }).format(new Date(`${date}T12:00:00+09:00`));
}

export function formatTime(value: string): string {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: "Asia/Seoul",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(value));
}

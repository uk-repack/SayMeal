/** Device-local calendar date as YYYY-MM-DD. Do not use UTC ISO slicing. */
export function localDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

const LOCAL_DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isLocalDateString(value: string): boolean {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}

export function shiftLocalDate(value: string, days: number): string {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  date.setDate(date.getDate() + days);
  return localDateString(date);
}

export function clampLocalDateToToday(value: string, today = localDateString()): string {
  if (!isLocalDateString(value) || value > today) return today;
  return value;
}

export function formatLocalDateHeading(value: string): string {
  const match = LOCAL_DATE_RE.exec(value);
  if (!match) return value;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(date);
}

export function formatLoggedAtLabel(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

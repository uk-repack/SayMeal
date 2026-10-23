import {
  clampLocalDateToToday,
  isLocalDateString,
  localDateString,
  mostRecentPastWeekday,
  shiftLocalDate,
} from "@/lib/dates/local-date";

export type LogDateResolution =
  | { status: "use"; date: string }
  | { status: "conflict"; selectedDate: string; explicitDate: string };

const WEEKDAYS: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/[’]/g, "'")
    .replace(/\byesterday's\b/g, "yesterday")
    .replace(/\blast night\b/g, "yesterday")
    .replace(/[^a-z0-9'\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Calendar date mentioned as a time, not a food name like "Monday omelette". */
export function explicitLogDateFromText(
  text: string,
  today: string,
): string | null {
  const normalized = normalize(text);
  if (!normalized) return null;

  if (/\byesterday\b/.test(normalized)) {
    return shiftLocalDate(today, -1);
  }
  if (/\btoday\b/.test(normalized)) {
    return today;
  }

  const iso = normalized.match(/\b(\d{4}-\d{2}-\d{2})\b/);
  if (iso && isLocalDateString(iso[1]) && iso[1] <= today) {
    return iso[1];
  }

  const weekday = normalized.match(
    /\b(?:on|this|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)\b/,
  );
  const possessive = normalized.match(
    /\b(sunday|monday|tuesday|wednesday|thursday|friday|saturday)'s\b/,
  );
  const name = weekday?.[1] ?? possessive?.[1];
  if (!name) return null;
  return mostRecentPastWeekday(today, WEEKDAYS[name]);
}

export function persistableLocalDate(
  value: string,
  today = localDateString(),
): string | null {
  if (!isLocalDateString(value)) return null;
  if (value > today) return today;
  return value;
}

export function resolveMealLogDate(input: {
  selectedDate: string;
  text: string;
  today?: string;
}): LogDateResolution {
  const today = input.today ?? localDateString();
  const selected =
    persistableLocalDate(input.selectedDate, today) ??
    clampLocalDateToToday(today, today);
  const explicit = explicitLogDateFromText(input.text, today);
  if (!explicit) {
    return { status: "use", date: selected };
  }
  const mentioned = persistableLocalDate(explicit, today);
  if (!mentioned) {
    return { status: "use", date: selected };
  }
  if (mentioned === selected) {
    return { status: "use", date: selected };
  }
  return {
    status: "conflict",
    selectedDate: selected,
    explicitDate: mentioned,
  };
}

export function shouldApplyDayFetch(input: {
  cancelled: boolean;
  requestedDate: string;
  selectedDate: string;
}): boolean {
  return !input.cancelled && input.requestedDate === input.selectedDate;
}

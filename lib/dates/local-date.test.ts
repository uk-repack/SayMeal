import { describe, expect, it } from "vitest";
import {
  clampLocalDateToToday,
  formatLocalDateHeading,
  isLocalDateString,
  localDateString,
  mostRecentPastWeekday,
  shiftLocalDate,
  weekdayIndexForLocalDate,
} from "@/lib/dates/local-date";

describe("local calendar dates", () => {
  it("formats from local Y/M/D, not UTC ISO slicing", () => {
    const evening = new Date(2026, 9, 22, 23, 30, 0);
    expect(localDateString(evening)).toBe("2026-10-22");
  });

  it("rejects invalid calendar dates", () => {
    expect(isLocalDateString("2026-10-22")).toBe(true);
    expect(isLocalDateString("2026-13-01")).toBe(false);
    expect(isLocalDateString("2026-02-30")).toBe(false);
    expect(isLocalDateString("not-a-date")).toBe(false);
  });

  it("shifts by whole local days", () => {
    expect(shiftLocalDate("2026-10-22", -1)).toBe("2026-10-21");
    expect(shiftLocalDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftLocalDate("2026-10-22", 1)).toBe("2026-10-23");
  });

  it("clamps future and invalid dates to today", () => {
    expect(clampLocalDateToToday("2026-10-23", "2026-10-22")).toBe("2026-10-22");
    expect(clampLocalDateToToday("nope", "2026-10-22")).toBe("2026-10-22");
    expect(clampLocalDateToToday("2026-10-21", "2026-10-22")).toBe("2026-10-21");
  });

  it("formats a heading without UTC conversion", () => {
    expect(formatLocalDateHeading("2026-10-22")).toBe("Thu, October 22, 2026");
  });

  it("resolves weekdays from local calendar dates, not UTC ISO slicing", () => {
    expect(weekdayIndexForLocalDate("2026-10-23")).toBe(5);
    expect(mostRecentPastWeekday("2026-10-23", 1)).toBe("2026-10-19");
    expect(mostRecentPastWeekday("2026-10-19", 1)).toBe("2026-10-12");
  });
});

import { describe, expect, it } from "vitest";
import {
  explicitLogDateFromText,
  persistableLocalDate,
  resolveMealLogDate,
  shouldApplyDayFetch,
} from "@/lib/meals/log-date";

const TODAY = "2026-10-23";

describe("explicit versus default log dates", () => {
  it("saves to the selected historical date when the text has no date", () => {
    expect(
      resolveMealLogDate({
        selectedDate: "2026-10-21",
        text: "Two scrambled eggs and toast with butter",
        today: TODAY,
      }),
    ).toEqual({ status: "use", date: "2026-10-21" });
  });

  it("uses today when the selected day is today", () => {
    expect(
      resolveMealLogDate({
        selectedDate: TODAY,
        text: "Grilled salmon and rice",
        today: TODAY,
      }),
    ).toEqual({ status: "use", date: TODAY });
  });

  it("flags a conflict when the text names a different reliable date", () => {
    expect(
      resolveMealLogDate({
        selectedDate: "2026-10-21",
        text: "Two eggs yesterday",
        today: TODAY,
      }),
    ).toEqual({
      status: "conflict",
      selectedDate: "2026-10-21",
      explicitDate: "2026-10-22",
    });
  });

  it("does not conflict when the mentioned date is the selected date", () => {
    expect(
      resolveMealLogDate({
        selectedDate: "2026-10-22",
        text: "Oatmeal I ate yesterday",
        today: TODAY,
      }),
    ).toEqual({ status: "use", date: "2026-10-22" });
  });

  it("treats a bare weekday food name as ambiguous and keeps the selected date", () => {
    expect(explicitLogDateFromText("Monday omelette", TODAY)).toBeNull();
    expect(
      resolveMealLogDate({
        selectedDate: "2026-10-21",
        text: "Monday omelette",
        today: TODAY,
      }),
    ).toEqual({ status: "use", date: "2026-10-21" });
  });

  it("reads on-Monday as the most recent past Monday", () => {
    expect(explicitLogDateFromText("chicken bowl on Monday", TODAY)).toBe(
      "2026-10-19",
    );
  });
});

describe("persistable local dates", () => {
  it("keeps a past selected date instead of substituting today", () => {
    expect(persistableLocalDate("2026-10-21", TODAY)).toBe("2026-10-21");
    expect(persistableLocalDate(TODAY, TODAY)).toBe(TODAY);
  });

  it("rejects invalid dates instead of silently using today", () => {
    expect(persistableLocalDate("not-a-date", TODAY)).toBeNull();
    expect(persistableLocalDate("2026-02-30", TODAY)).toBeNull();
  });

  it("clamps future dates to today", () => {
    expect(persistableLocalDate("2026-10-24", TODAY)).toBe(TODAY);
  });
});

describe("stale history requests", () => {
  it("drops cancelled or out-of-order day fetches", () => {
    expect(
      shouldApplyDayFetch({
        cancelled: true,
        requestedDate: "2026-10-21",
        selectedDate: "2026-10-21",
      }),
    ).toBe(false);
    expect(
      shouldApplyDayFetch({
        cancelled: false,
        requestedDate: "2026-10-21",
        selectedDate: "2026-10-22",
      }),
    ).toBe(false);
    expect(
      shouldApplyDayFetch({
        cancelled: false,
        requestedDate: "2026-10-22",
        selectedDate: "2026-10-22",
      }),
    ).toBe(true);
  });
});

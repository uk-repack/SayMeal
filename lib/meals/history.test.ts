import { describe, expect, it } from "vitest";
import { clampLocalDateToToday } from "@/lib/dates/local-date";
import { sumMeals } from "@/lib/nutrition/totals";
import type { Meal } from "@/lib/types";

function meal(partial: Partial<Meal> & Pick<Meal, "id" | "calories">): Meal {
  return {
    title: "Meal",
    loggedAtLabel: "12:00 PM",
    source: "text",
    proteinG: 0,
    carbsG: 0,
    fatG: 0,
    items: [],
    ...partial,
  };
}

describe("history day totals", () => {
  it("sums only the meals for the selected day", () => {
    const selected = [
      meal({ id: "a", calories: 400, proteinG: 20, carbsG: 40, fatG: 10, source: "text" }),
      meal({ id: "b", calories: 250, proteinG: 8, carbsG: 30, fatG: 9, source: "photo" }),
    ];
    expect(sumMeals(selected)).toEqual({
      calories: 650,
      proteinG: 28,
      carbsG: 70,
      fatG: 19,
    });
  });

  it("does not include a later day when the selected date is clamped", () => {
    const today = "2026-10-22";
    const requested = "2026-10-23";
    expect(clampLocalDateToToday(requested, today)).toBe(today);
  });
});

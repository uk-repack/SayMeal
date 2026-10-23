import { describe, expect, it } from "vitest";
import type { MealRow } from "@/lib/meals/fetch";
import {
  candidateFromMealRow,
  copiedMealWriteFields,
  estimatedMealFromSaved,
  matchRepeatMeals,
  parseRepeatMealCommand,
  type RepeatMealCandidate,
} from "@/lib/meals/repeat";

const TODAY = "2026-10-23";

function candidate(
  partial: Partial<RepeatMealCandidate> & Pick<RepeatMealCandidate, "id">,
): RepeatMealCandidate {
  return {
    title: "Meal",
    rawText: null,
    source: "text",
    localDate: "2026-10-22",
    loggedAt: "2026-10-22T08:00:00",
    loggedAtLabel: "8:00 AM",
    calories: 400,
    proteinG: 20,
    carbsG: 30,
    fatG: 10,
    items: [
      {
        name: "Food",
        quantity: 100,
        unit: "g",
        calories: 400,
        proteinG: 20,
        carbsG: 30,
        fatG: 10,
        notes: "",
      },
    ],
    ...partial,
  };
}

describe("parseRepeatMealCommand", () => {
  it("recognizes the supported repeat phrases", () => {
    expect(parseRepeatMealCommand("Log the same breakfast I had yesterday.", TODAY)).toEqual({
      status: "repeat",
      command: { date: "2026-10-22", slot: "breakfast", query: null },
    });
    expect(parseRepeatMealCommand("Repeat my lunch from yesterday.", TODAY)).toEqual({
      status: "repeat",
      command: { date: "2026-10-22", slot: "lunch", query: null },
    });
    expect(parseRepeatMealCommand("Log yesterday's dinner again.", TODAY)).toEqual({
      status: "repeat",
      command: { date: "2026-10-22", slot: "dinner", query: null },
    });
    expect(
      parseRepeatMealCommand("Add the same chicken meal I had on Monday.", TODAY),
    ).toEqual({
      status: "repeat",
      command: { date: "2026-10-19", slot: null, query: "chicken" },
    });
  });

  it("treats a log + slot + past day with no extra food words as a repeat", () => {
    expect(parseRepeatMealCommand("Log yesterday's dinner", TODAY)).toEqual({
      status: "repeat",
      command: { date: "2026-10-22", slot: "dinner", query: null },
    });
  });

  it("does not steal normal meal descriptions or nutrition questions", () => {
    expect(parseRepeatMealCommand("Two scrambled eggs and toast with butter", TODAY).status).toBe(
      "none",
    );
    expect(
      parseRepeatMealCommand("Log pancakes for breakfast yesterday", TODAY).status,
    ).toBe("none");
    expect(
      parseRepeatMealCommand("How many calories did I eat yesterday?", TODAY).status,
    ).toBe("none");
    expect(
      parseRepeatMealCommand("What did I have for lunch yesterday?", TODAY).status,
    ).toBe("none");
    expect(parseRepeatMealCommand("I had chicken for lunch yesterday", TODAY).status).toBe(
      "none",
    );
  });

  it("asks for a day when the repeat intent is clear but the date is missing", () => {
    const parsed = parseRepeatMealCommand("Repeat my breakfast", TODAY);
    expect(parsed.status).toBe("unsupported");
    if (parsed.status === "unsupported") {
      expect(parsed.message).toMatch(/yesterday or Monday/i);
    }
  });
});

describe("matchRepeatMeals", () => {
  const omelette = candidate({
    id: "omelette",
    title: "Herb omelette",
    loggedAt: "2026-10-22T08:15:00",
    items: [
      {
        name: "Eggs",
        quantity: 120,
        unit: "g",
        calories: 210,
        proteinG: 13,
        carbsG: 2,
        fatG: 17,
        notes: "",
      },
    ],
  });
  const chickenLunch = candidate({
    id: "chicken-lunch",
    title: "Chicken bowl",
    loggedAt: "2026-10-22T12:40:00",
    items: [
      {
        name: "Chicken",
        quantity: 180,
        unit: "g",
        calories: 320,
        proteinG: 40,
        carbsG: 12,
        fatG: 8,
        notes: "",
      },
    ],
  });
  const chickenDinner = candidate({
    id: "chicken-dinner",
    title: "Roast chicken",
    loggedAt: "2026-10-22T19:10:00",
    items: [
      {
        name: "Roast chicken",
        quantity: 200,
        unit: "g",
        calories: 410,
        proteinG: 42,
        carbsG: 4,
        fatG: 22,
        notes: "",
      },
    ],
  });

  it("uses logged time or saved text for breakfast, not food stereotypes", () => {
    const breakfast = matchRepeatMeals(
      { date: "2026-10-22", slot: "breakfast", query: null },
      [omelette, chickenDinner],
    );
    expect(breakfast.map((meal) => meal.id)).toEqual(["omelette"]);

    const lateEggs = candidate({
      id: "late-eggs",
      title: "Omelette",
      loggedAt: "2026-10-22T19:30:00",
      items: omelette.items,
    });
    expect(
      matchRepeatMeals({ date: "2026-10-22", slot: "breakfast", query: null }, [lateEggs]),
    ).toEqual([]);

    const named = candidate({
      id: "named-breakfast",
      title: "Breakfast burrito",
      loggedAt: "2026-10-22T19:30:00",
    });
    expect(
      matchRepeatMeals({ date: "2026-10-22", slot: "breakfast", query: null }, [named]).map(
        (meal) => meal.id,
      ),
    ).toEqual(["named-breakfast"]);
  });

  it("matches a food query and returns every plausible meal when several fit", () => {
    const chicken = matchRepeatMeals(
      { date: "2026-10-22", slot: null, query: "chicken" },
      [omelette, chickenLunch, chickenDinner],
    );
    expect(chicken.map((meal) => meal.id)).toEqual(["chicken-dinner", "chicken-lunch"]);
  });

  it("returns every meal from that local date when the command has no slot or query", () => {
    const all = matchRepeatMeals(
      { date: "2026-10-22", slot: null, query: null },
      [omelette, chickenDinner],
    );
    expect(all).toHaveLength(2);
  });

  it("does not match a meal from another local date", () => {
    const monday = candidate({
      id: "monday",
      localDate: "2026-10-19",
      title: "Chicken",
    });
    expect(
      matchRepeatMeals({ date: "2026-10-22", slot: null, query: "chicken" }, [monday]),
    ).toEqual([]);
  });
});

describe("copying a saved meal", () => {
  const originalRow: MealRow = {
    id: "keep-me",
    user_id: "owner-1",
    title: "Chicken bowl",
    logged_at: "2026-10-19T12:00:00.000Z",
    local_date: "2026-10-19",
    source: "photo",
    raw_text: "chicken rice bowl",
    items: [
      {
        name: "Chicken",
        quantity: 180,
        unit: "g",
        calories: 320,
        protein_g: 40,
        carbs_g: 12,
        fat_g: 8,
        notes: "Grilled.",
      },
    ],
    calories: 9999,
    protein_g: 1,
    carbs_g: 1,
    fat_g: 1,
    status: "confirmed",
  };

  it("copies saved items and source into a new write payload without identity fields", () => {
    const snapshot = structuredClone(originalRow);
    const saved = candidateFromMealRow(originalRow);
    const estimated = estimatedMealFromSaved(saved);
    expect(estimated.error).toBeNull();
    expect(estimated.meal?.totals.calories).toBe(320);
    expect(estimated.meal?.assumptions).toMatch(/copied from/i);

    const write = copiedMealWriteFields(saved);
    expect(write).not.toBeNull();
    expect(write).not.toHaveProperty("id");
    expect(write).not.toHaveProperty("user_id");
    expect(write).not.toHaveProperty("logged_at");
    expect(write).not.toHaveProperty("local_date");
    expect(write).not.toHaveProperty("created_at");
    expect(write?.source).toBe("photo");
    expect(write?.status).toBe("confirmed");
    expect(write?.title).toBe("Chicken bowl");
    expect(write?.items[0]?.name).toBe("Chicken");
    expect(originalRow).toEqual(snapshot);
  });
});

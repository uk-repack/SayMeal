import { describe, expect, it } from "vitest";
import type { Meal } from "@/lib/types";
import {
  estimatedMealFromLogged,
  mealWriteFromEstimate,
  validateEditedEstimate,
} from "@/lib/meals/persist";

const saved: Meal = {
  id: "keep-this-id",
  title: "One banana",
  loggedAtLabel: "9:31 PM",
  source: "text",
  calories: 999,
  proteinG: 0,
  carbsG: 0,
  fatG: 0,
  items: [
    {
      name: "Banana",
      quantity: 118,
      unit: "g",
      calories: 105,
      proteinG: 1,
      carbsG: 27,
      fatG: 0,
      notes: "Medium.",
    },
  ],
};

describe("editing a saved meal", () => {
  it("prefills the editor from saved items and recalculates totals locally", () => {
    const parsed = estimatedMealFromLogged(saved);
    expect(parsed.error).toBeNull();
    expect(parsed.meal?.title).toBe("One banana");
    expect(parsed.meal?.totals).toEqual({
      calories: 105,
      proteinG: 1,
      carbsG: 27,
      fatG: 0,
    });
    expect(parsed.meal?.items[0]?.notes).toBe("Medium.");
  });

  it("builds an update payload without identity fields", () => {
    const parsed = estimatedMealFromLogged(saved);
    expect(parsed.meal).not.toBeNull();
    const write = mealWriteFromEstimate(parsed.meal!, "");
    expect(write).not.toHaveProperty("id");
    expect(write).not.toHaveProperty("user_id");
    expect(write).not.toHaveProperty("local_date");
    expect(write.title).toBe("One banana");
    expect(write.calories).toBe(105);
  });

  it("rejects an empty item list instead of saving a blank meal", () => {
    const parsed = estimatedMealFromLogged({ ...saved, items: [] });
    expect(parsed.meal).toBeNull();
    expect(parsed.error).toMatch(/no foods/i);
    expect(validateEditedEstimate({
      title: "Empty",
      assumptions: "",
      items: [],
      totals: { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
    }).meal).toBeNull();
  });
});

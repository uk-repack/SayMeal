import { describe, expect, it } from "vitest";
import {
  parseModelEstimate,
  parseModelJsonText,
  sumEstimatedItems,
  validateMealText,
} from "@/lib/meals/estimate";

const validPayload = {
  title: "Roti, dal, paneer bhurji",
  assumptions: "Assumed homemade roti and 1 tsp oil in bhurji.",
  totals: { calories: 99999, protein_g: 999, carbs_g: 999, fat_g: 999 },
  items: [
    {
      name: "Roti",
      portion_g: 80,
      calories: 240,
      protein_g: 8,
      carbs_g: 44,
      fat_g: 4,
      notes: "Two medium wheat rotis.",
    },
    {
      name: "Dal",
      portion_g: 200,
      calories: 180,
      protein_g: 12,
      carbs_g: 24,
      fat_g: 4,
      notes: "One bowl cooked dal.",
    },
    {
      name: "Paneer bhurji",
      portion_g: 150,
      calories: 320,
      protein_g: 22,
      carbs_g: 6,
      fat_g: 22,
      notes: "150 g as stated.",
    },
  ],
};

describe("validateMealText", () => {
  it("rejects empty and oversized descriptions", () => {
    expect(validateMealText("  hi ").error).toMatch(/more detail/i);
    expect(validateMealText("x".repeat(801)).error).toMatch(/800/);
    expect(validateMealText("Two rotis and dal").text).toBe("Two rotis and dal");
  });
});

describe("parseModelEstimate", () => {
  it("uses server-side item totals and ignores model totals", () => {
    const parsed = parseModelEstimate(validPayload, "fallback");
    expect(parsed.error).toBeNull();
    expect(parsed.meal?.totals).toEqual(
      sumEstimatedItems(parsed.meal?.items ?? []),
    );
    expect(parsed.meal?.totals.calories).toBe(740);
    expect(parsed.meal?.totals.proteinG).toBe(42);
    expect(parsed.meal?.totals.carbsG).toBe(74);
    expect(parsed.meal?.totals.fatG).toBe(30);
  });

  it("rejects malformed or implausible model output", () => {
    expect(parseModelEstimate(null, "meal").error).toMatch(/valid json/i);
    expect(parseModelEstimate({ items: [] }, "meal").error).toMatch(/no foods/i);
    expect(
      parseModelEstimate(
        {
          ...validPayload,
          items: [{ name: "Oil", portion_g: 10, calories: -4, protein_g: 0, carbs_g: 0, fat_g: 0, notes: "" }],
        },
        "meal",
      ).error,
    ).toMatch(/implausible/i);
    expect(
      parseModelEstimate(
        {
          ...validPayload,
          items: Array.from({ length: 17 }, (_, i) => ({
            ...validPayload.items[0],
            name: `Food ${i}`,
          })),
        },
        "meal",
      ).error,
    ).toMatch(/too many/i);
  });

  it("parses fenced JSON text", () => {
    const parsed = parseModelJsonText("```json\n{\"ok\":true}\n```");
    expect(parsed).toEqual({ ok: true });
  });
});

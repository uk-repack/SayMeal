import { describe, expect, it } from "vitest";
import { NO_FOOD_PHOTO_ERROR } from "@/lib/meals/image";
import { parsePhotoEstimate, sumEstimatedItems } from "@/lib/meals/estimate";
import { validateImageBytes, validateImageFile } from "@/lib/meals/image";
import { mealWriteFromEstimate } from "@/lib/meals/persist";

const PNG_1X1 = Uint8Array.from(
  Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64",
  ),
);

const photoItem = {
  name: "Idli",
  portion_g: 80,
  calories: 120,
  protein_g: 4,
  carbs_g: 24,
  fat_g: 1,
  notes: "Two pieces, size guessed from the plate.",
};

describe("validateImageBytes", () => {
  it("accepts a real PNG and rejects unsupported bytes", () => {
    expect(validateImageBytes(PNG_1X1, "image/png")).toEqual({
      mime: "image/png",
      error: null,
    });
    expect(
      validateImageBytes(Uint8Array.from({ length: 32 }, (_, i) => i), "image/png")
        .error,
    ).toMatch(/jpeg, png, or webp/i);
  });
});

describe("validateImageFile", () => {
  it("rejects missing, oversized, and unsupported files", () => {
    expect(validateImageFile(null).error).toMatch(/choose/i);
    const huge = new File([new Uint8Array(8 * 1024 * 1024 + 1)], "meal.jpg", {
      type: "image/jpeg",
    });
    expect(validateImageFile(huge).error).toMatch(/8 mb/i);
    const gif = new File([PNG_1X1], "meal.gif", { type: "image/gif" });
    expect(validateImageFile(gif).error).toMatch(/jpeg, png, or webp/i);
  });
});

describe("parsePhotoEstimate", () => {
  it("rejects empty food detection instead of fabricating a meal", () => {
    expect(
      parsePhotoEstimate({ foods_found: false, title: "", assumptions: "", items: [] })
        .error,
    ).toBe(NO_FOOD_PHOTO_ERROR);
    expect(
      parsePhotoEstimate({ foods_found: true, title: "Meal", assumptions: "", items: [] })
        .error,
    ).toBe(NO_FOOD_PHOTO_ERROR);
  });

  it("sums item nutrition and ignores model totals", () => {
    const parsed = parsePhotoEstimate({
      foods_found: true,
      title: "South Indian plate",
      assumptions: "Sambar quantity is a guess.",
      totals: { calories: 9000 },
      items: [photoItem, { ...photoItem, name: "Sambar", portion_g: 150, calories: 90, protein_g: 4, carbs_g: 14, fat_g: 2 }],
    });
    expect(parsed.error).toBeNull();
    expect(parsed.meal?.totals).toEqual(sumEstimatedItems(parsed.meal?.items ?? []));
    expect(parsed.meal?.totals.calories).toBe(210);
    expect(
      mealWriteFromEstimate(parsed.meal!, "", "photo").source,
    ).toBe("photo");
  });
});

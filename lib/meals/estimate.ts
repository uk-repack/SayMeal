import { NO_FOOD_PHOTO_ERROR } from "@/lib/meals/image";
import type { NutritionTotals } from "@/lib/types";

export const MEAL_TEXT_MIN = 3;
export const MEAL_TEXT_MAX = 800;
export const MAX_ITEMS = 16;
export const MAX_PORTION_G = 2500;
export const MAX_ITEM_KCAL = 4000;
export const MAX_MEAL_KCAL = 10000;
export const MAX_MACRO_G = 500;

export type EstimatedMealItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  notes: string;
};

export type EstimatedMeal = {
  title: string;
  assumptions: string;
  items: EstimatedMealItem[];
  totals: NutritionTotals;
};

export const MEAL_ESTIMATE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["title", "assumptions", "items"],
  properties: {
    title: {
      type: "string",
      description: "Short meal name, 3 to 60 characters.",
    },
    assumptions: {
      type: "string",
      description:
        "Brief uncertainty notes: cooking fat, brand, default portions.",
    },
    items: {
      type: "array",
      minItems: 1,
      maxItems: MAX_ITEMS,
      items: {
        type: "object",
        additionalProperties: false,
        required: [
          "name",
          "portion_g",
          "calories",
          "protein_g",
          "carbs_g",
          "fat_g",
          "notes",
        ],
        properties: {
          name: { type: "string" },
          portion_g: { type: "number" },
          calories: { type: "number" },
          protein_g: { type: "number" },
          carbs_g: { type: "number" },
          fat_g: { type: "number" },
          notes: { type: "string" },
        },
      },
    },
  },
} as const;

export const PHOTO_MEAL_ESTIMATE_JSON_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["foods_found", "title", "assumptions", "items"],
  properties: {
    foods_found: {
      type: "boolean",
      description:
        "True only if edible food is clearly visible. False for menus, people, empty plates, or unreadable photos.",
    },
    title: {
      type: "string",
      description: "Short meal name from what is visible.",
    },
    assumptions: {
      type: "string",
      description:
        "Honest uncertainty: hidden oil, cooking method, default bowl size, mixed dishes.",
    },
    items: {
      type: "array",
      minItems: 0,
      maxItems: MAX_ITEMS,
      items: MEAL_ESTIMATE_JSON_SCHEMA.properties.items.items,
    },
  },
} as const;

export function parsePhotoEstimate(
  payload: unknown,
  fallbackTitle = "Photo meal",
): { meal: EstimatedMeal | null; error: string | null } {
  if (!payload || typeof payload !== "object") {
    return { meal: null, error: "The estimate was not valid JSON." };
  }
  const row = payload as Record<string, unknown>;
  const items = Array.isArray(row.items) ? row.items : null;
  if (row.foods_found === false || items?.length === 0) {
    return { meal: null, error: NO_FOOD_PHOTO_ERROR };
  }
  const parsed = parseModelEstimate(payload, fallbackTitle);
  if (!parsed.meal) {
    if (parsed.error?.toLowerCase().includes("no foods")) {
      return { meal: null, error: NO_FOOD_PHOTO_ERROR };
    }
    return parsed;
  }
  if (!parsed.meal.assumptions) {
    parsed.meal.assumptions =
      "Visual estimate only. Portion size, hidden oil, and exact ingredients cannot be measured from a photo.";
  }
  return parsed;
}

export function validateMealText(raw: unknown): {
  text: string | null;
  error: string | null;
} {
  if (typeof raw !== "string") {
    return { text: null, error: "Describe what you ate in plain language." };
  }
  const text = raw.trim().replace(/\s+/g, " ");
  if (text.length < MEAL_TEXT_MIN) {
    return { text: null, error: "Add a bit more detail about the meal." };
  }
  if (text.length > MEAL_TEXT_MAX) {
    return {
      text: null,
      error: `Keep the description under ${MEAL_TEXT_MAX} characters.`,
    };
  }
  return { text, error: null };
}

function asFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const n = Number(value);
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function inRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

function roundNutrition(value: number): number {
  return Math.round(value);
}

export function sumEstimatedItems(items: EstimatedMealItem[]): NutritionTotals {
  return items.reduce<NutritionTotals>(
    (acc, item) => ({
      calories: acc.calories + item.calories,
      proteinG: acc.proteinG + item.proteinG,
      carbsG: acc.carbsG + item.carbsG,
      fatG: acc.fatG + item.fatG,
    }),
    { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}

function parseItem(
  raw: unknown,
  index: number,
): { item: EstimatedMealItem | null; error: string | null } {
  if (!raw || typeof raw !== "object") {
    return { item: null, error: `Item ${index + 1} is not an object.` };
  }
  const row = raw as Record<string, unknown>;
  const name = typeof row.name === "string" ? row.name.trim() : "";
  if (name.length < 1 || name.length > 80) {
    return { item: null, error: `Item ${index + 1} needs a food name.` };
  }

  const quantity = asFiniteNumber(row.portion_g ?? row.quantity);
  const calories = asFiniteNumber(row.calories);
  const proteinG = asFiniteNumber(row.protein_g ?? row.proteinG);
  const carbsG = asFiniteNumber(row.carbs_g ?? row.carbsG);
  const fatG = asFiniteNumber(row.fat_g ?? row.fatG);

  if (
    quantity == null ||
    calories == null ||
    proteinG == null ||
    carbsG == null ||
    fatG == null
  ) {
    return {
      item: null,
      error: `Item ${index + 1} is missing a numeric portion or nutrition value.`,
    };
  }

  if (!inRange(quantity, 1, MAX_PORTION_G)) {
    return {
      item: null,
      error: `Item ${index + 1} portion looks implausible.`,
    };
  }
  if (!inRange(calories, 0, MAX_ITEM_KCAL)) {
    return {
      item: null,
      error: `Item ${index + 1} calories look implausible.`,
    };
  }
  if (
    !inRange(proteinG, 0, MAX_MACRO_G) ||
    !inRange(carbsG, 0, MAX_MACRO_G) ||
    !inRange(fatG, 0, MAX_MACRO_G)
  ) {
    return {
      item: null,
      error: `Item ${index + 1} macros look implausible.`,
    };
  }

  const unit =
    typeof row.unit === "string" && row.unit.trim() ? row.unit.trim() : "g";
  const notes = typeof row.notes === "string" ? row.notes.trim() : "";

  return {
    item: {
      name,
      quantity: Math.round(quantity),
      unit: unit.slice(0, 16),
      calories: roundNutrition(calories),
      proteinG: roundNutrition(proteinG),
      carbsG: roundNutrition(carbsG),
      fatG: roundNutrition(fatG),
      notes: notes.slice(0, 240),
    },
    error: null,
  };
}

export function parseModelEstimate(
  payload: unknown,
  fallbackTitle: string,
): { meal: EstimatedMeal | null; error: string | null } {
  if (!payload || typeof payload !== "object") {
    return { meal: null, error: "The estimate was not valid JSON." };
  }

  const row = payload as Record<string, unknown>;
  if (!Array.isArray(row.items)) {
    return { meal: null, error: "The estimate did not include a food list." };
  }
  if (row.items.length < 1) {
    return { meal: null, error: "No foods were identified in that description." };
  }
  if (row.items.length > MAX_ITEMS) {
    return { meal: null, error: "Too many foods came back. Try a shorter meal." };
  }

  const items: EstimatedMealItem[] = [];
  for (let i = 0; i < row.items.length; i += 1) {
    const parsed = parseItem(row.items[i], i);
    if (!parsed.item) return { meal: null, error: parsed.error };
    items.push(parsed.item);
  }

  const totals = sumEstimatedItems(items);
  if (!inRange(totals.calories, 1, MAX_MEAL_KCAL)) {
    return { meal: null, error: "The estimated calories look implausible." };
  }

  const titleRaw = typeof row.title === "string" ? row.title.trim() : "";
  const title = (titleRaw || fallbackTitle).slice(0, 80);
  const assumptions =
    typeof row.assumptions === "string" ? row.assumptions.trim().slice(0, 400) : "";

  return {
    meal: {
      title: title || "Meal",
      assumptions,
      items,
      totals: {
        calories: roundNutrition(totals.calories),
        proteinG: roundNutrition(totals.proteinG),
        carbsG: roundNutrition(totals.carbsG),
        fatG: roundNutrition(totals.fatG),
      },
    },
    error: null,
  };
}

export function parseModelJsonText(text: string): unknown {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const body = fenced ? fenced[1] : trimmed;
  return JSON.parse(body);
}

export function withRecalculatedTotals(meal: EstimatedMeal): EstimatedMeal {
  const totals = sumEstimatedItems(meal.items);
  return {
    ...meal,
    totals: {
      calories: roundNutrition(totals.calories),
      proteinG: roundNutrition(totals.proteinG),
      carbsG: roundNutrition(totals.carbsG),
      fatG: roundNutrition(totals.fatG),
    },
  };
}

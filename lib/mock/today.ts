import type { Meal, NutritionTargets } from "@/lib/types";

/**
 * Fixture data for Phase 1 UI only. Replace with Supabase reads in Phase 4.
 * Logged meals stay empty so the empty state is visible beside sample cards.
 */
export const SAMPLE_TARGETS: NutritionTargets = {
  calorieTarget: 2345,
  proteinG: 128,
  carbsG: 312,
  fatG: 65,
};

export const LOGGED_MEALS: Meal[] = [];

export const SAMPLE_MEALS: Meal[] = [
  {
    id: "sample-breakfast",
    title: "Greek yogurt bowl",
    loggedAtLabel: "8:10 AM",
    source: "text",
    calories: 420,
    proteinG: 28,
    carbsG: 48,
    fatG: 12,
    items: [
      {
        name: "Greek yogurt",
        quantity: 170,
        unit: "g",
        calories: 180,
        proteinG: 20,
        carbsG: 8,
        fatG: 5,
      },
      {
        name: "Mixed berries",
        quantity: 1,
        unit: "cup",
        calories: 80,
        proteinG: 1,
        carbsG: 20,
        fatG: 0,
      },
      {
        name: "Granola",
        quantity: 30,
        unit: "g",
        calories: 160,
        proteinG: 7,
        carbsG: 20,
        fatG: 7,
      },
    ],
  },
  {
    id: "sample-lunch",
    title: "Chicken rice bowl",
    loggedAtLabel: "12:40 PM",
    source: "photo",
    calories: 680,
    proteinG: 42,
    carbsG: 72,
    fatG: 18,
    items: [
      {
        name: "Grilled chicken",
        quantity: 150,
        unit: "g",
        calories: 250,
        proteinG: 36,
        carbsG: 0,
        fatG: 6,
      },
      {
        name: "White rice",
        quantity: 200,
        unit: "g",
        calories: 260,
        proteinG: 5,
        carbsG: 56,
        fatG: 1,
      },
      {
        name: "Vegetables and sauce",
        quantity: 1,
        unit: "serving",
        calories: 170,
        proteinG: 1,
        carbsG: 16,
        fatG: 11,
      },
    ],
  },
  {
    id: "sample-snack",
    title: "Apple and almonds",
    loggedAtLabel: "4:05 PM",
    source: "text",
    calories: 210,
    proteinG: 6,
    carbsG: 22,
    fatG: 12,
    items: [
      {
        name: "Apple",
        quantity: 1,
        unit: "medium",
        calories: 95,
        proteinG: 0,
        carbsG: 25,
        fatG: 0,
      },
      {
        name: "Almonds",
        quantity: 20,
        unit: "g",
        calories: 115,
        proteinG: 6,
        carbsG: 4,
        fatG: 10,
      },
    ],
  },
];

import type { Meal, NutritionTotals } from "@/lib/types";

export function emptyTotals(): NutritionTotals {
  return { calories: 0, proteinG: 0, carbsG: 0, fatG: 0 };
}

export function sumMeals(meals: Meal[]): NutritionTotals {
  return meals.reduce<NutritionTotals>(
    (acc, meal) => ({
      calories: acc.calories + meal.calories,
      proteinG: acc.proteinG + meal.proteinG,
      carbsG: acc.carbsG + meal.carbsG,
      fatG: acc.fatG + meal.fatG,
    }),
    emptyTotals(),
  );
}

export function remainingCalories(consumed: number, target: number): number {
  return target - consumed;
}

export function progressPercent(consumed: number, target: number): number {
  const eaten = Number(consumed);
  const goal = Number(target);
  if (!Number.isFinite(eaten) || !Number.isFinite(goal) || goal <= 0) return 0;
  return Math.min(100, Math.round((Math.max(0, eaten) / goal) * 100));
}

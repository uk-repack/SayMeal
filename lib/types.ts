export type MealSource = "text" | "photo" | "both";

export type MealItem = {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type Meal = {
  id: string;
  title: string;
  loggedAtLabel: string;
  source: MealSource;
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
  items: MealItem[];
};

export type NutritionTargets = {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NutritionTotals = {
  calories: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

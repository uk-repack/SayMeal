export const CALORIE_MIN = 1200;
export const CALORIE_MAX = 4000;

export const ACTIVITY_MULTIPLIERS = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
} as const;

export type ActivityLevel = keyof typeof ACTIVITY_MULTIPLIERS;

export type Goal = "lose" | "maintain" | "gain";

export type Sex = "female" | "male";

export type NutritionInput = {
  age: number;
  heightCm: number;
  weightKg: number;
  activityLevel: ActivityLevel;
  goal: Goal;
  sex: Sex | null;
};

export type MacroTargets = {
  calorieTarget: number;
  proteinG: number;
  carbsG: number;
  fatG: number;
};

export type NutritionEstimate = MacroTargets & {
  bmr: number;
  tdee: number;
  sexSkipped: boolean;
  calorieRange: { min: number; max: number } | null;
  notes: string[];
};

export const GOAL_CALORIE_FACTOR: Record<Goal, number> = {
  lose: 0.85,
  maintain: 1,
  gain: 1.1,
};

export const PROTEIN_G_PER_KG: Record<Goal, number> = {
  lose: 1.6,
  maintain: 1.2,
  gain: 1.6,
};

export const FAT_CALORIE_FRACTION = 0.25;

export const ACTIVITY_DETAILS: Record<
  ActivityLevel,
  { label: string; description: string }
> = {
  sedentary: {
    label: "Sedentary",
    description: "Desk work, little or no structured exercise.",
  },
  light: {
    label: "Lightly active",
    description: "Easy exercise or walking 1–3 days a week.",
  },
  moderate: {
    label: "Moderately active",
    description: "Exercise 3–5 days a week, or an on-your-feet job.",
  },
  active: {
    label: "Active",
    description: "Hard exercise 6–7 days a week.",
  },
  very_active: {
    label: "Very active",
    description: "Physical job, or training twice a day.",
  },
};

/**
 * Mifflin–St Jeor resting energy (kcal/day).
 * Male: 10w + 6.25h − 5a + 5
 * Female: 10w + 6.25h − 5a − 161
 */
export function mifflinStJeorBmr(
  weightKg: number,
  heightCm: number,
  ageYears: number,
  sex: Sex,
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * ageYears;
  return sex === "male" ? base + 5 : base - 161;
}

export function clampCalories(value: number): number {
  if (!Number.isFinite(value)) return CALORIE_MIN;
  return Math.min(CALORIE_MAX, Math.max(CALORIE_MIN, Math.round(value)));
}

function applyGoal(tdee: number, goal: Goal): number {
  return tdee * GOAL_CALORIE_FACTOR[goal];
}

export function macrosFromCalories(
  calorieTarget: number,
  weightKg: number,
  goal: Goal,
): MacroTargets {
  const calories = clampCalories(calorieTarget);
  let proteinG = Math.max(0, Math.round(weightKg * PROTEIN_G_PER_KG[goal]));
  let fatG = Math.max(0, Math.round((calories * FAT_CALORIE_FRACTION) / 9));

  let remaining = calories - proteinG * 4 - fatG * 9;
  while (remaining < 0 && fatG > 0) {
    fatG -= 1;
    remaining = calories - proteinG * 4 - fatG * 9;
  }
  while (remaining < 0 && proteinG > 0) {
    proteinG -= 1;
    remaining = calories - proteinG * 4 - fatG * 9;
  }

  const carbsG = Math.max(0, Math.round(remaining / 4));
  return { calorieTarget: calories, proteinG, carbsG, fatG };
}

export function calculateTargets(input: NutritionInput): NutritionEstimate {
  const { age, heightCm, weightKg, activityLevel, goal, sex } = input;
  if (![age, heightCm, weightKg].every((value) => Number.isFinite(value))) {
    throw new Error("Age, height, and weight must be finite numbers.");
  }
  if (age <= 0 || heightCm <= 0 || weightKg <= 0) {
    throw new Error("Age, height, and weight must be greater than zero.");
  }
  if (!(activityLevel in ACTIVITY_MULTIPLIERS)) {
    throw new Error("Unknown activity level.");
  }
  if (!GOAL_CALORIE_FACTOR[goal]) {
    throw new Error("Unknown goal.");
  }
  const multiplier = ACTIVITY_MULTIPLIERS[activityLevel];
  const notes: string[] = [
    "These numbers are general estimates, not medical advice.",
  ];

  if (sex) {
    const bmr = mifflinStJeorBmr(weightKg, heightCm, age, sex);
    const tdee = bmr * multiplier;
    const macros = macrosFromCalories(applyGoal(tdee, goal), weightKg, goal);
    return {
      ...macros,
      bmr: Math.round(bmr),
      tdee: Math.round(tdee),
      sexSkipped: false,
      calorieRange: null,
      notes,
    };
  }

  const bmrFemale = mifflinStJeorBmr(weightKg, heightCm, age, "female");
  const bmrMale = mifflinStJeorBmr(weightKg, heightCm, age, "male");
  const bmrMid = (bmrFemale + bmrMale) / 2;
  const tdeeMid = bmrMid * multiplier;
  const caloriesFemale = clampCalories(applyGoal(bmrFemale * multiplier, goal));
  const caloriesMale = clampCalories(applyGoal(bmrMale * multiplier, goal));
  const macros = macrosFromCalories(applyGoal(tdeeMid, goal), weightKg, goal);
  const min = Math.min(caloriesFemale, caloriesMale);
  const max = Math.max(caloriesFemale, caloriesMale);

  notes.unshift(
    `Sex was skipped, so calories use the midpoint of typical female and male Mifflin–St Jeor results (about ${min}–${max} kcal after your goal). This is not silently treating you as female or male. Adjust the estimate if it feels off.`,
  );

  return {
    ...macros,
    bmr: Math.round(bmrMid),
    tdee: Math.round(tdeeMid),
    sexSkipped: true,
    calorieRange: { min, max },
    notes,
  };
}
